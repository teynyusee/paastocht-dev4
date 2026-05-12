#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

// =======================
// NFC READER PINS
// =======================
// SDA / SS  -> D10
// SCK       -> D13
// MOSI      -> D11
// MISO      -> D12
// RST       -> D9
// 3.3V      -> 3.3V
// GND       -> GND

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

// =======================
// LED PIN
// =======================

#define LED_PIN 7

// =======================
// WIFI SETTINGS
// =======================

const char* ssid = "iPhone van Teynur";
const char* password = "teynur233";

// =======================
// RASPBERRY PI BACKEND
// =======================

// const char* serverAddress = "172.20.10.4";
const char* serverAddress = "paaskonijn.local";
const int serverPort = 5001;

WiFiClient wifi;
HttpClient client(wifi, serverAddress, serverPort);

// =======================
// SCAN SETTINGS
// =======================

String lastUID = "";
unsigned long lastScanTime = 0;
const unsigned long sameTagCooldown = 2000;

unsigned long lastWifiCheck = 0;
const unsigned long wifiCheckInterval = 5000;

// =======================
// LED HELPERS
// =======================

void ledOn() {
  digitalWrite(LED_PIN, HIGH);
}

void ledOff() {
  digitalWrite(LED_PIN, LOW);
}

void blinkLedOnce() {
  Serial.println("LED KNIPPER");
  ledOn();
  delay(1000);
  ledOff();
}

void startupLedTest() {
  for (int i = 0; i < 3; i++) {
    ledOn();
    delay(200);
    ledOff();
    delay(200);
  }
}

// =======================
// HELPERS
// =======================

String getUidString() {
  String uid = "";

  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      uid += "0";
    }

    uid += String(mfrc522.uid.uidByte[i], HEX);
  }

  uid.toUpperCase();
  return uid;
}

void connectToWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.println();
  Serial.println("Verbinden met WiFi...");
  Serial.print("SSID: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int tries = 0;

  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi verbonden!");
    Serial.print("Arduino IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Backend: http://");
    Serial.print(serverAddress);
    Serial.print(":");
    Serial.println(serverPort);
  } else {
    Serial.println("WiFi verbinden mislukt. Probeert straks opnieuw.");
  }
}

bool sendEggScan(String eggId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Geen WiFi. Scan niet verzonden.");
    return false;
  }

  String path = "/api/scan";
  String body = "{\"eggId\":\"" + eggId + "\"}";

  Serial.println();
  Serial.println("Scan verzenden naar backend...");
  Serial.print("Egg ID: ");
  Serial.println(eggId);
  Serial.print("URL: http://");
  Serial.print(serverAddress);
  Serial.print(":");
  Serial.print(serverPort);
  Serial.println(path);
  Serial.print("Body: ");
  Serial.println(body);

  client.beginRequest();
  client.post(path);
  client.sendHeader("Content-Type", "application/json");
  client.sendHeader("Content-Length", body.length());
  client.beginBody();
  client.print(body);
  client.endRequest();

  int statusCode = client.responseStatusCode();
  String response = client.responseBody();

  Serial.print("Status code: ");
  Serial.println(statusCode);

  Serial.print("Response: ");
  Serial.println(response);

  if (statusCode >= 200 && statusCode < 300) {
    Serial.println("Scan succesvol verzonden!");
    return true;
  }

  Serial.println("Scan verzenden mislukt.");
  return false;
}

// =======================
// SETUP
// =======================

void setup() {
  Serial.begin(9600);

  while (!Serial) {
    delay(10);
  }

  pinMode(LED_PIN, OUTPUT);
  ledOff();

  Serial.println();
  Serial.println("==============================");
  Serial.println("Paaskonijn NFC Scanner gestart");
  Serial.println("==============================");

  // Test: LED moet hier 3 keer knipperen bij opstart
  startupLedTest();

  SPI.begin();
  mfrc522.PCD_Init();

  delay(500);

  Serial.println("NFC reader klaar.");
  Serial.println("Leg een ei/tag op de scanner...");

  connectToWifi();
}

// =======================
// LOOP
// =======================

void loop() {
  if (millis() - lastWifiCheck > wifiCheckInterval) {
    lastWifiCheck = millis();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi verbinding kwijt.");
      connectToWifi();
    }
  }

  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  String uid = getUidString();
  unsigned long now = millis();

  Serial.println();
  Serial.print("Tag gevonden: ");
  Serial.println(uid);

  if (uid == lastUID && now - lastScanTime < sameTagCooldown) {
    Serial.println("Zelfde tag te snel opnieuw gescand. Genegeerd.");

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }

  lastUID = uid;
  lastScanTime = now;

  // BELANGRIJK: LED brandt meteen na scan, dus niet wachten op backend
  blinkLedOnce();

  // Daarna pas naar backend sturen
  sendEggScan(uid);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  delay(300);
}