// Pure geometry for the Live Graph (04 §9.2): maps time/Calm to SVG coordinates. No React.
import { CALM_ZONE_MIN_C, HIGH_ZONE_MAX_C } from '../../engine/constants';

export interface GraphPoint {
  tMs: number;
  /** null = no valid signal that second; the line breaks there. */
  calm: number | null;
}

export interface TimeBand {
  fromMs: number;
  toMs: number;
}

export interface GraphFrame {
  width: number;
  height: number;
  startMs: number;
  endMs: number;
}

export interface HorizontalBand {
  y: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 10) / 10;

export function xFor(tMs: number, frame: GraphFrame): number {
  return ((tMs - frame.startMs) / (frame.endMs - frame.startMs)) * frame.width;
}

export function yFor(calm: number, frame: GraphFrame): number {
  return (1 - clamp(calm, 0, 100) / 100) * frame.height;
}

/** Splits points into unbroken runs of valid values; a null starts a new run. */
function validRuns(points: readonly GraphPoint[]): { tMs: number; calm: number }[][] {
  return points.reduce<{ tMs: number; calm: number }[][]>(
    (runs, p) => {
      const last = runs[runs.length - 1] ?? [];
      if (p.calm === null) return last.length === 0 ? runs : [...runs, []];
      return [...runs.slice(0, -1), [...last, { tMs: p.tMs, calm: p.calm }]];
    },
    [[]],
  );
}

/** One SVG path per unbroken run of valid points inside the window. */
export function linePaths(points: readonly GraphPoint[], frame: GraphFrame): string[] {
  const inWindow = points
    .filter((p) => p.tMs >= frame.startMs && p.tMs <= frame.endMs)
    .sort((a, b) => a.tMs - b.tMs);
  return validRuns(inWindow)
    .filter((run) => run.length > 0)
    .map((run) => {
      const coords = run.map((p) => ({ x: round(xFor(p.tMs, frame)), y: round(yFor(p.calm, frame)) }));
      // A lone point still needs a visible stroke.
      const drawn = coords.length === 1 ? [...coords, { x: coords[0]!.x + 0.5, y: coords[0]!.y }] : coords;
      return `M${drawn.map((c) => `${c.x} ${c.y}`).join(' L')}`;
    });
}

/** Cooling periods as x-ranges, clipped to the window. */
export function coolingRects(bands: readonly TimeBand[], frame: GraphFrame): { x: number; width: number }[] {
  return bands
    .map((b) => ({ from: Math.max(b.fromMs, frame.startMs), to: Math.min(b.toMs, frame.endMs) }))
    .filter((b) => b.to > b.from)
    .map((b) => ({ x: xFor(b.from, frame), width: xFor(b.to, frame) - xFor(b.from, frame) }));
}

/** Background zone bands, top to bottom: calm, rising, high (07 §4.5 thresholds). */
export function zoneBands(frame: GraphFrame): { calm: HorizontalBand; rising: HorizontalBand; high: HorizontalBand } {
  const calmBottom = yFor(CALM_ZONE_MIN_C, frame);
  const highTop = yFor(HIGH_ZONE_MAX_C, frame);
  return {
    calm: { y: 0, height: calmBottom },
    rising: { y: calmBottom, height: highTop - calmBottom },
    high: { y: highTop, height: frame.height - highTop },
  };
}
