# OffGrid — Pico control box (CircuitPython)
# STATUS: scaffold only. Implement RFID + USB HID here.
#
# Browser contract (frontend/src/lib/fob.ts):
#   !F<HEX_UID><Enter>   — any badge/fob tap
#   !P<Enter>             — panic (wire when backend/UI ready)
#   !C<digits>#           — join code from keypad (optional)
#
# Reference: ~/Downloads/warroom/pico/code.py

import time

# TODO: board, busio, digitalio, usb_hid, MFRC522, KeyboardLayoutUS
# TODO: on RFID read → kbd.write("!F" + uid_hex.upper() + "\n")


def main():
    show("OffGrid", "RFID: TODO", "")
    while True:
        # TODO: poll reader, debounce, type line
        time.sleep(0.05)


def show(*lines):
  print(" | ".join(lines))


main()
