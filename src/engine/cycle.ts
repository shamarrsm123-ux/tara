// Menstrual phase and cycle-aware support (07 §10). Pure: from her logged day-1 dates and cycle length, which
// phase today is in and how much earlier cooling should be offered. Calendar days are local dates, so a DST
// change never shifts a phase. The Calm meter is not affected — only when an episode is called (07 §10.3).
import {
  CYCLE_AUTO_GAP_MIN,
  CYCLE_CORRECTION_WINDOW_DAYS,
  CYCLE_HEADS_UP_DAYS,
  CYCLE_HIGH_SHIFT_S,
  CYCLE_LATE_LUTEAL_DAYS,
  CYCLE_LENGTH_MAX_DAYS,
  CYCLE_LENGTH_MIN_DAYS,
  CYCLE_LUTEAL_DAYS,
  CYCLE_MENSTRUAL_DAYS,
  CYCLE_MENSTRUAL_SUPPORT_DAYS,
  CYCLE_OVULATORY_HALF_WINDOW_DAYS,
  CYCLE_STALE_LATE_DAYS,
  CYCLE_STARTS_KEPT,
  CYCLE_SUSTAIN_FACTOR,
  ZONE_HIGH_MIN_S,
} from './constants';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'earlyLuteal' | 'lateLuteal';
export const CYCLE_PHASES: readonly CyclePhase[] = ['menstrual', 'follicular', 'ovulatory', 'earlyLuteal', 'lateLuteal'];

/** none = usual triggers · some = early luteal (warmer body) · more = late luteal and first menstrual days. */
export type CycleSupport = 'none' | 'some' | 'more';

export interface CycleStart {
  /** Local midnight of day 1. */
  dayMs: number;
  /** Implied by "correct my phase", not logged as a real day 1; never used to learn the length. */
  isEstimated: boolean;
}

export interface CycleStatus {
  phase: CyclePhase | null;
  /** 1-based day of the cycle; null when nothing logged or too stale. */
  cycleDay: number | null;
  lengthDays: number;
  support: CycleSupport;
  /** Past the expected next day 1 (still treated as late luteal). */
  isLate: boolean;
  /** Days until the late luteal phase starts, when that is soon (≤ heads-up days); else null. */
  daysUntilLateLuteal: number | null;
}

export interface CycleTuning {
  highMinS: number;
  sustainFactor: number;
  autoGapMin: number;
}

const DAY_MS = 86_400_000;

