#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

// 🔑 WIFI
const char* ssid = "Proximus-Home-201829_EXT";
const char* password = "be7seyjw732ee7ff";

// 🌐 BACKEND
const char* serverAddress = "https://paastocht-dev4.onrender.com";
int port = 443;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, serverAddress, port);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  // NFC
  SPI.begin();
  mfrc522.PCD_Init();

  // WIFI connect
  Serial.print("Connecting to WiFi...");
  while (WiFi.begin(ssid, password) != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  Serial.println("Hou een tag tegen de reader...");
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();

  Serial.print("UID: ");
  Serial.println(uid);

  // 🔥 MAP NAAR eggId
  String eggId = mapUIDtoEgg(uid);

  Serial.print("Mapped to: ");
  Serial.println(eggId);

  sendToBackend(eggId);

  delay(2000); // anti-spam

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

String mapUIDtoEgg(String uid) {
  if (uid == "C4E67CB0") return "egg-1";


  return "unknown";
}

void sendToBackend(String eggId) {
  String path = "/api/scan";
  String contentType = "application/json";

  String body = "{\"eggId\":\"" + eggId + "\"}";

  Serial.println("Sending to backend...");

  client.post(path, contentType, body);

  int statusCode = client.responseStatusCode();
  String response = client.responseBody();

  Serial.print("Status: ");
  Serial.println(statusCode);

  Serial.print("Response: ");
  Serial.println(response);
}