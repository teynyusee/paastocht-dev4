#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

// WIFI
const char* ssid = "Proximus-Home-201829_EXT";
const char* password = "be7seyjw732ee7ff";

// LOKALE BACKEND
const char* serverAddress = "192.168.129.219";
int port = 5001;

WiFiClient wifi;
HttpClient client(wifi, serverAddress, port);

// 4 tags lokaal bijhouden
const int TOTAL_EGGS = 4;
String foundEggs[TOTAL_EGGS];
int foundCount = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial);

  SPI.begin();
  mfrc522.PCD_Init();

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

  String uid = getUID();
  String eggId = mapUIDtoEgg(uid);

  Serial.print("UID: ");
  Serial.println(uid);

  Serial.print("Mapped to: ");
  Serial.println(eggId);

  if (eggId == "unknown") {
    Serial.println("Unknown tag, niet gestuurd.");
  } else if (alreadyFound(eggId)) {
    Serial.println("Deze egg is al gescand in deze ronde.");
  } else {
    foundEggs[foundCount] = eggId;
    foundCount++;

    sendToBackend(eggId);

    Serial.print("Found count: ");
    Serial.print(foundCount);
    Serial.print(" / ");
    Serial.println(TOTAL_EGGS);

    if (foundCount >= TOTAL_EGGS) {
      Serial.println("Alle 4 tags gevonden. Arduino reset lokale scanlijst.");
      resetLocalScans();
    }
  }

  Serial.println("--------------------");

  delay(1000);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

String getUID() {
  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

String mapUIDtoEgg(String uid) {
  if (uid == "C4E67CB0") return "egg-1";
  if (uid == "1DFAA406051080") return "egg-2";
  if (uid == "1DF8A406051080") return "egg-3";
  if (uid == "1DF9A406051080") return "egg-4";

  return "unknown";
}

bool alreadyFound(String eggId) {
  for (int i = 0; i < foundCount; i++) {
    if (foundEggs[i] == eggId) {
      return true;
    }
  }

  return false;
}

void resetLocalScans() {
  for (int i = 0; i < TOTAL_EGGS; i++) {
    foundEggs[i] = "";
  }

  foundCount = 0;

  Serial.println("Lokale Arduino scanlijst is gereset.");
}

void sendToBackend(String eggId) {
  String path = "/api/scan";
  String contentType = "application/json";
  String body = "{\"eggId\":\"" + eggId + "\"}";

  Serial.println("Sending to local backend...");
  Serial.println(body);

  client.post(path, contentType, body);

  int statusCode = client.responseStatusCode();
  String response = client.responseBody();

  Serial.print("Status: ");
  Serial.println(statusCode);

  Serial.print("Response: ");
  Serial.println(response);

  client.stop();
}