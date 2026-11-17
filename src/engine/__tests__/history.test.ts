import { coolingBandsFromMinutes, pointsFromMinutes, summarizeDays } from '../history';

const day0 = new Date(2026, 10, 17, 0, 0).getTime();
const at = (dayOffset: number, h: number, m = 0) => new Date(2026, 10, 17 + dayOffset, h, m).getTime();
const row = (tsMinute: number, zone: 'calm' | 'rising' | 'high' | 'unknown', stressMean = 40, coolingOn = false) => ({
  tsMinute,
  stressMean,
  stressMax: stressMean,
  validSeconds: 60,
  zone,
  coolingOn,
  source: 'tarha' as const,
});

describe('My Days history (03 Flow 14, 02 §8.15)', () => {
  test('time in each zone per local day, oldest first, only within the shown days', () => {
    const minutes = [row(at(0, 9), 'calm'), row(at(0, 9, 1), 'high', 80), row(at(-1, 14), 'rising', 60), row(at(-9, 10), 'high', 80), row(at(0, 9, 2), 'unknown')];
    const days = summarizeDays(minutes, at(0, 12), 7);
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ dayStartMs: day0, calmMin: 1, risingMin: 0, highMin: 1 });
    expect(days[5]).toMatchObject({ risingMin: 1 });
    expect(days.reduce((n, d) => n + d.highMin, 0)).toBe(1); // the −9 d row is outside the 7 days
  });

  test('minutes become graph points (Calm = 100 − stress; unknown minutes are gaps)', () => {
    expect(pointsFromMinutes([row(at(0, 9), 'calm', 30), row(at(0, 9, 1), 'unknown', 50)])).toEqual([
      { tMs: at(0, 9) + 30_000, calm: 70 },
      { tMs: at(0, 9, 1) + 30_000, calm: null },
    ]);
  });

  test('consecutive cooling minutes merge into one blue band', () => {
    const minutes = [row(at(0, 9), 'high', 80, true), row(at(0, 9, 1), 'rising', 60, true), row(at(0, 9, 5), 'calm', 30, true)];
    expect(coolingBandsFromMinutes(minutes)).toEqual([
      { fromMs: at(0, 9), toMs: at(0, 9, 2) },
      { fromMs: at(0, 9, 5), toMs: at(0, 9, 6) },
    ]);
  });
});
