const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const readline = require("node:readline");

const { SerialPort } = require("serialport");
const { WebSocketServer } = require("ws");

const WS_PORT = Number(process.env.WS_PORT || 8080);
const SERIAL_BAUD = Number(process.env.SERIAL_BAUD || 115200);
const HOT_BUFFER_MAX = Number(process.env.HOT_BUFFER_MAX || 3000);
const HOT_BOOTSTRAP_LIMIT = Number(process.env.HOT_BOOTSTRAP_LIMIT || 250);
const CLIENT_BACKPRESSURE_BYTES = Number(
  process.env.CLIENT_BACKPRESSURE_BYTES || 1_000_000,
);
const MAX_RECORDING_BYTES = Number(process.env.MAX_RECORDING_BYTES || 500_000_000);
const RECORDINGS_DIR = path.resolve(
  process.env.RECORDINGS_DIR || path.join(process.cwd(), "recordings"),
);

let seq = 0;
let serialPath = null;
let serialOpen = false;
let serialBuffer = "";

const clients = new Set();
const latestById = new Map();
const hotBuffer = [];
const completedRecordings = [];

const deviceStats = {
  received: 0,
  skipped: 0,
  errors: 0,
  queued: 0,
  ts: null,
};

const serverStats = {
  startedAt: Date.now(),
  ingestFrames: 0,
  ingestParseErrors: 0,
  serialErrors: 0,
  broadcastDroppedFrames: 0,
};

const recording = {
  active: false,
  id: null,
  startedAt: null,
  stoppedAt: null,
  filePath: null,
  bytesWritten: 0,
  frameCount: 0,
  stream: null,
};

function ensureRecordingsDir() {
  if (!fs.existsSync(RECORDINGS_DIR)) {
    fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
  }
}

function pushHot(frameEvent) {
  hotBuffer.push(frameEvent);
  if (hotBuffer.length > HOT_BUFFER_MAX) {
    hotBuffer.shift();
  }
}

function bytesFromHex(hexData) {
  if (typeof hexData !== "string" || hexData.length % 2 !== 0) {
    return null;
  }

  const lower = hexData.toLowerCase();
  if (!/^[0-9a-f]*$/.test(lower)) {
    return null;
  }

  return Buffer.from(lower, "hex");
}

function buildDiff(prevHex, nextHex) {
  if (!prevHex) {
    return null;
  }

  const prev = bytesFromHex(prevHex);
  const next = bytesFromHex(nextHex);
  if (!prev || !next) {
    return null;
  }

  const maxLen = Math.max(prev.length, next.length);
  const changedBytes = [];
  const changedBits = [];

  for (let i = 0; i < maxLen; i += 1) {
    const prevByte = i < prev.length ? prev[i] : 0;
    const nextByte = i < next.length ? next[i] : 0;
    const changedMask = prevByte ^ nextByte;

    if (changedMask !== 0) {
      changedBytes.push(i);
      const bits = [];
      for (let bit = 0; bit < 8; bit += 1) {
        if ((changedMask & (1 << bit)) !== 0) {
          bits.push(bit);
        }
      }
      changedBits.push({ byte: i, bits });
    }
  }

  return {
    changed: changedBytes.length > 0,
    changedBytes,
    changedBits,
  };
}

function safeSend(ws, payload) {
  if (ws.readyState !== ws.OPEN) {
    return;
  }

  if (ws.bufferedAmount > CLIENT_BACKPRESSURE_BYTES) {
    serverStats.broadcastDroppedFrames += 1;
    return;
  }

  ws.send(payload);
}

function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    safeSend(ws, payload);
  }
}

function resetRecordingState() {
  recording.active = false;
  recording.id = null;
  recording.startedAt = null;
  recording.stoppedAt = null;
  recording.filePath = null;
  recording.bytesWritten = 0;
  recording.frameCount = 0;
  recording.stream = null;
}

function appendRecording(frameEvent) {
  if (!recording.active || !recording.stream) {
    return;
  }

  const line = JSON.stringify(frameEvent) + "\n";
  const bytes = Buffer.byteLength(line);

  if (recording.bytesWritten + bytes > MAX_RECORDING_BYTES) {
    stopRecording("max-recording-bytes-reached");
    return;
  }

  recording.stream.write(line);
  recording.bytesWritten += bytes;
  recording.frameCount += 1;
}

