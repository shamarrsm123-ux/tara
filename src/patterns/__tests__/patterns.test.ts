import { detectPatterns, localDayIndex, usableDaySet, type EventRow, type MinuteRow } from '../detect';
import { acceptPattern, declinePattern, reconcilePatterns, supportFor, type PatternRecord } from '../lifecycle';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
// Local-time epoch ms (05 §2): Mon 2 Nov 2026 00:00 local.
const MONDAY = Date.UTC(2026, 10, 2);
const TODAY = new Date(2026, 10, 9);

const at = (day: number, hh: number, mm: number) => MONDAY + day * DAY + (hh * 60 + mm) * MIN;
const start = (day: number, hh: number, mm: number): EventRow => ({ ts: at(day, hh, mm), type: 'high_episode_start' });

/** 150 valid minutes from 08:00 on each given day (≥ 120 → usable). */
const usableDays = (days: number[], validMinutes = 150): MinuteRow[] =>
  days.flatMap((d) =>
    Array.from({ length: validMinutes }, (_, i) => ({
      tsMinute: at(d, 8, 0) + i * MIN,
      stressMean: 40,
      stressMax: 50,
      validSeconds: 60,
      zone: 'calm' as const,
      coolingOn: false,
    })),
  );

describe('pattern detection (07 §6, 12 §2.3)', () => {
  test('the worked example → pattern 14:00, reminder 13:30', () => {
    const events = [start(0, 14, 5), start(1, 13, 52), start(3, 14, 20), start(5, 14, 10)];
    const result = detectPatterns(events, usableDays([0, 1, 2, 3, 4, 5]), TODAY);
    expect(result).toEqual({ usableDays: 6, needMoreDays: false, patterns: [{ patternMin: 14 * 60, reminderMin: 13 * 60 + 30, matchingDays: 4 }] });
  });

  test('fewer than 4 usable days → "I need more days"', () => {
    const events = [start(0, 14, 0), start(1, 14, 0), start(2, 14, 0)];
    expect(detectPatterns(events, usableDays([0, 1, 2]), TODAY)).toEqual({ usableDays: 3, patterns: [], needMoreDays: true });
  });

  test('days with < 120 valid minutes are not usable', () => {
    expect(detectPatterns([], usableDays([0, 1, 2, 3], 119), TODAY).usableDays).toBe(0);
  });

  test('2 matching days → no pattern; 3 → pattern', () => {
    const minutes = usableDays([0, 1, 2, 3, 4]);
    expect(detectPatterns([start(0, 10, 0), start(1, 10, 10)], minutes, TODAY).patterns).toEqual([]);
    expect(detectPatterns([start(0, 10, 0), start(1, 10, 10), start(2, 10, 20)], minutes, TODAY).patterns).toHaveLength(1);
  });

  test('keeps the top 2 non-overlapping windows', () => {
    const events = [
      ...[0, 1, 2].map((d) => start(d, 9, 10)),
      ...[0, 1, 2, 3].map((d) => start(d, 14, 5)),
      ...[0, 1, 2].map((d) => start(d, 17, 40)),
    ];
    const result = detectPatterns(events, usableDays([0, 1, 2, 3, 4]), TODAY);
    expect(result.patterns.map((p) => p.patternMin)).toEqual([9 * 60, 14 * 60]);
  });

  test('ignores episodes on unusable days and before 06:00', () => {
    const events = [start(0, 5, 0), start(1, 5, 0), start(2, 5, 0), start(6, 14, 0), start(7, 14, 0)];
    expect(detectPatterns(events, usableDays([0, 1, 2, 3]), TODAY).patterns).toEqual([]);
  });

  test('only the first start per day counts toward a window', () => {
    const events = [start(0, 14, 0), start(0, 14, 20), start(0, 14, 40), start(1, 14, 0)];
    expect(detectPatterns(events, usableDays([0, 1, 2, 3]), TODAY).patterns).toEqual([]);
  });

  test('ignores data after today', () => {
    expect(usableDaySet(usableDays([0, 7, 8]), localDayIndex(TODAY)).size).toBe(2);
  });
});

describe('pattern lifecycle (11 §6, 12 §2.3)', () => {
  const NOW = MONDAY + 7 * DAY;
  const accepted: PatternRecord = { slotStartMin: 840, matchingDays: 4, status: 'accepted', declinedUntilMs: null };

  test('fades when current matches drop below 2', () => {
    const r = reconcilePatterns([accepted], [], () => 1, NOW);
    expect(r.newlyFaded).toEqual([{ ...accepted, status: 'faded' }]);
    expect(reconcilePatterns([accepted], [], () => 2, NOW).newlyFaded).toEqual([]);
  });

  test('a new detection is offered', () => {
    const r = reconcilePatterns([], [{ patternMin: 840, reminderMin: 810, matchingDays: 3 }], () => 3, NOW);
    expect(r.newlyOffered).toEqual([{ slotStartMin: 840, matchingDays: 3, status: 'offered', declinedUntilMs: null }]);
  });

  test('an accepted pattern is not offered again', () => {
    const r = reconcilePatterns([accepted], [{ patternMin: 840, reminderMin: 810, matchingDays: 4 }], () => 4, NOW);
    expect(r.newlyOffered).toEqual([]);
  });

  test('decline suppresses re-offers for 7 days', () => {
    const declined = declinePattern({ ...accepted, status: 'offered' }, NOW);
    const detected = [{ patternMin: 840, reminderMin: 810, matchingDays: 4 }];
    expect(reconcilePatterns([declined], detected, () => 4, NOW + 6 * DAY).newlyOffered).toEqual([]);
    expect(reconcilePatterns([declined], detected, () => 4, NOW + 7 * DAY).newlyOffered).toHaveLength(1);
  });

  test('accepting clears any decline', () => {
    expect(acceptPattern(declinePattern(accepted, NOW))).toEqual(accepted);
  });

  test('support counts usable days with a start within ±30 min of the pattern time', () => {
    const events = [start(0, 13, 35), start(1, 14, 25), start(2, 14, 31)];
    const usable = usableDaySet(usableDays([0, 1, 2]), localDayIndex(TODAY));
    expect(supportFor(840, events, usable)).toBe(2);
  });
});