/** Local calendar date as a day number, immune to DST. */
function dayNumber(epochMs: number): number {
  const d = new Date(epochMs);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

/** Local midnight of the day holding `epochMs`. */
export function localMidnight(epochMs: number): number {
  const d = new Date(epochMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Local midnight `days` calendar days before the day holding `epochMs`. */
export function daysBefore(epochMs: number, days: number): number {
  const d = new Date(epochMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - days).getTime();
}

export const isValidCycleLength = (days: number): boolean => Number.isInteger(days) && days >= CYCLE_LENGTH_MIN_DAYS && days <= CYCLE_LENGTH_MAX_DAYS;

/** 1-based cycle day of `nowMs` for a cycle that started on `day1Ms`. */
export function cycleDayOf(day1Ms: number, nowMs: number): number {
  return dayNumber(nowMs) - dayNumber(day1Ms) + 1;
}

const ovulationDay = (lengthDays: number) => lengthDays - CYCLE_LUTEAL_DAYS;
const lateLutealStart = (lengthDays: number) => lengthDays - CYCLE_LATE_LUTEAL_DAYS + 1;

/** Phase for a cycle day; days past the expected length stay late luteal until stale, then null. */
export function phaseForDay(cycleDay: number, lengthDays: number): CyclePhase | null {
  if (cycleDay < 1 || cycleDay > lengthDays + CYCLE_STALE_LATE_DAYS) return null;
  if (cycleDay <= CYCLE_MENSTRUAL_DAYS) return 'menstrual';
  if (cycleDay >= lateLutealStart(lengthDays)) return 'lateLuteal';
  const ov = ovulationDay(lengthDays);
  if (Math.abs(cycleDay - ov) <= CYCLE_OVULATORY_HALF_WINDOW_DAYS) return 'ovulatory';
  return cycleDay < ov ? 'follicular' : 'earlyLuteal';
}

/** First cycle day of a phase (used by "correct my phase"). */
export function phaseStartDay(phase: CyclePhase, lengthDays: number): number {
  const ov = ovulationDay(lengthDays);
  const starts: Record<CyclePhase, number> = {
    menstrual: 1,
    follicular: CYCLE_MENSTRUAL_DAYS + 1,
    ovulatory: Math.max(CYCLE_MENSTRUAL_DAYS + 1, ov - CYCLE_OVULATORY_HALF_WINDOW_DAYS),
    earlyLuteal: ov + CYCLE_OVULATORY_HALF_WINDOW_DAYS + 1,
    lateLuteal: lateLutealStart(lengthDays),
  };
  return starts[phase];
}

export function cycleSupportFor(phase: CyclePhase | null, cycleDay: number | null): CycleSupport {
  if (phase === 'lateLuteal') return 'more';
  if (phase === 'menstrual' && cycleDay !== null && cycleDay <= CYCLE_MENSTRUAL_SUPPORT_DAYS) return 'more';
  if (phase === 'earlyLuteal') return 'some';
  return 'none';
}

/** Average gap between consecutive real day-1 dates, when plausible; otherwise her setting. */
export function learnedCycleLength(starts: readonly CycleStart[], fallbackDays: number): number {
  const real = starts.filter((s) => !s.isEstimated).map((s) => dayNumber(s.dayMs)).toSorted((a, b) => a - b);
  const gaps = real.slice(1).map((d, i) => d - (real[i] ?? d)).filter(isValidCycleLength);
  if (gaps.length === 0) return fallbackDays;
  return Math.round(gaps.reduce((sum, g) => sum + g, 0) / gaps.length);
}

const NO_CYCLE = (lengthDays: number): CycleStatus => ({ phase: null, cycleDay: null, lengthDays, support: 'none', isLate: false, daysUntilLateLuteal: null });

/** Where she is in her cycle today. */
export function cycleStatus(starts: readonly CycleStart[], settingLengthDays: number, nowMs: number): CycleStatus {
  const lengthDays = learnedCycleLength(starts, settingLengthDays);
  const latest = starts.reduce<CycleStart | null>((acc, s) => (acc === null || s.dayMs > acc.dayMs ? s : acc), null);
  if (latest === null) return NO_CYCLE(lengthDays);
  const cycleDay = cycleDayOf(latest.dayMs, nowMs);
  const phase = phaseForDay(cycleDay, lengthDays);
  if (phase === null) return NO_CYCLE(lengthDays);
  const untilLate = lateLutealStart(lengthDays) - cycleDay;
  return {
    phase,
    cycleDay,
    lengthDays,
    support: cycleSupportFor(phase, cycleDay),
    isLate: cycleDay > lengthDays,
    daysUntilLateLuteal: untilLate > 0 && untilLate <= CYCLE_HEADS_UP_DAYS ? untilLate : null,
  };
}

/** Phase on a past day, for My Days. */
export function phaseOnDay(starts: readonly CycleStart[], settingLengthDays: number, dayMs: number): CyclePhase | null {
  const before = starts.filter((s) => dayNumber(s.dayMs) <= dayNumber(dayMs));
  return cycleStatus(before, settingLengthDays, dayMs).phase;
}

/** The day 1 that makes today the first day of `phase` ("correct my phase"). */
export function estimatedDay1For(phase: CyclePhase, lengthDays: number, nowMs: number): number {
  return daysBefore(nowMs, phaseStartDay(phase, lengthDays) - 1);
}

/** Trigger values for a support level (07 §10.3). */
export function cycleTuning(support: CycleSupport): CycleTuning {
  return {
    highMinS: ZONE_HIGH_MIN_S - CYCLE_HIGH_SHIFT_S[support],
    sustainFactor: CYCLE_SUSTAIN_FACTOR[support],
    autoGapMin: CYCLE_AUTO_GAP_MIN[support],
  };
}

/**
 * Adds a day 1 (05 §2.9): "correct my phase" (an estimated start) always replaces the latest one, and so does a
 * real date within 15 days of it; the same day twice is one start; only the latest 6 are kept. Returns a new,
 * ascending list.
 */
export function mergeCycleStart(existing: readonly CycleStart[], next: CycleStart): CycleStart[] {
  const sorted = existing.toSorted((a, b) => a.dayMs - b.dayMs);
  const latest = sorted.at(-1);
  const isNear = latest !== undefined && Math.abs(dayNumber(next.dayMs) - dayNumber(latest.dayMs)) < CYCLE_CORRECTION_WINDOW_DAYS;
  const isCorrection = latest !== undefined && (next.isEstimated || isNear);
  const kept = isCorrection ? sorted.slice(0, -1) : sorted;
  const merged = [...kept.filter((s) => dayNumber(s.dayMs) !== dayNumber(next.dayMs)), next].toSorted((a, b) => a.dayMs - b.dayMs);
  return merged.slice(-CYCLE_STARTS_KEPT);
}
