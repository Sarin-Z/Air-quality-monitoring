// RXD -> 1TX, TXD -> 0RX
uint8_t buf[32];

void setup() {
  Serial.begin(9600);       // Monitor ผ่าน USB
  Serial1.begin(9600);      // PMS3003 ใช้ Serial1
}

void loop() {
  if (Serial1.available() >= 32) {
    for (int i = 0; i < 32; i++) {
      buf[i] = Serial1.read();
    }

    if (buf[0] == 0x42 && buf[1] == 0x4d) {
      uint16_t pm1_0  = (buf[10] << 8) | buf[11];
      uint16_t pm2_5  = (buf[12] << 8) | buf[13];
      uint16_t pm10   = (buf[14] << 8) | buf[15];

      Serial.print("PM1.0: ");
      Serial.print(pm1_0);
      Serial.print(" ug/m3, ");

      Serial.print("PM2.5: ");
      Serial.print(pm2_5);
      Serial.print(" ug/m3, ");

      Serial.print("PM10: ");
      Serial.print(pm10);
      Serial.println(" ug/m3");
    }
  }
}
