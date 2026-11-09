// Sensor fit and per-second validity (07 §2.7, §3). Pure.
import { FIT_ADJUST, FIT_GOOD, FIT_STABLE_S, SEQ_GAP_UNSTABLE, SIGNAL_UNSTABLE_S } from '../engine/constants';
import type { FitLevel, MetricsSample } from '../shared/types';

const MS_PER_S = 1000;
const SEQ_MODULO = 0x10000;

export function fitLevel(sample: Pick<MetricsSample, 'fit'>): FitLevel {
  if (sample.fit >= FIT_GOOD) return 'good';
  if (sample.fit >= FIT_ADJUST) return 'adjust';
  return 'none';
}

/** A "valid second" (07 §1): Good fit, no motion artifact, no saturation, and a defined band ratio. */
export function isValid(sample: MetricsSample): boolean {
  return (
    fitLevel(sample) === 'good' &&
    !sample.motion &&
    !sample.saturated &&
    sample.beta > 0 &&
    sample.alpha + sample.theta > 0
  );
}

/** Shows a fit level only after it has been stable for 3 s, so the chip doesn't flicker (07 §3). */
export class FitStabilizer {
  private candidate: { level: FitLevel; sinceMs: number } | null = null;
  private shown: FitLevel | null = null;

  push(level: FitLevel, nowMs: number): FitLevel | null {
    if (this.candidate === null || this.candidate.level !== level) {
      this.candidate = { level, sinceMs: nowMs };
    }
    if (nowMs - this.candidate.sinceMs >= FIT_STABLE_S * MS_PER_S) {
      this.shown = level;
    }
    return this.shown;
  }
}

/** Detects dropped packets: a seq gap > 5 marks the signal unstable for 10 s (07 §2.7). */
export class SeqTracker {
  private lastSeq: number | null = null;
  private unstableUntilMs = Number.NEGATIVE_INFINITY;

  /** Returns true while the signal is stable. */
  push(seq: number, nowMs: number): boolean {
    if (this.lastSeq !== null) {
      const dropped = (seq - this.lastSeq - 1 + SEQ_MODULO) % SEQ_MODULO;
      if (dropped > SEQ_GAP_UNSTABLE) {
        this.unstableUntilMs = nowMs + SIGNAL_UNSTABLE_S * MS_PER_S;
      }
    }
    this.lastSeq = seq;
    return nowMs >= this.unstableUntilMs;
  }
}
