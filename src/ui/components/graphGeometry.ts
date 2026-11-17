// Pure geometry for the Live Graph (04 §9.2, 04a v2 D5): maps time/Calm to SVG coordinates, buckets the
// seconds, and builds the smooth line and its fill. No React.
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

export interface Pt {
  x: number;
  y: number;
}

/** Bucket centres of valid bars, split wherever a bucket is missing or has no valid signal (04a v2 D5). */
export function lineSegments(bars: readonly Bar[], frame: GraphFrame): Pt[][] {
  const segments: Pt[][] = [];
  let current: Pt[] = [];
  let lastX: number | null = null;
  for (const b of bars) {
    const isAdjacent = lastX !== null && Math.abs(b.x - lastX - b.width) < 0.5;
    if (b.calm === null) {
      if (current.length > 0) segments.push(current);
      current = [];
      lastX = null;
      continue;
    }
    if (!isAdjacent && current.length > 0) {
      segments.push(current);
      current = [];
    }
    current = [...current, { x: round(b.x + b.width / 2), y: round(yFor(b.calm, frame)) }];
    lastX = b.x;
  }
  return current.length > 0 ? [...segments, current] : segments;
}

/** Smooth line through the points: each step is a cubic with flat tangents, so it never overshoots the data. */
export function smoothPath(points: readonly Pt[]): string {
  const [first, ...rest] = points;
  if (first === undefined) return '';
  let prev = first;
  let d = `M${first.x} ${first.y}`;
  for (const p of rest) {
    const midX = round((prev.x + p.x) / 2);
    d += ` C${midX} ${prev.y} ${midX} ${p.y} ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}

/** The line closed down to the bottom edge, for the soft gradient fill. Needs at least two points. */
export function areaPath(points: readonly Pt[], height: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined || points.length < 2) return '';
  return `${smoothPath(points)} L${last.x} ${height} L${first.x} ${height} Z`;
}
