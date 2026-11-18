import {
  cycleDayOf,
  cycleStatus,
  cycleSupportFor,
  cycleTuning,
  daysBefore,
  estimatedDay1For,
  learnedCycleLength,
  mergeCycleStart,
  phaseForDay,
  phaseOnDay,
  phaseStartDay,
  type CyclePhase,
} from '../cycle';
import { CALM_HIGH, events, has, Rig } from './harness';

const NOW = new Date(2026, 10, 17, 12, 0).getTime();
const start = (daysAgo: number, isEstimated = false) => ({ dayMs: daysBefore(NOW, daysAgo), isEstimated });

describe('cycle phases (07 §10.1)', () => {
  test('28-day cycle: menstrual 1–5, follicular 6–12, ovulatory 13–15, early luteal 16–21, late luteal 22–28', () => {
    const expected: [number, CyclePhase][] = [
      [1, 'menstrual'],
      [5, 'menstrual'],
      [6, 'follicular'],
      [12, 'follicular'],
      [13, 'ovulatory'],
      [15, 'ovulatory'],
      [16, 'earlyLuteal'],
      [21, 'earlyLuteal'],
      [22, 'lateLuteal'],
      [28, 'lateLuteal'],
    ];
    expected.forEach(([day, phase]) => expect(phaseForDay(day, 28)).toBe(phase));
  });

  test('a short (21-day) cycle has no follicular days left; a long (35-day) one keeps a 14-day luteal phase', () => {
    expect(phaseForDay(6, 21)).toBe('ovulatory');
    expect(phaseForDay(15, 21)).toBe('lateLuteal');
    expect(phaseForDay(20, 35)).toBe('ovulatory');
    expect(phaseForDay(29, 35)).toBe('lateLuteal');
  });

  test('a late period stays late luteal for up to 10 extra days, then the phase is unknown', () => {
    expect(phaseForDay(38, 28)).toBe('lateLuteal');
    expect(phaseForDay(39, 28)).toBeNull();
    expect(phaseForDay(0, 28)).toBeNull();
  });

  test('every phase starts on the day phaseStartDay says', () => {
    (['menstrual', 'follicular', 'ovulatory', 'earlyLuteal', 'lateLuteal'] as const).forEach((phase) => {
      expect(phaseForDay(phaseStartDay(phase, 28), 28)).toBe(phase);
    });
  });

  test('cycle day counts calendar days, not 24 h blocks', () => {
    const lateEvening = new Date(2026, 10, 1, 23, 59).getTime();
    const nextMorning = new Date(2026, 10, 2, 0, 1).getTime();
    expect(cycleDayOf(new Date(2026, 10, 1).getTime(), lateEvening)).toBe(1);
    expect(cycleDayOf(new Date(2026, 10, 1).getTime(), nextMorning)).toBe(2);
  });
});

describe('support level (07 §10.2)', () => {
  test('more in late luteal and the first 2 menstrual days, some in early luteal, none otherwise', () => {
    expect(cycleSupportFor('lateLuteal', 24)).toBe('more');
    expect(cycleSupportFor('menstrual', 2)).toBe('more');
    expect(cycleSupportFor('menstrual', 3)).toBe('none');
    expect(cycleSupportFor('earlyLuteal', 17)).toBe('some');
    expect(cycleSupportFor('follicular', 8)).toBe('none');
    expect(cycleSupportFor(null, null)).toBe('none');
  });

  test('tuning: more = threshold 65, 0.75× hold, 20 min auto gap; none = the usual 70 / 1× / 30', () => {
    expect(cycleTuning('none')).toEqual({ highMinS: 70, sustainFactor: 1, autoGapMin: 30 });
    expect(cycleTuning('some')).toEqual({ highMinS: 67, sustainFactor: 1, autoGapMin: 30 });
    expect(cycleTuning('more')).toEqual({ highMinS: 65, sustainFactor: 0.75, autoGapMin: 20 });
  });
});

