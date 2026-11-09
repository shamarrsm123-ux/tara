import { isTaraError } from '../../shared/errors';
import type { MetricsSample } from '../../shared/types';
import { Calibrator, median } from '../calibrator';
import { FitStabilizer, fitLevel, isValid, SeqTracker } from '../fit';
import { crc8, decodeMetrics, encodeMetrics, isPacketError, type MetricsFields } from '../packet';
import { DEFAULT_BASELINE, emaFactor, rawIndex, StressComputer, stressFromIndex, zoneForStress } from '../stress';

const FIELDS: MetricsFields = { seq: 7, theta: 400, alpha: 600, beta: 500, fit: 90, skinTempC: 33.25, motion: false, saturated: false };

const sample = (over: Partial<MetricsSample> = {}): MetricsSample => ({
  source: 'tarha',
  seq: 0,
  theta: 500,
  alpha: 500,
  beta: 1000,
  fit: 90,
  skinTempC: null,
  motion: false,
  saturated: false,
  receivedAtMono: 0,
  ...over,
});

/** alpha + theta = 1000, so x = ln(beta / 1000). */
const withIndex = (x: number, seq: number, over: Partial<MetricsSample> = {}) => sample({ beta: Math.round(1000 * Math.exp(x)), seq, ...over });

const fakeClock = () => {
  const c = { mono: 0, nowMs: () => 0, monotonicMs: () => c.mono };
  return c;
};

describe('packet decode (07 §2.3, 12 §2.1)', () => {
  test('round-trips every field', () => {
    const s = decodeMetrics(encodeMetrics(FIELDS), 'tarha', 123);
    expect(s).toEqual({ ...FIELDS, source: 'tarha', receivedAtMono: 123 });
  });

  test('CRC-8/SMBUS matches the standard check value', () => {
    expect(crc8(new TextEncoder().encode('123456789'))).toBe(0xf4);
  });

  test('wrong length is rejected', () => {
    expect(decodeMetrics(encodeMetrics(FIELDS).slice(0, 13), 'tarha', 0)).toMatchObject({ code: 'PACKET_INVALID', reason: 'length' });
  });

  test('bad CRC is rejected', () => {
    const bytes = encodeMetrics(FIELDS);
    bytes[5] = bytes[5]! ^ 0xff;
    expect(decodeMetrics(bytes, 'tarha', 0)).toMatchObject({ code: 'PACKET_INVALID', reason: 'crc' });
  });

  test('unsupported version is rejected with the protocol-version code', () => {
    const bytes = encodeMetrics(FIELDS);
    bytes[0] = 2;
    bytes[13] = crc8(bytes, 13);
    expect(decodeMetrics(bytes, 'tarha', 0)).toMatchObject({ code: 'BLE_PROTOCOL_VERSION', reason: 'version' });
  });

  test('all-zero bands are rejected', () => {
    expect(decodeMetrics(encodeMetrics({ ...FIELDS, theta: 0, alpha: 0, beta: 0 }), 'tarha', 0)).toMatchObject({ reason: 'zeroBands' });
  });

  test('saturation flag → invalid second', () => {
    const s = decodeMetrics(encodeMetrics({ ...FIELDS, saturated: true }), 'tarha', 0);
    expect(isPacketError(s)).toBe(false);
    expect(isValid(s as MetricsSample)).toBe(false);
  });

  test('motion flag → invalid second (07 §3)', () => {
    expect(isValid(decodeMetrics(encodeMetrics({ ...FIELDS, motion: true }), 'tarha', 0) as MetricsSample)).toBe(false);
  });

  test('no temperature sensor decodes to null', () => {
    expect(decodeMetrics(encodeMetrics({ ...FIELDS, skinTempC: null }), 'tarha', 0)).toMatchObject({ skinTempC: null });
  });

  test('trailing bytes on a supported version are ignored (07 §2.6)', () => {
    const longer = new Uint8Array([...encodeMetrics(FIELDS), 0xaa, 0xbb]);
    expect(isPacketError(decodeMetrics(longer, 'tarha', 0))).toBe(false);
  });

  test('the source tag travels with every sample', () => {
    expect(decodeMetrics(encodeMetrics(FIELDS), 'demo', 0)).toMatchObject({ source: 'demo' });
  });
});

describe('fit (07 §3)', () => {
  test.each([
    [39, 'none'],
    [40, 'adjust'],
    [69, 'adjust'],
    [70, 'good'],
  ] as const)('fit %i → %s', (fit, level) => {
    expect(fitLevel({ fit })).toBe(level);
  });

  test('only Good fit is a valid second', () => {
    expect(isValid(sample({ fit: 70 }))).toBe(true);
    expect(isValid(sample({ fit: 69 }))).toBe(false);
  });

  test('chip changes only after 3 s of a stable reading', () => {
    const f = new FitStabilizer();
    expect(f.push('good', 0)).toBeNull();
    expect(f.push('good', 3000)).toBe('good');
    expect(f.push('adjust', 3500)).toBe('good');
    expect(f.push('good', 4000)).toBe('good');
    expect(f.push('adjust', 4500)).toBe('good');
    expect(f.push('adjust', 7500)).toBe('adjust');
  });
});

