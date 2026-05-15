#include <SPI.h>
#include <MFRC522.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

// =======================
// NFC READER PINS
// =======================

#define SS_PIN 10
#define RST_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);

// =======================
// LED PIN
// =======================
// LED(s) aansluiten op D6

#define LED_PIN 6

// =======================
// WIFI SETTINGS
// =======================

const char* ssid = "iPhone van Teynur";
const char* password = "teynur233";

// =======================
// RASPBERRY PI BACKEND
// =======================

//const char* serverAddress = "172.20.10.4";
const char* serverAddress = "paaskonijn.local";
const int serverPort = 5001;

WiFiClient wifi;
HttpClient client(wifi, serverAddress, serverPort);

// =======================
// SCAN SETTINGS
// =======================

String lastUID = "";
unsigned long lastScanTime = 0;

// Was 2000ms. Dat voelde traag.
// 700ms blokkeert hetzelfde ei nog tegen spam,
// maar scans voelen veel sneller.
const unsigned long sameTagCooldown = 700;

unsigned long lastWifiCheck = 0;
const unsigned long wifiCheckInterval = 5000;

// =======================
// SMOOTH LED SETTINGS
// =======================

int brightness = 0;
int fadeDirection = 1;

const int minBrightness = 0;
const int maxBrightness = 255;
const int fadeStep = 3;

unsigned long lastFadeTime = 0;
const unsigned long fadeInterval = 15;

// =======================
// NON-BLOCKING SCAN LED EFFECT
// =======================

enum LedMode {
  LED_IDLE,
  LED_SCAN_WAIT,
  LED_SCAN_FLASH_ON,
  LED_SCAN_FLASH_OFF,
  LED_SCAN_HOLD,
  LED_SCAN_FADE_OUT
};

LedMode ledMode = LED_IDLE;

unsigned long ledModeStartedAt = 0;
unsigned long lastScanLedStep = 0;

int scanFlashCount = 0;

const unsigned long scanWaitMs = 120;
const unsigned long flashOnMs = 90;
const unsigned long flashOffMs = 70;
const int maxScanFlashes = 4;
const unsigned long scanHoldMs = 1200;

// =======================
// LED HELPERS
// =======================

void setLed(int value) {
  value = constrain(value, 0, 255);
  analogWrite(LED_PIN, value);
}

void updateSmoothIdleLed() {
  if (ledMode != LED_IDLE) {
    return;
  }

  unsigned long now = millis();

  if (now - lastFadeTime >= fadeInterval) {
    lastFadeTime = now;

    brightness += fadeDirection * fadeStep;

    if (brightness >= maxBrightness) {
      brightness = maxBrightness;
      fadeDirection = -1;
    }

    if (brightness <= minBrightness) {
      brightness = minBrightness;
      fadeDirection = 1;
    }

    setLed(brightness);
  }
}

void startScanLedEffect() {
  Serial.println("SCAN LED EFFECT START");

  ledMode = LED_SCAN_WAIT;
  ledModeStartedAt = millis();
  lastScanLedStep = millis();
  scanFlashCount = 0;
}

void updateScanLedEffect() {
  if (ledMode == LED_IDLE) {
    return;
  }

  unsigned long now = millis();

  if (ledMode == LED_SCAN_WAIT) {
    setLed(40);

    if (now - ledModeStartedAt >= scanWaitMs) {
      ledMode = LED_SCAN_FLASH_ON;
      ledModeStartedAt = now;
      setLed(255);
    }

    return;
  }

  if (ledMode == LED_SCAN_FLASH_ON) {
    if (now - ledModeStartedAt >= flashOnMs) {
      ledMode = LED_SCAN_FLASH_OFF;
      ledModeStartedAt = now;
      setLed(30);
    }

    return;
  }

  if (ledMode == LED_SCAN_FLASH_OFF) {
    if (now - ledModeStartedAt >= flashOffMs) {
      scanFlashCount++;

      if (scanFlashCount >= maxScanFlashes) {
        ledMode = LED_SCAN_HOLD;
        ledModeStartedAt = now;
        setLed(255);
      } else {
        ledMode = LED_SCAN_FLASH_ON;
        ledModeStartedAt = now;
        setLed(255);
      }
    }

    return;
  }

  if (ledMode == LED_SCAN_HOLD) {
    setLed(255);

    if (now - ledModeStartedAt >= scanHoldMs) {
      ledMode = LED_SCAN_FADE_OUT;
      ledModeStartedAt = now;
      lastScanLedStep = now;
    }

    return;
  }

  if (ledMode == LED_SCAN_FADE_OUT) {
    if (now - lastScanLedStep >= 8) {
      lastScanLedStep = now;

      brightness -= 8;

      if (brightness <= 0) {
        brightness = 0;
        setLed(0);

        ledMode = LED_IDLE;
        fadeDirection = 1;
        lastFadeTime = millis();

        Serial.println("SCAN LED EFFECT END");
      } else {
        setLed(brightness);
      }
    }

    return;
  }
}

void fadeToBlocking(int target, int stepDelay) {
  target = constrain(target, 0, 255);

  if (brightness < target) {
    for (int b = brightness; b <= target; b += 5) {
      brightness = b;
      setLed(brightness);
      delay(stepDelay);
    }
  } else {
    for (int b = brightness; b >= target; b -= 5) {
      brightness = b;
      setLed(brightness);
      delay(stepDelay);
    }
  }

  brightness = target;
  setLed(brightness);
}

void startupLedTest() {
  for (int i = 0; i < 2; i++) {
    fadeToBlocking(255, 2);
    delay(150);
    fadeToBlocking(0, 2);
    delay(150);
  }

  brightness = 0;
  fadeDirection = 1;
  setLed(0);
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
    unsigned long waitStart = millis();

    while (millis() - waitStart < 500) {
      updateSmoothIdleLed();
      updateScanLedEffect();
      delay(5);
    }

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
  Serial.println("Scan DIRECT verzenden naar backend...");
  Serial.print("Egg ID: ");
  Serial.println(eggId);
  Serial.print("URL: http://");
  Serial.print(serverAddress);
  Serial.print(":");
  Serial.print(serverPort);
  Serial.println(path);

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
  setLed(0);

  Serial.println();
  Serial.println("==============================");
  Serial.println("Paaskonijn NFC Scanner gestart");
  Serial.println("Fast scan mode + smooth LED op D6");
  Serial.println("==============================");

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
  updateSmoothIdleLed();
  updateScanLedEffect();

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

  // LED effect start direct, maar blokkeert de scan niet meer.
  startScanLedEffect();

  // NFC netjes afsluiten voor we HTTP doen.
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  // Scan wordt nu direct verzonden, niet pas na LED-effect.
  sendEggScan(uid);
}