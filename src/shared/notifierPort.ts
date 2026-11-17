// The notifier contract (09 §7) as a port: notify/ implements it with Notifee on the phone; the app shell gets an
// instance from App.tsx. Every text comes from the discreet lock-screen set (02 §8.13) — the caller passes it in,
// already translated, and tests check that set for neutral wording.
import type { NotifyKind } from './types';

/** What may appear on a lock screen: the NotifyKinds plus the monitoring service's own line. */
export type LockScreenText = NotifyKind | 'monitoring';

export interface Notifier {
  /** Android 13+: asks to show notifications. Resolves true when allowed. */
  requestPermission(): Promise<boolean>;
  /** Android foreground service with the discreet "TARA is with you" notification (03 Flow 7). */
  startMonitoringService(): Promise<void>;
  stopMonitoringService(): Promise<void>;
  show(kind: NotifyKind): Promise<void>;
  /** Daily at minute-of-day (local time); returns the OS id (Phase 9). */
  scheduleDailyReminder(minuteOfDay: number): Promise<string>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
}

export type TextFor = (text: LockScreenText) => string;
