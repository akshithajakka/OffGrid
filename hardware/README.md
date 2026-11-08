# Hardware (scaffold — not integrated with app yet)

| Piece | Status | Code |
|--------|--------|------|
| ESP32 captive AP | Starter sketch | `esp32/src/offgrid_ap.ino` |
| Pico RFID + HID | **TODO — edit stubs** | `pico/src/code.py` |
| Wiring | **TODO** | `wiring/pinout.md` |

The React app does **not** import any of this yet. Integration is USB keyboard lines into the Lead browser (`!F<uid>`) + OFFGRID Wi‑Fi.

Reference implementation (teammate bundle): `~/Downloads/warroom/pico/` and `esp32/`.

When firmware is ready, flash Pico + ESP32; no frontend zip changes required if the HID format matches `docs/key-fob-flow.md`.
