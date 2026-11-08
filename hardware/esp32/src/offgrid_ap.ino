// ESP32-S3: broadcasts the private OFFGRID Wi-Fi. No internet, no company network.
#include <WiFi.h>
void setup() {
  Serial.begin(115200);
  // name, password (8+ chars), channel, hidden(0=visible), max devices
  WiFi.softAP("OFFGRID", "ChooseAStrongPass1!", 1, 0, 8);
  Serial.print("OFFGRID up at ");
  Serial.println(WiFi.softAPIP());   // usually 192.168.4.1
}
void loop() {
  static unsigned long t = 0;
  if (millis() - t > 5000) {
    t = millis();
    Serial.printf("Devices connected: %d\n", WiFi.softAPgetStationNum());
  }
}
