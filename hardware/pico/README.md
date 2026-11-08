# Pico 2 W — control box (CircuitPython)

**Status:** stub in repo; copy libs from Adafruit bundle and flesh out `src/code.py`.

## Responsibilities

- MFRC522 RFID → type `!F<HEX_UID>` + Enter (USB HID)
- Optional: OLED status, panic `!P`, keypad `!C<code>#` for join codes
- Buzzer / LEDs per team design

## Flash

1. Install CircuitPython on Pico 2 W.
2. Copy `src/code.py` to `CIRCUITPY/code.py`.
3. Add `lib/` drivers (`adafruit_hid`, `mfrc522`, etc.) — see teammate `~/Downloads/warroom/pico/lib/`.

## Test without hardware

Use frontend **Demo tools** → “Tap the Lead’s key fob” on `#/lead`.
