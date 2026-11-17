// Minute summaries (05 §2.4, 03 Flow 7 step 3): per-second stress values are reduced to one row per minute in
// memory; only that row may be stored. Pure — the caller adds the source and hands it to the store. 🟡 A
// minute with no valid second produces no row (there is nothing to summarize).
import { zoneForStress } from '../signal/stress';
import type { Zone } from '../shared/types';
import { MINUTE_COOLING_MIN_S, MINUTE_ZONE_MIN_VALID_S } from './constants';

const MINUTE_MS = 60_000;

export interface SecondSample {
  tMs: number;
  /** Stress index S of a valid second; null when the second was not valid. */
  stress: number | null;
  isCooling: boolean;
}

export interface MinuteSummary {
  tsMinute: number;
  stressMean: number;
  stressMax: number;
  validSeconds: number;
  zone: Zone;
  coolingOn: boolean;
}

export interface MinuteState {
  tsMinute: number | null;
  sum: number;
  max: number;
  validSeconds: number;
  coolingSeconds: number;
}

export const emptyMinute = (): MinuteState => ({ tsMinute: null, sum: 0, max: 0, validSeconds: 0, coolingSeconds: 0 });

const minuteOf = (tMs: number) => Math.floor(tMs / MINUTE_MS) * MINUTE_MS;

/** The finished minute's summary, or null if it had no valid second. */
export function flushMinute(state: MinuteState): MinuteSummary | null {
  if (state.tsMinute === null || state.validSeconds === 0) return null;
  const mean = Math.round(state.sum / state.validSeconds);
  return {
    tsMinute: state.tsMinute,
    stressMean: mean,
    stressMax: Math.round(state.max),
    validSeconds: state.validSeconds,
    zone: state.validSeconds < MINUTE_ZONE_MIN_VALID_S ? 'unknown' : zoneForStress(mean),
    coolingOn: state.coolingSeconds >= MINUTE_COOLING_MIN_S,
  };
}

/** Adds one second; when it starts a new minute, the previous minute's summary is returned. */
export function addSecond(state: MinuteState, s: SecondSample): { state: MinuteState; completed: MinuteSummary | null } {
  const minute = minuteOf(s.tMs);
  const isNewMinute = state.tsMinute !== null && minute !== state.tsMinute;
  const base = state.tsMinute === null || isNewMinute ? { ...emptyMinute(), tsMinute: minute } : state;
  const next: MinuteState = {
    ...base,
    sum: base.sum + (s.stress ?? 0),
    max: s.stress === null ? base.max : Math.max(base.max, s.stress),
    validSeconds: base.validSeconds + (s.stress === null ? 0 : 1),
    coolingSeconds: base.coolingSeconds + (s.isCooling ? 1 : 0),
  };
  return { state: next, completed: isNewMinute ? flushMinute(state) : null };
}
