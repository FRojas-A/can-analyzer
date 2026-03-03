import json
import time

import board
from adafruit_mcp2515 import MCP2515 as CAN
from adafruit_mcp2515.canio import Message
from digitalio import DigitalInOut


CAN_BAUDRATE = 500000
LISTENER_TIMEOUT_S = 0.02
STATS_INTERVAL_S = 5.0


def emit(payload):
    print(json.dumps(payload, separators=(",", ":")))


def now_ms():
    return int(time.monotonic() * 1000)


def main():
    cs = DigitalInOut(board.CAN_CS)
    cs.switch_to_output(value=True)
    spi = board.SPI()
    can_bus = CAN(spi, cs, baudrate=CAN_BAUDRATE)

    received = 0
    skipped = 0
    errors = 0
    next_stats_at = time.monotonic() + STATS_INTERVAL_S

    with can_bus.listen(timeout=LISTENER_TIMEOUT_S) as listener:
        while True:
            try:
                msg = listener.receive()
                if msg is not None:
                    if isinstance(msg, Message) and not getattr(msg, "extended", False):
                        received += 1
                        emit(
                            {
                                "type": "frame",
                                "ts": now_ms(),
                                "id": msg.id,
                                "data": bytes(msg.data).hex(),
                            }
                        )
                    else:
                        skipped += 1

                    # Drain queued messages immediately to avoid backlog growth.
                    pending = listener.in_waiting()
                    for _ in range(pending):
                        queued_msg = listener.receive()
                        if isinstance(queued_msg, Message) and not getattr(
                            queued_msg, "extended", False
                        ):
                            received += 1
                            emit(
                                {
                                    "type": "frame",
                                    "ts": now_ms(),
                                    "id": queued_msg.id,
                                    "data": bytes(queued_msg.data).hex(),
                                }
                            )
                        else:
                            skipped += 1

                now = time.monotonic()
                if now >= next_stats_at:
                    emit(
                        {
                            "type": "stats",
                            "ts": now_ms(),
                            "received": received,
                            "skipped": skipped,
                            "errors": errors,
                            "queued": listener.in_waiting(),
                        }
                    )
                    next_stats_at = now + STATS_INTERVAL_S
            except Exception:
                errors += 1


main()
