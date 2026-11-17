// The ESP32 firmware and the app must speak byte-identical packets (07 §2). These hex strings are printed by
// firmware/test_host/check.cpp (compiled from the same header the ESP32 uses); CI rebuilds it and compares.
import { encodeMetrics } from '../../signal/packet';
import { encodeStatus } from '../protocol';

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

export const FIRMWARE_METRICS_HEX = '010102e803b004600958800d00d7';
export const FIRMWARE_STATUS_HEX = '015001580200';

describe('app ↔ firmware packet parity', () => {
  test('metrics: seq 513, θ 1000, α 1200, β 2400, fit 88, 34.56 °C', () => {
    const bytes = encodeMetrics({ seq: 513, theta: 1000, alpha: 1200, beta: 2400, fit: 88, skinTempC: 34.56, motion: false, saturated: false });
    expect(hex(bytes)).toBe(FIRMWARE_METRICS_HEX);
  });

  test('status: battery 80 %, cooling on, 600 s left', () => {
    expect(hex(encodeStatus({ batteryPct: 80, cooling: 'on', coolingRemainingS: 600, faults: 0 }))).toBe(FIRMWARE_STATUS_HEX);
  });
});
