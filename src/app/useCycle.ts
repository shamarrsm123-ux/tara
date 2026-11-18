// Cycle-aware (PMDD-aware) cooling and the daily check-in in Daily mode (03 Flows 19–20, 07 §10). Loads her
// day-1 dates, works out today's phase with engine/cycle, tells the engine today's support level, and offers the
// evening check-in. Everything is opt-in (Settings → PMDD-aware cooling) and only after saving (11 §1).
import { useCallback, useEffect, useState } from 'react';
import { CHECKIN_FROM_HOUR } from '../engine/constants';
import { cycleStatus, daysBefore, estimatedDay1For, localMidnight, phaseOnDay, type CyclePhase, type CycleStatus } from '../engine/cycle';
import type { MonitorSession } from '../engine/session';
import type { CheckInLevel, CheckInRow, CycleStartRow, Store } from '../shared/storePort';
import type { Settings } from '../shared/types';

const HISTORY_DAYS = 7;

export interface CheckInAnswers {
  mood: CheckInLevel;
  irritability: CheckInLevel;
  body: CheckInLevel;
}

export interface Cycle {
  isOn: boolean;
  /** Today's phase and support; null while off or loading. */
  status: CycleStatus | null;
  /** "My period started" — today (0) or `daysAgo` days ago. */
  logDay1: (daysAgo: number) => void;
  /** "Not right? I am in my…" — today becomes the first day of that phase. */
  correctPhase: (phase: CyclePhase) => void;
  forget: () => void;
  phaseOn: (dayMs: number) => CyclePhase | null;
  checkIns: readonly CheckInRow[];
  isCheckInDue: boolean;
  saveCheckIn: (answers: CheckInAnswers) => void;
  postponeCheckIn: () => void;
}

interface Loaded {
  starts: readonly CycleStartRow[];
  checkIns: readonly CheckInRow[];
}

const EMPTY: Loaded = { starts: [], checkIns: [] };

export function useCycle(store: Store, settings: Settings | null, session: MonitorSession | null, isActive: boolean, nowMs: number): Cycle {
  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [postponedDay, setPostponedDay] = useState<number | null>(null);
  const isOn = isActive && settings?.cycleAware === true;
  const lengthDays = settings?.cycleLengthDays ?? 0;

  const load = useCallback(async () => {
    try {
      const now = Date.now();
      const [starts, checkIns] = await Promise.all([store.listCycleStarts(), store.queryCheckIns(daysBefore(now, HISTORY_DAYS), now + 1)]);
      setLoaded({ starts, checkIns });
    } catch {
      // store locked / wiping: keep what is shown; the next change loads again
    }
  }, [store]);

  useEffect(() => {
    if (!isOn) return undefined;
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [isOn, load]);

  const status = isOn && nowMs > 0 ? cycleStatus(loaded.starts, lengthDays, nowMs) : null;
  const support = status?.support ?? 'none';

  // The engine moves its triggers by today's support level (07 §10.3); 'none' whenever this is off.
  useEffect(() => {
    session?.dispatch({ t: 'cycleSupport', support });
  }, [session, support]);

  const write = (body: () => Promise<void>) => void body().then(load, () => undefined);
  const today = localMidnight(nowMs);
  const hasCheckedInToday = loaded.checkIns.some((c) => c.dayMs === today);
  const isEvening = new Date(nowMs).getHours() >= CHECKIN_FROM_HOUR;

  return {
    isOn,
    status,
    logDay1: (daysAgo) => write(() => store.addCycleStart({ dayMs: daysBefore(Date.now(), daysAgo), isEstimated: false })),
    correctPhase: (phase) => write(() => store.addCycleStart({ dayMs: estimatedDay1For(phase, status?.lengthDays ?? lengthDays, Date.now()), isEstimated: true })),
    forget: () => write(() => store.clearCycleStarts()),
    phaseOn: (dayMs) => (isOn ? phaseOnDay(loaded.starts, lengthDays, dayMs) : null),
    checkIns: isOn ? loaded.checkIns : [],
    isCheckInDue: isOn && isEvening && !hasCheckedInToday && postponedDay !== today,
    saveCheckIn: (answers) => write(() => store.saveCheckIn({ dayMs: localMidnight(Date.now()), ...answers })),
    postponeCheckIn: () => setPostponedDay(today),
  };
}
