// Shared types from 09 §1 (and the action payload types engine/ emits, 09 §4), plus the settings
// shape from 05 §2.2. Pure types and constants only — no React, no I/O.

export type Lang = 'ar_EG' | 'am_ET' | 'en';
export const LANGS: readonly Lang[] = ['ar_EG', 'am_ET', 'en'];

export type Zone = 'calm' | 'rising' | 'high' | 'unknown';

export type SourceKind = 'tarha' | 'demo';

/** Sensor fit chip levels (07 §3). */
export type FitLevel = 'good' | 'adjust' | 'none';

/** Injected clock (09 §1): wall clock for days/patterns, monotonic for durations. */
export interface Clock {
  nowMs(): number;
  monotonicMs(): number;
}

/** One decoded 1 Hz packet (09 §1). `source` travels with every sample so demo data can't be stored. */
export interface MetricsSample {
  source: SourceKind;
  seq: number;
  theta: number;
  alpha: number;
  beta: number;
  fit: number;
  skinTempC: number | null;
  motion: boolean;
  saturated: boolean;
  receivedAtMono: number;
}

export type TarhaCooling = 'off' | 'on' | 'locked_battery' | 'locked_rest' | 'fault';

export interface TarhaStatus {
  batteryPct: number;
  cooling: TarhaCooling;
  coolingRemainingS: number;
  faults: number;
}

// Settings (05 §2.2), camelCase in TypeScript.
export type AlertSensitivity = 'fewer' | 'normal' | 'more';
export type CoolingMode = 'ask' | 'auto';
export type PlaceLabel = 'in_field' | 'at_home' | 'at_market' | 'on_road';

export interface Settings {
  retentionDays: 1 | 3 | 7;
  speakAutomatically: boolean;
  coolingMode: CoolingMode;
  coolingMinutes: 5 | 10 | 15;
  alertSensitivity: AlertSensitivity;
  placeLabelsEnabled: boolean;
  enabledPlaceLabels: readonly PlaceLabel[];
  appLock: boolean;
  theme: 'sun' | 'night' | 'auto';
}

export const DEFAULT_SETTINGS: Settings = {
  retentionDays: 7,
  speakAutomatically: true,
  coolingMode: 'ask',
  coolingMinutes: 10,
  alertSensitivity: 'normal',
  placeLabelsEnabled: false,
  enabledPlaceLabels: [],
  appLock: false,
  theme: 'sun',
};

/** Event types (05 §2.5). */
export type EventType =
  | 'high_episode_start'
  | 'high_episode_end'
  | 'prompt_shown'
  | 'prompt_yes'
  | 'prompt_no'
  | 'cooling_start'
  | 'cooling_stop'
  | 'reminder_fired'
  | 'help_question_shown'
  | 'help_opened_sms'
  | 'battery_low'
  | 'disconnect'
  | 'reconnect';

/** Lock-screen notification kinds (09 §7). 🟡 `batteryOff` added for the ≤ 3% alert in 07 §7. */
export type NotifyKind =
  | 'coolBreak'
  | 'reminder'
  | 'batteryLow'
  | 'batteryLock'
  | 'batteryOff'
  | 'phoneBatteryLow'
  | 'helpQuestion';

/** Vibration patterns from 04 §7. Emitted by engine/ as `{ a: 'haptic' }`, played by ui/. */
export type HapticPattern = 'rising' | 'highPrompt' | 'coolingStarted' | 'reminder' | 'batteryLow';

/** Recorded voice lines (04 §6, lines from 03). Every id needs audio in every language (12 §2.4). */
export const VOICE_LINE_IDS = [
  'langName',
  'langConfirm',
  'welcome',
  'connectWear',
  'fitMove',
  'calibrateIntro',
  'calibrateDone',
  'highPrompt',
  'autoCooling',
  'calmerNow',
  'helpQuestion',
  'batteryLow',
  'batteryLock',
  'batteryOff',
  'phoneBatteryLow',
  'deleteHold',
] as const;
export type VoiceLineId = (typeof VOICE_LINE_IDS)[number];

/** One point on the live graph (04 §9.2). `calm` null = no valid signal; the line breaks there. */
export interface GraphPoint {
  tMs: number;
  calm: number | null;
}

/** A time range, e.g. a cooling period shown as a blue band. */
export interface TimeBand {
  fromMs: number;
  toMs: number;
}