describe('dropped packets (07 §2.7)', () => {
  test('5 dropped packets is fine, 6 is unstable for 10 s', () => {
    const t = new SeqTracker();
    t.push(10, 0);
    expect(t.push(16, 1000)).toBe(true); // 11..15 dropped = 5
    expect(t.push(23, 2000)).toBe(false); // 17..22 dropped = 6
    expect(t.push(24, 11_999)).toBe(false);
    expect(t.push(25, 12_000)).toBe(true);
  });

  test('handles seq wrap-around at 65535', () => {
    const t = new SeqTracker();
    t.push(65534, 0);
    expect(t.push(0, 1000)).toBe(true); // 65535 dropped = 1
    expect(t.push(10, 2000)).toBe(false); // 1..9 dropped = 9
  });
});

describe('stress mapping (07 §4, 12 §2.1)', () => {
  const base = { m: -0.5, s: 0.2, isDefault: false };

  test('at her baseline → S = 30 (Calm 70)', () => {
    expect(stressFromIndex(base.m, base)).toBeCloseTo(30);
  });

  test('z = 2 → S = 70', () => {
    expect(stressFromIndex(base.m + 2 * base.s, base)).toBeCloseTo(70);
  });

  test('clamps at 0 and 100', () => {
    expect(stressFromIndex(base.m - 10, base)).toBe(0);
    expect(stressFromIndex(base.m + 10, base)).toBe(100);
  });

  test.each([
    [50, 'calm'],
    [50.5, 'rising'],
    [69.9, 'rising'],
    [70, 'high'],
  ] as const)('S %d → %s', (s, zone) => {
    expect(zoneForStress(s)).toBe(zone);
  });

  test('raw index is ln(beta / (alpha + theta))', () => {
    expect(rawIndex({ theta: 500, alpha: 500, beta: 1000 })).toBeCloseTo(0);
  });

  test('default baseline is flagged as default', () => {
    expect(DEFAULT_BASELINE.isDefault).toBe(true);
  });
});

describe('EMA smoothing (07 §4.2)', () => {
  const unit = { m: 0, s: 1, isDefault: false };

  test('step response reaches ~63% after 10 s (τ = 10 s)', () => {
    const clock = fakeClock();
    const sc = new StressComputer(unit, clock);
    sc.push(withIndex(0, 0));
    let last = sc.push(withIndex(1, 1));
    for (let i = 2; i <= 10; i += 1) {
      clock.mono += 1000;
      last = sc.push(withIndex(1, i));
    }
    const xBar = ((last.stress as number) - 30) / 20;
    expect(xBar).toBeCloseTo(1 - Math.exp(-1), 2);
    expect(emaFactor()).toBeCloseTo(1 - Math.exp(-0.1));
  });

  test('resets after > 30 s without a valid second', () => {
    const clock = fakeClock();
    const sc = new StressComputer(unit, clock);
    sc.push(withIndex(0, 0));
    for (let i = 1; i <= 31; i += 1) {
      clock.mono += 1000;
      expect(sc.push(withIndex(0, i, { fit: 10 })).valid).toBe(false);
    }
    clock.mono += 1000;
    expect(sc.push(withIndex(1, 32)).stress).toBeCloseTo(50, 1);
  });

  test('does not reset after a short gap', () => {
    const clock = fakeClock();
    const sc = new StressComputer(unit, clock);
    sc.push(withIndex(0, 0));
    clock.mono += 5000;
    expect(sc.push(withIndex(1, 1)).stress).toBeLessThan(40);
  });

  test('invalid second → no stress, no calm, unknown zone', () => {
    expect(new StressComputer(unit, fakeClock()).push(sample({ fit: 50 }))).toEqual({ stress: null, calm: null, zone: 'unknown', valid: false });
  });

  test('calm is 100 − stress', () => {
    const r = new StressComputer(unit, fakeClock()).push(withIndex(0.5, 0));
    expect((r.calm as number) + (r.stress as number)).toBeCloseTo(100);
  });

  test('dropped packets make the next seconds invalid', () => {
    const clock = fakeClock();
    const sc = new StressComputer(unit, clock);
    sc.push(withIndex(0, 0));
    clock.mono += 1000;
    expect(sc.push(withIndex(0, 20)).valid).toBe(false);
  });
});

describe('calibration (07 §4.3, 12 §2.1)', () => {
  test('pauses on poor fit and needs 60 *valid* seconds', () => {
    const cal = new Calibrator();
    for (let i = 0; i < 59; i += 1) expect(cal.push(withIndex(0, i)).paused).toBe(false);
    expect(cal.push(withIndex(0, 59, { fit: 50 }))).toEqual({ progress: 59 / 60, paused: true });
    expect(() => cal.result()).toThrow();
    expect(cal.push(withIndex(0, 60)).progress).toBe(1);
  });

  test('throws CALIBRATION_INCOMPLETE before 60 valid seconds', () => {
    let caught: unknown = null;
    try {
      new Calibrator().result();
    } catch (e) {
      caught = e;
    }
    expect(isTaraError(caught, 'CALIBRATION_INCOMPLETE')).toBe(true);
  });

  test('median and MAD-based spread', () => {
    const cal = new Calibrator();
    const xs = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? -0.6 : -0.4));
    xs.forEach((x, i) => cal.push(withIndex(x, i)));
    const b = cal.result();
    expect(b.m).toBeCloseTo(-0.5, 2);
    expect(b.s).toBeCloseTo(1.4826 * 0.1, 2);
    expect(b.isDefault).toBe(false);
  });

  test('MAD floor applied when calibration is perfectly flat', () => {
    const cal = new Calibrator();
    for (let i = 0; i < 60; i += 1) cal.push(withIndex(-0.5, i));
    expect(cal.result().s).toBe(0.05);
  });

  test('median of even and odd lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(() => median([])).toThrow();
  });
});