describe('cycle status (07 §10.1)', () => {
  test('nothing logged → no phase, no support', () => {
    expect(cycleStatus([], 28, NOW)).toMatchObject({ phase: null, support: 'none', cycleDay: null });
  });

  test('day 1 logged 22 days ago → day 23, late luteal, more support', () => {
    expect(cycleStatus([start(22)], 28, NOW)).toMatchObject({ phase: 'lateLuteal', cycleDay: 23, support: 'more', isLate: false });
  });

  test('heads-up the day before late luteal starts', () => {
    expect(cycleStatus([start(20)], 28, NOW).daysUntilLateLuteal).toBe(1);
    expect(cycleStatus([start(19)], 28, NOW).daysUntilLateLuteal).toBeNull();
  });

  test('past the expected day 1 → still late luteal, marked late', () => {
    expect(cycleStatus([start(30)], 28, NOW)).toMatchObject({ phase: 'lateLuteal', isLate: true });
  });

  test('cycle length is learned from real day-1 gaps and ignores estimated or implausible ones', () => {
    expect(learnedCycleLength([start(64), start(32), start(0)], 28)).toBe(32);
    expect(learnedCycleLength([start(64), start(32, true), start(0)], 28)).toBe(28); // 64-day gap is implausible
    expect(learnedCycleLength([start(0)], 30)).toBe(30);
  });

  test('"correct my phase" picks a day 1 that makes today the first day of that phase', () => {
    const day1 = estimatedDay1For('lateLuteal', 28, NOW);
    expect(cycleStatus([{ dayMs: day1, isEstimated: true }], 28, NOW)).toMatchObject({ phase: 'lateLuteal', cycleDay: 22 });
  });

  test('"correct my phase" replaces the latest day 1 even when it moves it more than 15 days back', () => {
    // Regression (found in the web preview 2026-11-17): logged 3 days ago, then "I am in my late luteal phase".
    const corrected = mergeCycleStart([start(3)], { dayMs: estimatedDay1For('lateLuteal', 28, NOW), isEstimated: true });
    expect(corrected).toHaveLength(1);
    expect(cycleStatus(corrected, 28, NOW).phase).toBe('lateLuteal');
  });

  test('a real day 1 more than 15 days after the latest starts a new cycle; one within 15 days corrects it', () => {
    expect(mergeCycleStart([start(30)], start(0))).toHaveLength(2);
    expect(mergeCycleStart([start(5)], start(3))).toEqual([start(3)]);
  });

  test('phase on a past day uses only the starts logged by then', () => {
    const starts = [start(30), start(2)];
    expect(phaseOnDay(starts, 28, daysBefore(NOW, 5))).toBe('lateLuteal');
    expect(phaseOnDay(starts, 28, NOW)).toBe('menstrual');
  });
});

describe('engine with cycle support (07 §10.3)', () => {
  const MILD_HIGH = 33; // S = 67: below the usual 70, above the "more" threshold of 65

  test('with no support, S = 67 never starts an episode', () => {
    const rig = new Rig();
    expect(events(rig.ticks(300, MILD_HIGH))).not.toContain('high_episode_start');
  });

  test('with more support, S = 67 starts an episode, after 45 s instead of 60 s', () => {
    const rig = new Rig();
    rig.send({ t: 'cycleSupport', support: 'more' });
    expect(events(rig.ticks(45, MILD_HIGH))).not.toContain('high_episode_start');
    expect(events(rig.ticks(1, MILD_HIGH))).toContain('high_episode_start');
    expect(rig.engine.snapshot().cycleSupport).toBe('more');
  });

  test('"alert me less today" overrides cycle support', () => {
    const rig = new Rig();
    rig.send({ t: 'cycleSupport', support: 'more' });
    rig.ticks(46, CALM_HIGH);
    ['no', 'no', 'no'].forEach(() => {
      rig.send({ t: 'promptAnswer', yes: false });
      rig.advance(16 * 60_000);
      rig.ticks(1, CALM_HIGH);
    });
    rig.send({ t: 'alertLessAnswer', yes: true });
    rig.ticks(120, 60); // calm down, end the episode
    expect(events(rig.ticks(300, MILD_HIGH))).not.toContain('high_episode_start');
  });

  test('auto mode with more support: the next auto-cool may come after 20 min, not 30', () => {
    const rig = new Rig({ coolingMode: 'auto' });
    rig.send({ t: 'cycleSupport', support: 'more' });
    rig.status('off');
    expect(has(rig.ticks(46, CALM_HIGH), 'coolOn')).toBe(true);
    rig.status('on');
    rig.send({ t: 'userCool', on: false });
    rig.status('off');
    rig.advance(19 * 60_000);
    expect(has(rig.ticks(30, CALM_HIGH), 'coolOn')).toBe(false);
    rig.advance(60_000);
    expect(has(rig.ticks(5, CALM_HIGH), 'coolOn')).toBe(true);
  });
});
