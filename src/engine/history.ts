// My Days (03 Flow 14, 02 §8.15): pure views over the stored minute summaries — time in each zone per local day
// for the 7 day bars, and a day's Calm graph with blue cooling bands. Nothing older than the shown days exists.
import type { GraphPoint, TimeBand, Zone } from '../shared/types';

const MINUTE_MS = 60_000;
const HALF_MINUTE_MS = 30_000;
const CALM_MAX = 100;

export interface MinuteLike {
  tsMinute: number;
  stressMean: number;
  zone: Zone;
  coolingOn: boolean;
}

export interface DaySummary {
  dayStartMs: number;
  calmMin: number;
  risingMin: number;
  highMin: number;
}

/** Local midnight of the day containing `ms`. */
export function dayStartOf(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Midnight `offset` days after `dayStart` (calendar days, so DST-safe). */
export function addDays(dayStart: number, offset: number): number {
  const d = new Date(dayStart);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime();
}

/** The last `days` local days ending today, oldest first. */
export function summarizeDays(minutes: readonly MinuteLike[], nowMs: number, days: number): DaySummary[] {
  const today = dayStartOf(nowMs);
  return Array.from({ length: days }, (_, i) => {
    const start = addDays(today, i - (days - 1));
    const end = addDays(start, 1);
    const inDay = minutes.filter((m) => m.tsMinute >= start && m.tsMinute < end);
    const count = (zone: Zone) => inDay.filter((m) => m.zone === zone).length;
    return { dayStartMs: start, calmMin: count('calm'), risingMin: count('rising'), highMin: count('high') };
  });
}

/** One point per minute at its middle; minutes without a known zone are gaps in the line. */
export function pointsFromMinutes(minutes: readonly MinuteLike[]): GraphPoint[] {
  return minutes.map((m) => ({ tMs: m.tsMinute + HALF_MINUTE_MS, calm: m.zone === 'unknown' ? null : CALM_MAX - m.stressMean }));
}

/** Consecutive cooling minutes as blue bands. */
export function coolingBandsFromMinutes(minutes: readonly MinuteLike[]): TimeBand[] {
  return minutes
    .filter((m) => m.coolingOn)
    .toSorted((a, b) => a.tsMinute - b.tsMinute)
    .reduce<TimeBand[]>((bands, m) => {
      const last = bands.at(-1);
      if (last !== undefined && last.toMs === m.tsMinute) return [...bands.slice(0, -1), { ...last, toMs: m.tsMinute + MINUTE_MS }];
      return [...bands, { fromMs: m.tsMinute, toMs: m.tsMinute + MINUTE_MS }];
    }, []);
}
