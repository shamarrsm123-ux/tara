// Host-side check of tara_protocol.h (no ESP32 needed): prints packets as hex so the app's test can compare them
// with its own encoders, and asserts the cooling safety limits. Build: c++ -std=c++17 -I../src check.cpp
#include <cassert>
#include <cstdio>
#include "tara_protocol.h"

using namespace tara;

static void hex(const char* label, const uint8_t* b, int n) {
  printf("%s ", label);
  for (int i = 0; i < n; i++) printf("%02x", b[i]);
  printf("\n");
}

int main() {
  uint8_t m[METRICS_BYTES];
  Metrics sample{513, 1000, 1200, 2400, 88, 34.56f, true, false, false};
  encodeMetrics(sample, m);
  hex("metrics", m, METRICS_BYTES);

  CoolingGuard g;
  g.batteryPct = 80;
  g.coolOn(600);
  uint8_t s[STATUS_BYTES];
  encodeStatus(g, 0, s);
  hex("status", s, STATUS_BYTES);

  // Firmware never cools longer than 20 min in one go, then rests 5 min — even with no phone connected.
  CoolingGuard c;
  c.batteryPct = 90;
  c.coolOn(5000);
  assert(c.remainingS == MAX_DURATION_S);
  for (int i = 0; i < 1199; i++) c.tick(90);
  assert(c.state == ON);
  c.tick(90);
  assert(c.state != ON);

  // Battery lockout at ≤ 10 %.
  CoolingGuard b;
  b.batteryPct = 10;
  b.coolOn(600);
  assert(b.state == LOCKED_BATTERY);
  CoolingGuard d;
  d.batteryPct = 50;
  d.coolOn(600);
  d.tick(9);
  assert(d.state == LOCKED_BATTERY && !d.isDriving());
  printf("ok\n");
  return 0;
}
