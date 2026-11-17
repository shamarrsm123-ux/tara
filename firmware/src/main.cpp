// TARA tarha prototype firmware — ESP32 + NimBLE (13 Phase 7, 07 §2).
//  - GATT peripheral "TARA-XXXX": metrics (notify, 1 Hz), status (read/notify), control (write) — all behind an
//    encrypted, bonded link (LE Secure Connections, "Just Works" 🟡 07 §2.2).
//  - Sensor stand-in (Option A): a potentiometer sets the stress level → simulated theta/alpha/beta band powers.
//    Holding the BOOT button simulates "no skin contact". No raw waveform is ever produced or sent.
//  - Cooling driver: GPIO 25 → NPN transistor → fan or blue LED. The firmware enforces its own limits (max 20 min
//    then 5 min rest, battery lockout ≤ 10 %) and keeps enforcing them when the phone is gone.
#include <Arduino.h>
#include <NimBLEDevice.h>
#include <math.h>
#include "tara_protocol.h"

using namespace tara;

// ---- Pins (see README wiring) ----
static const int PIN_STRESS_KNOB = 34;  // potentiometer wiper (ADC1)
static const int PIN_BATTERY = 35;      // battery via 100k/100k divider (ADC1), optional
static const int PIN_COOLING = 25;      // to NPN base via 1k → fan / blue LED
static const int PIN_LED = 2;           // on-board LED (blink-to-identify)
static const int PIN_NO_CONTACT = 0;    // BOOT button: hold = sensor not touching skin

// Set to 1 once a battery divider is wired to PIN_BATTERY; otherwise a fixed 80 % is reported.
#define USE_BATTERY_ADC 0
static const uint8_t SIMULATED_BATTERY_PCT = 80;

static const uint32_t TICK_MS = 1000;
static const uint32_t STATUS_EVERY_S = 10;
static const uint32_t BLINK_MS = 3000;
static const uint16_t BAND_BASE = 1000;
static const float INDEX_CALM = -1.4f;    // knob fully left
static const float INDEX_STRESS = 0.8f;   // knob fully right
static const uint8_t FIT_GOOD = 92;
static const uint8_t FIT_NONE = 20;
static const float SKIN_TEMP_C = 34.2f;

static NimBLECharacteristic* metricsChar = nullptr;
static NimBLECharacteristic* statusChar = nullptr;
static CoolingGuard guard;
static uint16_t seq = 0;
static bool isConnected = false;
static uint32_t lastTickMs = 0;
static uint32_t secondsSinceStatus = 0;
static uint32_t blinkUntilMs = 0;
static uint8_t lastStatus[STATUS_BYTES] = {0};

static uint8_t readBatteryPct() {
#if USE_BATTERY_ADC
  // 1S LiPo through a 1:2 divider: 3.3 V → 0 %, 4.2 V → 100 %.
  float volts = analogReadMilliVolts(PIN_BATTERY) * 2.0f / 1000.0f;
  float pct = (volts - 3.3f) / (4.2f - 3.3f) * 100.0f;
  return (uint8_t)constrain(pct, 0.0f, 100.0f);
#else
  return SIMULATED_BATTERY_PCT;
#endif
}

static void publishStatus(bool force) {
  uint8_t packet[STATUS_BYTES];
  encodeStatus(guard, 0, packet);
  bool changed = memcmp(packet, lastStatus, STATUS_BYTES) != 0;
  statusChar->setValue(packet, STATUS_BYTES);
  if (isConnected && (changed || force)) statusChar->notify();
  memcpy(lastStatus, packet, STATUS_BYTES);
  if (changed || force) secondsSinceStatus = 0;
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*) override { isConnected = true; }
  void onDisconnect(NimBLEServer*) override {
    isConnected = false;
    NimBLEDevice::startAdvertising();  // cooling keeps its own timer; the phone can come back
  }
};

class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    const uint8_t* b = reinterpret_cast<const uint8_t*>(v.data());
    switch (b[0]) {
      case COOL_ON:
        if (v.size() >= 3) guard.coolOn((uint32_t)b[1] | ((uint32_t)b[2] << 8));
        break;
      case COOL_OFF:
        guard.coolOff();
        break;
      case BLINK:
        blinkUntilMs = millis() + BLINK_MS;
        break;
      default:
        break;  // PING and unknown opcodes: nothing to do
    }
    digitalWrite(PIN_COOLING, guard.isDriving() ? HIGH : LOW);  // react within the same write (< 1 s)
    publishStatus(true);
  }
};

static void sendMetrics() {
  int knob = analogRead(PIN_STRESS_KNOB);  // 0–4095
  float index = INDEX_CALM + (INDEX_STRESS - INDEX_CALM) * (knob / 4095.0f);
  index += (float)random(-30, 31) / 1000.0f;  // a little natural variation
  Metrics m{};
  m.seq = seq++;
  m.theta = BAND_BASE;
  m.alpha = BAND_BASE;
  m.beta = (uint16_t)constrain(2.0f * BAND_BASE * expf(index), 1.0f, 65535.0f);
  bool isOffSkin = digitalRead(PIN_NO_CONTACT) == LOW;
  m.fit = isOffSkin ? FIT_NONE : FIT_GOOD;
  m.skinTempC = SKIN_TEMP_C;
  m.hasTemp = true;
  m.motion = false;
  m.saturated = false;
  uint8_t packet[METRICS_BYTES];
  encodeMetrics(m, packet);
  metricsChar->setValue(packet, METRICS_BYTES);
  if (isConnected) metricsChar->notify();
}

void setup() {
  pinMode(PIN_COOLING, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_NO_CONTACT, INPUT_PULLUP);
  digitalWrite(PIN_COOLING, LOW);
  analogReadResolution(12);

  uint64_t mac = ESP.getEfuseMac();
  char name[12];
  snprintf(name, sizeof(name), "TARA-%04X", (unsigned)((mac >> 32) & 0xFFFF));

  NimBLEDevice::init(name);
  NimBLEDevice::setSecurityAuth(true, false, true);  // bond, no MITM (no display/keypad), LE Secure Connections
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService* service = server->createService(SERVICE_UUID);
  // *_ENC properties make every read, subscription and write require an encrypted, bonded link (07 §2.2).
  metricsChar = service->createCharacteristic(METRICS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::READ_ENC | NIMBLE_PROPERTY::NOTIFY);
  statusChar = service->createCharacteristic(STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::READ_ENC | NIMBLE_PROPERTY::NOTIFY);
  NimBLECharacteristic* control = service->createCharacteristic(CONTROL_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_ENC);
  control->setCallbacks(new ControlCallbacks());
  service->start();

  guard.batteryPct = readBatteryPct();
  publishStatus(true);

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  adv->start();
}

void loop() {
  uint32_t now = millis();
  digitalWrite(PIN_LED, (now < blinkUntilMs) ? ((now / 250) % 2) : LOW);
  if (now - lastTickMs < TICK_MS) return;
  lastTickMs = now;

  guard.tick(readBatteryPct());  // runs with or without a phone: the firmware is the cooling authority
  digitalWrite(PIN_COOLING, guard.isDriving() ? HIGH : LOW);
  sendMetrics();
  secondsSinceStatus++;
  publishStatus(secondsSinceStatus >= STATUS_EVERY_S);
}
