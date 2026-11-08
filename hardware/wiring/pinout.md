# Wiring (TODO)

Document pin assignments here before demo. Suggested starting point (from teammate bundle — verify on bench):

| Function | Pico pin | Notes |
|----------|----------|--------|
| I2C OLED SDA | GP4 | 128×64 SSD1306 |
| I2C OLED SCL | GP5 | |
| SPI RFID | (see MFRC522 sketch) | MFRC522 |
| LED red | GP21 | |
| LED green | GP22 | |
| Buzzer | GP26 | |

ESP32: see `esp32/src/offgrid_ap.ino` for soft AP only.

**Input files for hardware code:** edit `pico/src/code.py`, `esp32/src/offgrid_ap.ino`, and this pinout — not the Figma frontend zip.
