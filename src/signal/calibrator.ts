// Learn Your Calm (07 §4.3, 03 Flow 1b): 60 *valid* seconds; pauses while fit isn't Good.
// m = median(x), s = max(1.4826 · MAD(x), s_min).
import { BASELINE_SECONDS, S_MIN_SPREAD } from '../engine/constants';
import { TaraError } from '../shared/errors';
import type { MetricsSample } from '../shared/types';
import { isValid } from './fit';
import { rawIndex, type Baseline } from './stress';

/** Scales the median absolute deviation to a standard-deviation estimate for normal data. */
const MAD_TO_SIGMA = 1.4826;

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new TaraError('VALIDATION_ERROR', 'median of empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface CalibrationProgress {
  /** 0–1: fraction of the 60 valid seconds collected. */
  progress: number;
  paused: boolean;
}

export class Calibrator {
  private samples: readonly number[] = [];

  push(sample: MetricsSample): CalibrationProgress {
    const isGood = isValid(sample);
    if (isGood && this.samples.length < BASELINE_SECONDS) {
      this.samples = [...this.samples, rawIndex(sample)];
    }
    return { progress: this.samples.length / BASELINE_SECONDS, paused: !isGood };
  }

  result(): Baseline {
    if (this.samples.length < BASELINE_SECONDS) {
      throw new TaraError('CALIBRATION_INCOMPLETE');
    }
    const m = median(this.samples);
    const mad = median(this.samples.map((x) => Math.abs(x - m)));
    return { m, s: Math.max(MAD_TO_SIGMA * mad, S_MIN_SPREAD), isDefault: false };
  }
}
