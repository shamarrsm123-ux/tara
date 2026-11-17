// Daily mode services (03 Flow 7, 02 §8.14–8.15): the Android foreground service with the discreet "TARA is with
// you" notification, phone battery → engine (≤ 15 % warning), and My Days history read from the store once a
// minute. Active only after saving, in Daily mode.
import * as Battery from 'expo-battery';
import { useEffect, useState } from 'react';
import type { MonitorSession } from '../engine/session';
import type { Notifier } from '../shared/notifierPort';
import type { Store } from '../shared/storePort';
import type { SavedHistory } from '../ui/screens/MyDaysScreen';

const HISTORY_DAYS = 7;
const DAY_MS = 86_400_000;
const REFRESH_MS = 60_000;
const PERCENT = 100;

export function useDailyServices(store: Store, notifier: Notifier | null, session: MonitorSession | null, isActive: boolean): SavedHistory | null {
  const [history, setHistory] = useState<SavedHistory | null>(null);

  useEffect(() => {
    if (!isActive) return undefined;
    let isCurrent = true;
    const load = async () => {
      try {
        const now = Date.now();
        const [settings, minutes] = await Promise.all([store.getSettings(), store.queryMinutes(now - HISTORY_DAYS * DAY_MS, now + 1)]);
        if (isCurrent) setHistory({ minutes, retentionDays: settings.retentionDays });
      } catch {
        // store locked or wiping: keep what is shown; the next refresh tries again
      }
    };
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [store, isActive]);

  useEffect(() => {
    if (!isActive || notifier === null) return undefined;
    void notifier
      .requestPermission()
      .then(() => notifier.startMonitoringService())
      .catch(() => undefined); // refused notifications: monitoring still runs while the app is open
    return () => void notifier.stopMonitoringService().catch(() => undefined);
  }, [notifier, isActive]);

  useEffect(() => {
    if (!isActive || session === null) return undefined;
    const report = (level: number) => {
      if (level >= 0) session.dispatch({ t: 'phoneBattery', pct: Math.round(level * PERCENT) });
    };
    void Battery.getBatteryLevelAsync().then(report, () => undefined);
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => report(batteryLevel));
    return () => sub.remove();
  }, [session, isActive]);

  return isActive ? history : null;
}
