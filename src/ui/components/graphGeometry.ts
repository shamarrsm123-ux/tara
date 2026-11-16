// Pure geometry for the Live Graph (04 §9.2): maps time/Calm to SVG coordinates. No React.
import { CALM_ZONE_MIN_C, HIGH_ZONE_MAX_C } from '../../engine/constants';
import type { GraphPoint, TimeBand } from '../../shared/types';

export type { GraphPoint, TimeBand };

export interface GraphFrame {
  width: number;
  height: number;
  startMs: number;
  endMs: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 10) / 10;

export function xFor(tMs: number, frame: GraphFrame): number {
  return ((tMs - frame.startMs) / (frame.endMs - frame.startMs)) * frame.width;
}

export function yFor(calm: number, frame: GraphFrame): number {
  return (1 - clamp(calm, 0, 100) / 100) * frame.height;
}

export type BarZone = 'calm' | 'rising' | 'high';

export interface Bar {
  x: number;
  width: number;
  /** Mean Calm over the bucket; null = signal present but none of it valid (drawn as a grey dot). */
  calm: number | null;
  zone: BarZone | null;
}

/** Display color class for a bar's mean Calm (07 §4.5 thresholds). */
export function barZone(calm: number): BarZone {
  if (calm >= CALM_ZONE_MIN_C) return 'calm';
  if (calm <= HIGH_ZONE_MAX_C) return 'high';
  return 'rising';
}

/** One bar per bucket (04a D5); buckets with no samples at all are omitted. */
export function barSeries(points: readonly GraphPoint[], frame: GraphFrame, buckets: number): Bar[] {
  const bucketMs = (frame.endMs - frame.startMs) / buckets;
  const width = frame.width / buckets;
  return Array.from({ length: buckets }, (_, i) => {
    const from = frame.startMs + i * bucketMs;
    const isLast = i === buckets - 1;
    const inBucket = points.filter((p) => p.tMs >= from && (p.tMs < from + bucketMs || (isLast && p.tMs <= frame.endMs)));
    if (inBucket.length === 0) return null;
    const valid = inBucket.flatMap((p) => (p.calm === null ? [] : [p.calm]));
    const calm = valid.length === 0 ? null : valid.reduce((a, b) => a + b, 0) / valid.length;
    return { x: round(i * width), width: round(width), calm, zone: calm === null ? null : barZone(calm) };
  }).filter((b): b is Bar => b !== null);
}

/** Cooling periods as x-ranges, clipped to the window. */
export function coolingRects(bands: readonly TimeBand[], frame: GraphFrame): { x: number; width: number }[] {
  return bands
    .map((b) => ({ from: Math.max(b.fromMs, frame.startMs), to: Math.min(b.toMs, frame.endMs) }))
    .filter((b) => b.to > b.from)
    .map((b) => ({ x: xFor(b.from, frame), width: xFor(b.to, frame) - xFor(b.from, frame) }));
}
