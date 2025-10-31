#include <WiFiS3.h>
#include <MQTTClient.h>
#include "DHT.h"

/*
 *	AM2302-Sensor_Example.ino
 *
 *	Author: Frank Häfele
 *	Date:	21.11.2023
 *
 *	Object: Measure Sensor Data of AM2302-Sensor with Arduino IDE
 */

#include <AM2302-Sensor.h>
constexpr unsigned int SENSOR_PIN{7U};

AM2302::AM2302_Sensor am2302{SENSOR_PIN};

// ---------- WiFi Config ----------
const char WIFI_SSID[] = "Redmi 14C";
const char WIFI_PASSWORD[] = "12345678";

// ---------- MQTT Config ----------
const char MQTT_BROKER_ADRRESS[] = "mqtt-dashboard.com";
const int MQTT_PORT = 1883;
const char MQTT_CLIENT_ID[] = "arduino-uno-r4-client";
const char MQTT_USERNAME[] = "";
const char MQTT_PASSWORD[] = "";
const char PUBLIC_TOPIC_PM[] = "test/pm";
const char PUBLIC_TOPIC_TEMP[] = "test/temp";

WiFiClient network;
MQTTClient mqtt = MQTTClient(256);

unsigned long lastPublishTime = 0;
const int PUBLISH_INTERVAL = 5000; // 5 วินาที

// ---------- PMS3003 Config ----------
uint8_t buf[32];
uint16_t pm1_0 = 0, pm2_5 = 0, pm10 = 0;

void setup()
{
  Serial.begin(9600);  // Monitor
  Serial1.begin(9600); // PMS3003

  while (!Serial)
  {
    yield();
  }
  Serial.print(F("\n >>> AM2302-Sensor_Example <<<\n\n"));

  // set pin and check for sensor
  if (am2302.begin())
  {
    // this delay is needed to receive valid data,
    // when the loop directly read again
    delay(3000);
  }
  else
  {
    while (true)
    {
      Serial.println("Error: sensor check. => Please check sensor connection!");
      delay(10000);
    }
  }

  // --- เชื่อมต่อ WiFi ---
  int status = WL_IDLE_STATUS;
  while (status != WL_CONNECTED)
  {
    Serial.print("Connecting WiFi: ");
    Serial.println(WIFI_SSID);
    status = WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    delay(5000);
  }
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // --- เชื่อมต่อ MQTT ---
  connectToMQTT();
}

void loop()
{
  mqtt.loop();
  readPMS3003();

  if (millis() - lastPublishTime > PUBLISH_INTERVAL)
  {
    sendToMQTT();
    lastPublishTime = millis();
  }
}

// ---------- ฟังก์ชันอ่านค่า PMS3003 ----------
void readPMS3003()
{
  if (Serial1.available() >= 32)
  {
    for (int i = 0; i < 32; i++)
    {
      buf[i] = Serial1.read();
    }

    if (buf[0] == 0x42 && buf[1] == 0x4d)
    {
      pm1_0 = (buf[10] << 8) | buf[11];
      pm2_5 = (buf[12] << 8) | buf[13];
      pm10 = (buf[14] << 8) | buf[15];

      Serial.print("PM1.0: ");
      Serial.print(pm1_0);
      Serial.print("  PM2.5: ");
      Serial.print(pm2_5);
      Serial.print("  PM10: ");
      Serial.println(pm10);
    }
  }
}

// ---------- ฟังก์ชันเชื่อม MQTT ----------
void connectToMQTT()
{
  mqtt.begin(MQTT_BROKER_ADRRESS, MQTT_PORT, network);
  Serial.print("Connecting to MQTT broker");
  while (!mqtt.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD))
  {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.println("MQTT Connected!");
}

// ---------- ฟังก์ชันส่งข้อมูลไป MQTT ----------
void sendToMQTT()
{

  // --------------------------------------PM sensor---------------------------------------
  // แปลงเป็น JSON (หรือ string ปกติก็ได้)
  String payload = "{\"pm1_0\": " + String(pm1_0) + ", \"pm2_5\": " + String(pm2_5) + ", \"pm10\": " + String(pm10) + "}";

  mqtt.publish(PUBLIC_TOPIC_PM, payload);

  Serial.println("Sent to MQTT:");
  Serial.println(payload);

  // -------------------------------------DHT22 Module-------------------------------------
  auto status = am2302.read();
  float temp = am2302.get_Temperature();
  float hum = am2302.get_Humidity();

  String payload2 = "{\"temperature\": " + String(temp, 1) + ", \"humidity\": " + String(hum, 1) + "}";

  mqtt.publish("test/temp", payload2.c_str());
  Serial.println(payload2);
}
