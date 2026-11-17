// TARA tarha protocol + cooling safety rules (07 §2, §5.3; 08 §8). Plain C++ with no Arduino calls, so the exact
// same code is compiled on the ESP32 and checked on a computer against the app's encoder (test_host/check.cpp).
// Must match src/ble/protocol.ts and src/signal/packet.ts in the app.
#pragma once
#include <stdint.h>
#include <string.h>

namespace tara {

// 128-bit UUIDs (app: src/ble/protocol.ts UUIDS)
static const char* SERVICE_UUID = "7a1a0001-5f3e-4b8a-9d2c-1e6f0a7b3c00";
static const char* METRICS_UUID = "7a1a0002-5f3e-4b8a-9d2c-1e6f0a7b3c00";
static const char* STATUS_UUID = "7a1a0003-5f3e-4b8a-9d2c-1e6f0a7b3c00";
static const char* CONTROL_UUID = "7a1a0004-5f3e-4b8a-9d2c-1e6f0a7b3c00";

static const uint8_t PROTOCOL_VERSION = 1;
static const uint8_t METRICS_BYTES = 14;
static const uint8_t STATUS_BYTES = 6;
static const int16_t TEMP_NONE = 0x7FFF;

enum Opcode : uint8_t { COOL_ON = 0x01, COOL_OFF = 0x02, BLINK = 0x03, PING = 0x04 };
enum Cooling : uint8_t { OFF = 0, ON = 1, LOCKED_BATTERY = 2, LOCKED_REST = 3, FAULT = 4 };

// Firmware limits — the last line of safety (07 §2.5): firmware is the authority for cooling.
static const uint16_t MAX_DURATION_S = 1200;   // one COOL_ON never longer than 20 min
static const uint32_t MAX_CONTINUOUS_S = 1200; // then a rest
static const uint32_t REST_S = 300;            // 5 min rest
static const uint8_t BATTERY_LOCK_PCT = 10;    // no cooling at or below 10 %

/** CRC-8/SMBUS: poly 0x07, init 0x00, no reflection (07 §2.3 🟡). */
inline uint8_t crc8(const uint8_t* bytes, size_t length) {
  uint8_t crc = 0;
  for (size_t i = 0; i < length; i++) {
    crc ^= bytes[i];
    for (int bit = 0; bit < 8; bit++) crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x07) : (uint8_t)(crc << 1);
  }
  return crc;
}

struct Metrics {
  uint16_t seq;
  uint16_t theta, alpha, beta;
  uint8_t fit;      // 0–100
  float skinTempC;  // ignored when hasTemp is false ("no sensor")
  bool hasTemp;
  bool motion, saturated;
};

inline void put16(uint8_t* b, uint16_t v) {
  b[0] = v & 0xFF;
  b[1] = v >> 8;
}

/** 14-byte little-endian metrics packet (07 §2.3). */
inline void encodeMetrics(const Metrics& m, uint8_t out[METRICS_BYTES]) {
  out[0] = PROTOCOL_VERSION;
  put16(out + 1, m.seq);
  put16(out + 3, m.theta);
  put16(out + 5, m.alpha);
  put16(out + 7, m.beta);
  out[9] = m.fit > 100 ? 100 : m.fit;
  int16_t t = m.hasTemp ? (int16_t)(m.skinTempC * 100.0f + (m.skinTempC >= 0 ? 0.5f : -0.5f)) : TEMP_NONE;
  put16(out + 10, (uint16_t)t);
  out[12] = (m.motion ? 0x01 : 0) | (m.saturated ? 0x02 : 0);
  out[13] = crc8(out, 13);
}

/** Cooling state machine — mirrors the app's firmware simulator (src/demo/firmware.ts). */
struct CoolingGuard {
  uint8_t batteryPct = 100;
  Cooling state = OFF;
  uint32_t remainingS = 0;
  uint32_t continuousS = 0;
  uint32_t restRemainingS = 0;

  void coolOn(uint32_t durationS) {
    if (batteryPct <= BATTERY_LOCK_PCT) {
      state = LOCKED_BATTERY;
      remainingS = 0;
      return;
    }
    if (restRemainingS > 0) {
      state = LOCKED_REST;
      return;
    }
    uint32_t allowed = durationS;
    if (allowed > MAX_DURATION_S) allowed = MAX_DURATION_S;
    if (allowed > MAX_CONTINUOUS_S - continuousS) allowed = MAX_CONTINUOUS_S - continuousS;
    if (allowed > 0) {
      state = ON;
      remainingS = allowed;
    }
  }

  void coolOff() {
    if (state == ON) {
      state = OFF;
      remainingS = 0;
      continuousS = 0;
    }
  }

  /** Called once per second, with or without a phone connected. */
  void tick(uint8_t battery) {
    batteryPct = battery;
    if (state == ON) {
      if (battery <= BATTERY_LOCK_PCT) {
        state = LOCKED_BATTERY;
        remainingS = 0;
        continuousS = 0;
        return;
      }
      continuousS++;
      if (continuousS >= MAX_CONTINUOUS_S) {
        state = LOCKED_REST;
        remainingS = 0;
        continuousS = 0;
        restRemainingS = REST_S;
        return;
      }
      remainingS = remainingS > 1 ? remainingS - 1 : 0;
      if (remainingS == 0) {
        state = OFF;
        continuousS = 0;
      }
      return;
    }
    if (state == LOCKED_REST) {
      restRemainingS = restRemainingS > 1 ? restRemainingS - 1 : 0;
      if (restRemainingS == 0) state = OFF;
      return;
    }
    if (state == LOCKED_BATTERY && battery > BATTERY_LOCK_PCT) state = OFF;
  }

  bool isDriving() const { return state == ON; }
};

/** 6-byte status packet (07 §2.4). */
inline void encodeStatus(const CoolingGuard& g, uint8_t faults, uint8_t out[STATUS_BYTES]) {
  uint16_t remaining = g.remainingS > 0xFFFF ? 0xFFFF : (uint16_t)g.remainingS;
  out[0] = PROTOCOL_VERSION;
  out[1] = g.batteryPct > 100 ? 100 : g.batteryPct;
  out[2] = (uint8_t)g.state;
  put16(out + 3, remaining);
  out[5] = faults;
}

}  // namespace tara
