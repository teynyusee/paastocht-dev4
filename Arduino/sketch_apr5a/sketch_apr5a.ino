#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

// WIFI
const char* ssid = "iPhone van Teynur";
const char* password = "teynur233";

// BACKEND
const char* serverAddress = "192.168.129.221";
int port = 5001;

WiFiClient wifi;
HttpClient client(wifi, serverAddress, port);

void setup() {
  Serial.begin(9600);
  while (!Serial);

  SPI.begin();
  mfrc522.PCD_Init();

  Serial.println("RC522 gestart");
  Serial.println("Connecting to WiFi...");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("Arduino IP: ");
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

  String eggId = mapUIDtoEgg(uid);

  Serial.print("Mapped to: ");
  Serial.println(eggId);

  if (eggId == "unknown") {
    Serial.println("Onbekende tag - niets verstuurd.");
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    delay(200);
    return;
  }

  sendToBackend(eggId);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  delay(200);
}

String mapUIDtoEgg(String uid) {
  if (uid == "C4E67CB0") return "egg-1";

  // Voeg hier je andere tags toe:
  if (uid == "XXXXXXXX") return "egg-2";
  if (uid == "YYYYYYYY") return "egg-3";
  if (uid == "ZZZZZZZZ") return "egg-4";
  if (uid == "AAAAAAAA") return "egg-5";
  if (uid == "BBBBBBBB") return "egg-6";
  if (uid == "CCCCCCCC") return "egg-7";
  if (uid == "DDDDDDDD") return "egg-8";
  if (uid == "EEEEEEEE") return "egg-9";
  if (uid == "FFFFFFFF") return "egg-10";
  if (uid == "11111111") return "egg-11";
  if (uid == "22222222") return "egg-12";

  return "unknown";
}

void sendToBackend(String eggId) {
  String path = "/api/scan";
  String contentType = "application/json";
  String body = "{\"eggId\":\"" + eggId + "\"}";

  Serial.println("Sending to backend...");
  Serial.print("POST ");
  Serial.print(serverAddress);
  Serial.print(":");
  Serial.println(port);
  Serial.print("Body: ");
  Serial.println(body);

  client.beginRequest();
  client.post(path);
  client.sendHeader("Content-Type", contentType);
  client.sendHeader("Content-Length", body.length());
  client.beginBody();
  client.print(body);
  client.endRequest();

  int statusCode = client.responseStatusCode();
  String response = client.responseBody();

  Serial.print("Status: ");
  Serial.println(statusCode);

  Serial.print("Response: ");
  Serial.println(response);

  client.stop();
}