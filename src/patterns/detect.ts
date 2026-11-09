// Pattern detection (07 §6, 09 §5). Pure.
// Timestamps are "local-time epoch ms" (05 §2): epoch ms shifted by the UTC offset at write time, so the
// UTC calendar fields equal her local clock. That keeps day/minute math timezone-free and testable.
import {
  PATTERN_FIRST_SLOT_MIN,
  PATTERN_LAST_SLOT_MIN,
  PATTERN_MAX,
  PATTERN_MIN_MATCH_DAYS,
  PATTERN_MIN_USABLE_DAYS,
  PATTERN_ROUND_MIN,
  PATTERN_SLOT_STEP_MIN,
  PATTERN_USABLE_DAY_VALID_MIN,
  PATTERN_WINDOW_MIN,
  REMINDER_LEAD_MIN,
} from '../engine/constants';
import { median } from '../signal/calibrator';
import type { EventType, Zone } from '../shared/types';

export interface MinuteRow {
  tsMinute: number;
  stressMean: number;
  stressMax: number;
  validSeconds: number;
  zone: Zone;
  coolingOn: boolean;
}

export interface EventRow {
  ts: number;
  type: EventType;
  source?: 'manual' | 'auto' | 'prompt' | null;
}

export interface DetectedPattern {
  patternMin: number;
  reminderMin: number;
  matchingDays: number;
}

export interface PatternResult {
  usableDays: number;
  patterns: DetectedPattern[];
  needMoreDays: boolean;
}

const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 24 * 60;
const MS_PER_DAY = MIN_PER_DAY * MS_PER_MIN;

export const dayOf = (localMs: number) => Math.floor(localMs / MS_PER_DAY);
export const minuteOfDay = (localMs: number) => Math.floor((localMs - dayOf(localMs) * MS_PER_DAY) / MS_PER_MIN);

/** The local calendar day of `todayLocal`, on the same day numbering as `dayOf`. */
export const localDayIndex = (todayLocal: Date) =>
  Math.floor(Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()) / MS_PER_DAY);

/**
 * Days with ≥ 120 valid minutes (07 §6.1). 🟡 A "valid minute" is a minute_summary row whose zone isn't
 * `unknown`, i.e. ≥ 30 valid seconds (05 §2.4).
 */
export function usableDaySet(minutes: readonly MinuteRow[], lastDay: number): ReadonlySet<number> {
  const counts = minutes
    .filter((m) => m.zone !== 'unknown' && dayOf(m.tsMinute) <= lastDay)
    .reduce<ReadonlyMap<number, number>>((acc, m) => new Map(acc).set(dayOf(m.tsMinute), (acc.get(dayOf(m.tsMinute)) ?? 0) + 1), new Map());
  return new Set([...counts].filter(([, n]) => n >= PATTERN_USABLE_DAY_VALID_MIN).map(([day]) => day));
}

/** First high-episode start per usable day inside [fromMin, fromMin + windowMin). */
export function matchingStarts(events: readonly EventRow[], usable: ReadonlySet<number>, fromMin: number, windowMin: number): number[] {
  const firstByDay = events
    .filter((e) => e.type === 'high_episode_start' && usable.has(dayOf(e.ts)))
    .map((e) => ({ day: dayOf(e.ts), min: minuteOfDay(e.ts) }))
    .filter((e) => e.min >= fromMin && e.min < fromMin + windowMin)
    .reduce<ReadonlyMap<number, number>>((acc, e) => (acc.has(e.day) && acc.get(e.day)! <= e.min ? acc : new Map(acc).set(e.day, e.min)), new Map());
  return [...firstByDay.values()];
}

function candidateSlots(): number[] {
  const count = (PATTERN_LAST_SLOT_MIN - PATTERN_FIRST_SLOT_MIN) / PATTERN_SLOT_STEP_MIN + 1;
  return Array.from({ length: count }, (_, i) => PATTERN_FIRST_SLOT_MIN + i * PATTERN_SLOT_STEP_MIN);
}

export function detectPatterns(events: readonly EventRow[], minutes: readonly MinuteRow[], todayLocal: Date): PatternResult {
  const usable = usableDaySet(minutes, localDayIndex(todayLocal));
  if (usable.size < PATTERN_MIN_USABLE_DAYS) return { usableDays: usable.size, patterns: [], needMoreDays: true };

  const ranked = candidateSlots()
    .map((slot) => ({ slot, starts: matchingStarts(events, usable, slot, PATTERN_WINDOW_MIN) }))
    .filter((c) => c.starts.length >= PATTERN_MIN_MATCH_DAYS)
    .sort((a, b) => b.starts.length - a.starts.length || a.slot - b.slot);

  const chosen = ranked.reduce<typeof ranked>(
    (acc, c) => (acc.length < PATTERN_MAX && acc.every((p) => Math.abs(p.slot - c.slot) >= PATTERN_WINDOW_MIN) ? [...acc, c] : acc),
    [],
  );

  const patterns = chosen
    .map((c) => {
      const patternMin = Math.floor(median(c.starts) / PATTERN_ROUND_MIN) * PATTERN_ROUND_MIN;
      return { patternMin, reminderMin: (patternMin - REMINDER_LEAD_MIN + MIN_PER_DAY) % MIN_PER_DAY, matchingDays: c.starts.length };
    })
    .sort((a, b) => a.patternMin - b.patternMin);

  return { usableDays: usable.size, patterns, needMoreDays: false };
}
