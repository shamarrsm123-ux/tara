// Pattern lifecycle (11 §6): (none) → offered → accepted | declined; accepted → faded; declined →
// re-offered after 7 days. Pure: returns new records plus what changed, so store/ and notify/ can act.
import { PATTERN_DECLINE_DAYS, PATTERN_FADE_BELOW, PATTERN_WINDOW_MIN } from '../engine/constants';
import { matchingStarts, type DetectedPattern, type EventRow } from './detect';

export type PatternStatus = 'offered' | 'accepted' | 'declined' | 'faded';

export interface PatternRecord {
  /** Pattern time, minute of day (05 §2.6 `slot_start_min`, e.g. 840 = 14:00). */
  slotStartMin: number;
  matchingDays: number;
  status: PatternStatus;
  declinedUntilMs: number | null;
}

export interface Reconciled {
  records: PatternRecord[];
  newlyOffered: PatternRecord[];
  newlyFaded: PatternRecord[];
}

const MS_PER_DAY = 24 * 60 * 60_000;
const HALF_WINDOW_MIN = PATTERN_WINDOW_MIN / 2;

/**
 * Current support for an accepted pattern: usable days with an episode start within ±30 min of its time.
 * 🟡 07 §6.7 says "matching days in the current window"; the window is centred on the pattern time.
 */
export function supportFor(slotStartMin: number, events: readonly EventRow[], usable: ReadonlySet<number>): number {
  return matchingStarts(events, usable, slotStartMin - HALF_WINDOW_MIN, PATTERN_WINDOW_MIN).length;
}

const sameSlot = (a: number, b: number) => Math.abs(a - b) < HALF_WINDOW_MIN;

export function reconcilePatterns(
  existing: readonly PatternRecord[],
  detected: readonly DetectedPattern[],
  support: (slotStartMin: number) => number,
  nowMs: number,
): Reconciled {
  const updated = existing.map((r) =>
    r.status === 'accepted' && support(r.slotStartMin) < PATTERN_FADE_BELOW ? { ...r, status: 'faded' as const } : r,
  );
  const newlyFaded = updated.filter((r, i) => r.status === 'faded' && existing[i]!.status !== 'faded');

  const offers = detected.flatMap((d) => {
    const match = updated.find((r) => sameSlot(r.slotStartMin, d.patternMin));
    const isSuppressed = match?.status === 'declined' && match.declinedUntilMs !== null && nowMs < match.declinedUntilMs;
    const isLive = match?.status === 'accepted' || match?.status === 'offered';
    return isSuppressed || isLive ? [] : [{ slotStartMin: d.patternMin, matchingDays: d.matchingDays, status: 'offered' as const, declinedUntilMs: null }];
  });

  const kept = updated.filter((r) => !offers.some((o) => sameSlot(o.slotStartMin, r.slotStartMin)));
  return { records: [...kept, ...offers], newlyOffered: offers, newlyFaded };
}

export function acceptPattern(record: PatternRecord): PatternRecord {
  return { ...record, status: 'accepted', declinedUntilMs: null };
}

export function declinePattern(record: PatternRecord, nowMs: number): PatternRecord {
  return { ...record, status: 'declined', declinedUntilMs: nowMs + PATTERN_DECLINE_DAYS * MS_PER_DAY };
}
