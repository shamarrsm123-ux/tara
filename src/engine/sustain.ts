// "Condition held for W seconds with ≥ 80% valid seconds" (07 §5.1, §5.4). Pure.
import { VALID_FRACTION } from './constants';

export interface Sustain {
  startMs: number;
  ticks: number;
  hits: number;
}

/** hit = valid second meeting the condition; miss = valid second breaking it; invalid = no valid signal. */
export type SustainSample = 'hit' | 'miss' | 'invalid';
export type SustainOutcome = 'waiting' | 'met' | 'failed';

const MS_PER_S = 1000;

export function pushSustain(window: Sustain | null, sample: SustainSample, nowMs: number): Sustain | null {
  if (sample === 'miss') return null;
  if (window === null) return sample === 'hit' ? { startMs: nowMs, ticks: 1, hits: 1 } : null;
  return { ...window, ticks: window.ticks + 1, hits: window.hits + (sample === 'hit' ? 1 : 0) };
}

export function sustainOutcome(window: Sustain, nowMs: number, windowS: number): SustainOutcome {
  if (nowMs - window.startMs < windowS * MS_PER_S) return 'waiting';
  return window.hits / window.ticks >= VALID_FRACTION ? 'met' : 'failed';
}

export function classify(valid: boolean, stress: number | null, meets: (stress: number) => boolean): SustainSample {
  if (!valid || stress === null) return 'invalid';
  return meets(stress) ? 'hit' : 'miss';
}
