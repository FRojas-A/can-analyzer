# CAN Analyzer

A real-time CAN bus analysis tool for monitoring, recording, and analyzing Controller Area Network (CAN) messages. This application provides a web-based interface for visualizing CAN traffic with live updates, frame filtering, and signal extraction capabilities.

## Architecture

The system consists of three main components:

1. **CircuitPython Feather** (`hardware/code.py`) - Runs on Adafruit RP2040 CAN Feather with MCP2515 CAN controller
2. **Node.js WebSocket Server** (`app.js`) - Handles serial communication and real-time data broadcasting
3. **React Web Interface** - Provides visualization and analysis tools

## Features

- **Real-time CAN bus monitoring** with live frame updates
- **Frame filtering and hiding** for focused analysis
- **Signal extraction** with configurable bit positions and scaling
- **Recording and playback** of CAN traffic sessions
- **Visual diff highlighting** to see data changes over time
- **WebSocket-based communication** for low-latency updates
- **Health monitoring** and system statistics

## Hardware Requirements

- Adafruit RP2040 CAN Feather
- Serial connection to host computer
- CAN bus network to monitor (OBD-II port, vehicle CAN bus, or industrial CAN network)

## Software Requirements

- Node.js 18+
- Python 3.8+ (for CircuitPython Feather)

## Installation

### Backend Setup

```bash
# Install dependencies
npm install

# Start the WebSocket server
npm run dev:server
```

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### CircuitPython Feather

1. Copy the `lib` directory to your Feather
2. Copy `code.py` to your Feather

## Usage

1. Connect your CAN hardware to the computer via USB
2. Start the WebSocket server: `npm run dev:server`
3. Start the web interface: `npm run dev`
4. Open `http://localhost:5173` in your browser
5. The server will automatically detect and connect to your CAN Feather

## Configuration

Environment variables can be set in `.env.local`:

```env
# WebSocket server port (default: 8080)
WS_PORT=8080

# Serial port path (auto-detected if not specified)
SERIAL_PATH=COM3

# Serial baud rate (default: 115200)
SERIAL_BAUD=115200

# Recording directory
RECORDINGS_DIR=./recordings

# Maximum recording size in bytes (default: 500MB)
MAX_RECORDING_BYTES=500000000
```

## API

### WebSocket Events

**Incoming frames:**
```json
{
  "type": "frame",
  "seq": 123,
  "ts": 1640995200000,
  "id": "0x1A3",
  "data": "0x123456789ABCDEF0",
  "bytes": 8,
  "diff": {
    "changed": true,
    "changedBytes": [0, 1],
    "changedBits": [{"byte": 0, "bits": [2, 3]}]
  }
}
```

**Control messages:**
```json
{
  "type": "control",
  "action": "startRecording|stopRecording|listRecordings|replayRecording",
  "recordingId": "1234567890"
}
```

### HTTP Endpoints

- `GET /health` - System health and statistics

## Components

### Frame Analysis
- **Live Table**: Real-time display of CAN frames with filtering options
- **Frame Details**: Deep dive into individual frames with signal extraction
- **Byte Expander**: Visual representation of frame data with change highlighting

### Recording System
- **Start/Stop Recording**: Capture CAN traffic for later analysis
- **Playback**: Replay recorded sessions with real-time timing
- **Export**: Save recordings in NDJSON format

### Signal Configuration
Configure signals within each frame:
- **Start Bit**: Position in the frame data
- **Bit Length**: Size of the signal
- **Endianness**: Big or little endian byte order
- **Scale/Offset**: Convert raw values to engineering units
- **Min/Max**: Expected range for validation

## Development

### Project Structure

```
can-analyzer/
├── app.js                 # WebSocket server
├── hardware/              # CircuitPython Feather code
│   ├── code.py           # CAN bus monitoring firmware
│   └── lib/              # CircuitPython libraries
├── src/
│   ├── components/       # React components
│   │   ├── FrameDetails/ # Frame analysis UI
│   │   ├── LiveTable/    # Real-time frame display
│   │   ├── TopNav/       # Pause/Resume, recording, and connection status
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript definitions
├── recordings/           # Saved CAN traffic recordings
└── package.json          # Dependencies and scripts
```

### Key Technologies

- **Backend**: Node.js, WebSocket, SerialPort
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Hardware**: CircuitPython, Adafruit RP2040 CAN Feather

## License

This project is licensed under the MIT License.
