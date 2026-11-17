// Nightly pattern run (07 §6, 11 §6, 03 Flows 4 & 8): from stored minutes and events → which patterns to offer,
// which reminders to cancel because their pattern faded, and whether TARA "needs more days". Pure: the app
// applies the plan (store + notifications). Times in → epoch ms; converted to local time here because patterns
// are about her day (05 §2).
import { REMINDER_LEAD_MIN } from '../engine/constants';
import { detectPatterns, localDayIndex, usableDaySet, type EventRow, type MinuteRow } from './detect';
import { reconcilePatterns, supportFor as supportIn, type PatternRecord, type PatternStatus } from './lifecycle';

const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 1440;

/** A stored pattern (05 §2.6) including its scheduled reminder. */
export interface StoredPattern {
  slotStartMin: number;
  matchingDays: number;
  detectedAt: number;
  status: PatternStatus;
  declinedUntil: number | null;
  reminderNotificationId: string | null;
}

export interface ReminderPlan {
  patterns: StoredPattern[];
  /** Reminders whose pattern faded or vanished: cancel them (11 §6). */
  cancelIds: string[];
  /** Pattern times that just faded — Home says so once (03 Flow 4 step 3). */
  fadedSlots: number[];
  needMoreDays: boolean;
}

/** Epoch ms → "local ms" (wall clock as if UTC), the timeline pattern detection uses. */
export const toLocalMs = (epochMs: number): number => epochMs - new Date(epochMs).getTimezoneOffset() * MS_PER_MIN;

/** Reminder time for a pattern: 30 minutes earlier (03 Flow 4). */
export const reminderMinuteFor = (slotStartMin: number): number => (slotStartMin - REMINDER_LEAD_MIN + MIN_PER_DAY) % MIN_PER_DAY;

export function planReminders(stored: readonly StoredPattern[], minutes: readonly MinuteRow[], events: readonly EventRow[], nowMs: number): ReminderPlan {
  const localMinutes = minutes.map((m) => ({ ...m, tsMinute: toLocalMs(m.tsMinute) }));
  const localEvents = events.map((e) => ({ ...e, ts: toLocalMs(e.ts) }));
  const today = new Date(nowMs);
  const detection = detectPatterns(localEvents, localMinutes, today);
  const usable = usableDaySet(localMinutes, localDayIndex(today));
  const records: PatternRecord[] = stored.map((p) => ({ slotStartMin: p.slotStartMin, matchingDays: p.matchingDays, status: p.status, declinedUntilMs: p.declinedUntil }));
  const result = reconcilePatterns(records, detection.patterns, (slot) => supportIn(slot, localEvents, usable), nowMs);

  const idFor = (slot: number) => stored.find((p) => p.slotStartMin === slot)?.reminderNotificationId ?? null;
  const patterns = result.records.map((r) => ({
    slotStartMin: r.slotStartMin,
    matchingDays: r.matchingDays,
    detectedAt: stored.find((p) => p.slotStartMin === r.slotStartMin)?.detectedAt ?? nowMs,
    status: r.status,
    declinedUntil: r.declinedUntilMs,
    // Only an accepted pattern keeps a reminder.
    reminderNotificationId: r.status === 'accepted' ? idFor(r.slotStartMin) : null,
  }));
  const kept = new Set(patterns.flatMap((p) => (p.reminderNotificationId === null ? [] : [p.reminderNotificationId])));
  const cancelIds = stored.flatMap((p) => (p.reminderNotificationId !== null && !kept.has(p.reminderNotificationId) ? [p.reminderNotificationId] : []));
  return { patterns, cancelIds, fadedSlots: result.newlyFaded.map((r) => r.slotStartMin), needMoreDays: detection.needMoreDays };
}
