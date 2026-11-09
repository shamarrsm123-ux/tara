// Stress index (07 §4): x = ln(beta / (alpha + theta)), EMA (τ = 10 s), z vs her baseline,
// S = clamp(30 + 20·z, 0, 100), Calm = 100 − S. Per-second values live only in memory.
import {
  DEFAULT_BASELINE_M,
  DEFAULT_BASELINE_S,
  EMA_RESET_INVALID_S,
  EMA_TAU_S,
  STRESS_GAIN,
  STRESS_OFFSET,
  ZONE_CALM_MAX_S,
  ZONE_HIGH_MIN_S,
} from '../engine/constants';
import type { Clock, MetricsSample, Zone } from '../shared/types';
import { isValid, SeqTracker } from './fit';

export interface Baseline {
  m: number;
  s: number;
  isDefault: boolean;
}

/** Population default used when calibration is skipped (07 §4.3). */
export const DEFAULT_BASELINE: Baseline = { m: DEFAULT_BASELINE_M, s: DEFAULT_BASELINE_S, isDefault: true };

export interface StressReading {
  stress: number | null;
  calm: number | null;
  zone: Zone;
  valid: boolean;
}

const MS_PER_S = 1000;
const INVALID_READING: StressReading = { stress: null, calm: null, zone: 'unknown', valid: false };

export function rawIndex(sample: Pick<MetricsSample, 'theta' | 'alpha' | 'beta'>): number {
  return Math.log(sample.beta / (sample.alpha + sample.theta));
}

export function emaFactor(tauS: number = EMA_TAU_S): number {
  return 1 - Math.exp(-1 / tauS);
}

export function stressFromIndex(xBar: number, baseline: Baseline): number {
  const z = (xBar - baseline.m) / baseline.s;
  return Math.min(100, Math.max(0, STRESS_OFFSET + STRESS_GAIN * z));
}

/** Inverse of `stressFromIndex` (unclamped): the smoothed index that maps to stress S. Used by demo/. */
export function indexForStress(stress: number, baseline: Baseline): number {
  return baseline.m + (baseline.s * (stress - STRESS_OFFSET)) / STRESS_GAIN;
}

/** Zone from the stress index S (07 §4.5): Calm ≤ 50, Rising 51–69, High ≥ 70. */
export function zoneForStress(stress: number): Zone {
  if (stress <= ZONE_CALM_MAX_S) return 'calm';
  if (stress >= ZONE_HIGH_MIN_S) return 'high';
  return 'rising';
}

export class StressComputer {
  private readonly baseline: Baseline;
  private readonly clock: Clock;
  private readonly seq = new SeqTracker();
  private ema: number | null = null;
  private lastValidMs: number | null = null;

  constructor(baseline: Baseline, clock: Clock) {
    this.baseline = baseline;
    this.clock = clock;
  }

  push(sample: MetricsSample): StressReading {
    const nowMs = this.clock.monotonicMs();
    const isStable = this.seq.push(sample.seq, nowMs);
    if (!isStable || !isValid(sample)) return INVALID_READING;

    const hasLongGap = this.lastValidMs !== null && nowMs - this.lastValidMs > EMA_RESET_INVALID_S * MS_PER_S;
    const x = rawIndex(sample);
    this.ema = this.ema === null || hasLongGap ? x : this.ema + (x - this.ema) * emaFactor();
    this.lastValidMs = nowMs;

    const stress = stressFromIndex(this.ema, this.baseline);
    return { stress, calm: 100 - stress, zone: zoneForStress(stress), valid: true };
  }
}