function startRecording() {
  if (recording.active) {
    return {
      ok: false,
      reason: "recording-already-active",
    };
  }

  ensureRecordingsDir();

  const startedAt = Date.now();
  const id = String(startedAt);
  const fileName = `recording-${id}.ndjson`;
  const filePath = path.join(RECORDINGS_DIR, fileName);

  const stream = fs.createWriteStream(filePath, { encoding: "utf8", flags: "a" });
  recording.active = true;
  recording.id = id;
  recording.startedAt = startedAt;
  recording.stoppedAt = null;
  recording.filePath = filePath;
  recording.bytesWritten = 0;
  recording.frameCount = 0;
  recording.stream = stream;

  return {
    ok: true,
    recording: {
      id,
      startedAt,
      fileName,
      filePath,
    },
  };
}

function stopRecording(reason = "user") {
  if (!recording.active || !recording.stream) {
    return {
      ok: false,
      reason: "recording-not-active",
    };
  }

  const summary = {
    id: recording.id,
    startedAt: recording.startedAt,
    stoppedAt: Date.now(),
    filePath: recording.filePath,
    bytesWritten: recording.bytesWritten,
    frameCount: recording.frameCount,
    reason,
  };

  recording.stream.end();
  completedRecordings.push(summary);
  if (completedRecordings.length > 100) {
    completedRecordings.shift();
  }

  resetRecordingState();
  return {
    ok: true,
    summary,
  };
}

function parseIncomingFrame(payload) {
  if (!payload || payload.type !== "frame") {
    return null;
  }

  if (typeof payload.id !== "number") {
    return null;
  }

  const bytes = bytesFromHex(payload.data);
  if (!bytes) {
    return null;
  }

  return {
    ts: Number(payload.ts) || Date.now(),
    id: payload.id,
    data: payload.data.toLowerCase(),
  };
}

function handleSerialLine(line) {
  if (!line) {
    return;
  }

  let message;
  try {
    message = JSON.parse(line);
  } catch (_err) {
    serverStats.ingestParseErrors += 1;
    return;
  }

  if (message.type === "stats") {
    deviceStats.received = Number(message.received) || 0;
    deviceStats.skipped = Number(message.skipped) || 0;
    deviceStats.errors = Number(message.errors) || 0;
    deviceStats.queued = Number(message.queued) || 0;
    deviceStats.ts = Number(message.ts) || Date.now();

    broadcast({ type: "deviceStats", ...deviceStats });
    return;
  }

  const frame = parseIncomingFrame(message);
  if (!frame) {
    serverStats.ingestParseErrors += 1;
    return;
  }

  serverStats.ingestFrames += 1;
  seq += 1;

  const prev = latestById.get(frame.id);
  const diff = buildDiff(prev ? prev.data : null, frame.data);

  latestById.set(frame.id, frame);

  const event = {
    type: "frame",
    seq,
    ts: frame.ts,
    id: frame.id,
    data: frame.data,
    bytes: frame.data.length / 2,
    diff,
  };

  pushHot(event);
  appendRecording(event);
  broadcast(event);
}

async function resolveSerialPath() {
  if (process.env.SERIAL_PATH) {
    return process.env.SERIAL_PATH;
  }

  const ports = await SerialPort.list();
  if (!ports.length) {
    throw new Error("No serial ports detected. Set SERIAL_PATH to your CircuitPython COM port.");
  }

  const adafruit = ports.find((p) =>
    String(p.manufacturer || "").toLowerCase().includes("adafruit"),
  );
  if (adafruit) {
    return adafruit.path;
  }

  if (ports.length === 1) {
    return ports[0].path;
  }

  const choices = ports.map((p) => p.path).join(", ");
  throw new Error(`Multiple serial ports found (${choices}). Set SERIAL_PATH explicitly.`);
}

async function openSerial() {
  serialPath = await resolveSerialPath();

  const serial = new SerialPort({
    path: serialPath,
    baudRate: SERIAL_BAUD,
  });

  serial.on("open", () => {
    serialOpen = true;
    console.log(`[serial] open path=${serialPath} baud=${SERIAL_BAUD}`);
  });

  serial.on("data", (chunk) => {
    serialBuffer += chunk.toString("utf8");

    let newlineIndex = serialBuffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = serialBuffer.slice(0, newlineIndex).trim();
      serialBuffer = serialBuffer.slice(newlineIndex + 1);
      handleSerialLine(line);
      newlineIndex = serialBuffer.indexOf("\n");
    }
  });

  serial.on("error", (err) => {
    serverStats.serialErrors += 1;
    console.error("[serial] error", err.message);
  });

  serial.on("close", () => {
    serialOpen = false;
    console.warn("[serial] closed");
  });
}

