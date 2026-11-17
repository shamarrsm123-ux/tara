// Smart reminders in Daily mode (13 Phase 9; 03 Flows 4 & 8; 11 §6). Runs the pattern plan on start, every hour
// and right after the retention setting changes; schedules a daily reminder 30 min before an accepted pattern;
// cancels reminders whose pattern faded; "Not today" hides today's reminder card only. Only if she said Yes to
// pattern offers on Screen 4 (`patternOffers`) are new patterns offered.
import { useCallback, useEffect, useState } from 'react';
import { PATTERN_DECLINE_DAYS } from '../engine/constants';
import { planReminders, reminderMinuteFor, type StoredPattern } from '../patterns/plan';
import type { Notifier } from '../shared/notifierPort';
import type { Store } from '../shared/storePort';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const HISTORY_DAYS = 7;
const MS_PER_MIN = 60_000;

export interface Reminders {
  /** Pattern time (minute of day) waiting for Yes/No, if any. */
  offerSlot: number | null;
  /** A pattern that just faded, said once on Home. */
  fadedSlot: number | null;
  needMoreDays: boolean;
  /** An accepted pattern whose reminder time has come today (Flow 8 card). */
  dueSlot: number | null;
  accept(slot: number): void;
  decline(slot: number): void;
  dismissFaded(): void;
  dismissDue(): void;
  refresh(): void;
}

const minuteNow = (nowMs: number) => {
  const d = new Date(nowMs);
  return d.getHours() * 60 + d.getMinutes();
};
const dayKey = (nowMs: number) => new Date(nowMs).toDateString();

export function useReminders(store: Store, notifier: Notifier | null, isActive: boolean, nowMs: number): Reminders {
  const [patterns, setPatterns] = useState<StoredPattern[]>([]);
  const [fadedSlot, setFadedSlot] = useState<number | null>(null);
  const [needMoreDays, setNeedMoreDays] = useState(false);
  const [dismissedDay, setDismissedDay] = useState<string | null>(null);

  const save = useCallback(
    async (next: StoredPattern[]) => {
      await store.savePatterns(next);
      setPatterns(next);
    },
    [store],
  );

  const refresh = useCallback(async () => {
    try {
      const now = Date.now();
      const from = now - HISTORY_DAYS * DAY_MS;
      const [settings, stored, minutes, events] = await Promise.all([store.getSettings(), store.getPatterns(), store.queryMinutes(from, now + 1), store.queryEvents(from, now + 1)]);
      const plan = planReminders(stored, minutes, events, now);
      await Promise.all(plan.cancelIds.map((id) => notifier?.cancel(id).catch(() => undefined)));
      const next = settings.patternOffers ? plan.patterns : plan.patterns.filter((p) => p.status !== 'offered');
      await save(next);
      setNeedMoreDays(plan.needMoreDays);
      if (plan.fadedSlots[0] !== undefined) setFadedSlot(plan.fadedSlots[0]);
    } catch {
      // store locked / wiping: try again on the next run
    }
  }, [store, notifier, save]);

  useEffect(() => {
    if (!isActive) return undefined;
    const first = setTimeout(() => void refresh(), 0); // first run right after Daily mode opens
    const timer = setInterval(() => void refresh(), HOUR_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [isActive, refresh]);

  const accept = (slot: number) => {
    void (async () => {
      const id = notifier === null ? null : await notifier.scheduleDailyReminder(reminderMinuteFor(slot)).catch(() => null);
      await save(patterns.map((p) => (p.slotStartMin === slot ? { ...p, status: 'accepted', declinedUntil: null, reminderNotificationId: id } : p)));
    })();
  };
  const decline = (slot: number) => {
    void save(patterns.map((p) => (p.slotStartMin === slot ? { ...p, status: 'declined', declinedUntil: Date.now() + PATTERN_DECLINE_DAYS * DAY_MS } : p)));
  };

  const offer = patterns.find((p) => p.status === 'offered');
  const minute = minuteNow(nowMs);
  const due = patterns.find((p) => p.status === 'accepted' && minute >= reminderMinuteFor(p.slotStartMin) && minute < p.slotStartMin);
  const isDueDismissed = dismissedDay === dayKey(nowMs);
  return {
    offerSlot: isActive ? (offer?.slotStartMin ?? null) : null,
    fadedSlot: isActive ? fadedSlot : null,
    needMoreDays: isActive && needMoreDays && patterns.length > 0,
    dueSlot: isActive && !isDueDismissed ? (due?.slotStartMin ?? null) : null,
    accept,
    decline,
    dismissFaded: () => setFadedSlot(null),
    dismissDue: () => setDismissedDay(dayKey(nowMs)),
    refresh: () => void refresh(),
  };
}

/** A minute of day as a timestamp today (for formatting "2:00 PM" in her language). */
export function timeOfDayMs(minuteOfDay: number, nowMs: number): number {
  const d = new Date(nowMs);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + minuteOfDay * MS_PER_MIN;
}
