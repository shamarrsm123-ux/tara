// Daily-mode writes (03 Flow 7 step 3, 05 §3): one minute summary per minute from the live session, and the
// retention job on start and every hour. Active only after saving AND with a real tarha — the demo source never
// reaches storage (10 P13); the store rejects demo rows as a second line of defence.
import { useEffect } from 'react';
import { addSecond, emptyMinute, type MinuteState } from '../engine/minuteAggregator';
import type { MonitorSession } from '../engine/session';
import type { Store } from '../shared/storePort';

const RETENTION_INTERVAL_MS = 60 * 60_000;
const CALM_MAX = 100;

export function usePersistence(store: Store, session: MonitorSession | null, isActive: boolean): void {
  useEffect(() => {
    if (!isActive || session === null) return undefined;
    // A failed write must never interrupt monitoring; store errors carry nothing personal and the next
    // minute / hour simply tries again.
    const retain = () => void store.runRetention().catch(() => undefined);
    retain();
    const timer = setInterval(retain, RETENTION_INTERVAL_MS);

    let minute: MinuteState = emptyMinute();
    let lastT = -Infinity;
    const unsubscribe = session.subscribe(() => {
      const snap = session.getSnapshot();
      const isCooling = snap.engine.cooling === 'on';
      snap.points
        .filter((p) => p.tMs > lastT)
        .forEach((p) => {
          lastT = p.tMs;
          const step = addSecond(minute, { tMs: p.tMs, stress: p.calm === null ? null : CALM_MAX - p.calm, isCooling });
          minute = step.state;
          if (step.completed !== null) void store.appendMinute({ ...step.completed, source: 'tarha' }).catch(() => undefined);
        });
    });
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [store, session, isActive]);
}