function buildSnapshot() {
  return {
    type: "snapshot",
    ts: Date.now(),
    serial: {
      path: serialPath,
      open: serialOpen,
      baud: SERIAL_BAUD,
    },
    stats: {
      ...serverStats,
      device: deviceStats,
    },
    idsTracked: latestById.size,
    hotBufferFrames: hotBuffer.length,
    recording: {
      active: recording.active,
      id: recording.id,
      startedAt: recording.startedAt,
      bytesWritten: recording.bytesWritten,
      frameCount: recording.frameCount,
    },
  };
}

async function replayRecordingToClient(ws, recordingId) {
  const hit = completedRecordings.find((r) => r.id === recordingId);
  if (!hit) {
    safeSend(
      ws,
      JSON.stringify({
        type: "error",
        code: "recording-not-found",
        recordingId,
      }),
    );
    return;
  }

  if (!fs.existsSync(hit.filePath)) {
    safeSend(
      ws,
      JSON.stringify({
        type: "error",
        code: "recording-file-missing",
        recordingId,
      }),
    );
    return;
  }

  safeSend(
    ws,
    JSON.stringify({ type: "replayStart", recordingId, at: Date.now() }),
  );

  const readStream = fs.createReadStream(hit.filePath, { encoding: "utf8" });
  const lines = readline.createInterface({ input: readStream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line) {
      continue;
    }
    safeSend(ws, line);
  }

  safeSend(
    ws,
    JSON.stringify({ type: "replayEnd", recordingId, at: Date.now() }),
  );
}

function handleWsControl(ws, data) {
  const action = data.action;

  if (action === "startRecording") {
    const started = startRecording();
    safeSend(ws, JSON.stringify({ type: "controlAck", action, ...started }));
    if (started.ok) {
      broadcast({ type: "recordingStarted", ...started.recording });
    }
    return;
  }

  if (action === "stopRecording") {
    const stopped = stopRecording("user");
    safeSend(ws, JSON.stringify({ type: "controlAck", action, ...stopped }));
    if (stopped.ok) {
      broadcast({ type: "recordingStopped", ...stopped.summary });
    }
    return;
  }

  if (action === "listRecordings") {
    safeSend(
      ws,
      JSON.stringify({
        type: "recordings",
        recordings: completedRecordings,
      }),
    );
    return;
  }

  if (action === "replayRecording") {
    replayRecordingToClient(ws, String(data.recordingId || ""));
    return;
  }

  safeSend(
    ws,
    JSON.stringify({
      type: "error",
      code: "unknown-action",
      action,
    }),
  );
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    const body = {
      ok: true,
      serialOpen,
      serialPath,
      wsClients: clients.size,
      idsTracked: latestById.size,
      ingestFrames: serverStats.ingestFrames,
      parseErrors: serverStats.ingestParseErrors,
      recording: {
        active: recording.active,
        id: recording.id,
      },
    };

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not-found" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  clients.add(ws);

  safeSend(
    ws,
    JSON.stringify({
      type: "hello",
      ts: Date.now(),
      wsClients: clients.size,
    }),
  );

  safeSend(ws, JSON.stringify(buildSnapshot()));

  const bootstrap = hotBuffer.slice(-HOT_BOOTSTRAP_LIMIT);
  if (bootstrap.length) {
    safeSend(
      ws,
      JSON.stringify({
        type: "bootstrap",
        frames: bootstrap,
      }),
    );
  }

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString("utf8"));
    } catch (_err) {
      safeSend(ws, JSON.stringify({ type: "error", code: "invalid-json" }));
      return;
    }

    if (data.type === "control") {
      handleWsControl(ws, data);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

server.listen(WS_PORT, async () => {
  console.log(`[ws] listening on :${WS_PORT}`);
  console.log("[ws] controls: startRecording, stopRecording, listRecordings, replayRecording");
  try {
    await openSerial();
  } catch (err) {
    console.error("[serial] failed to open:", err.message);
  }
});
