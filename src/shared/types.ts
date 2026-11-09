// Shared types from 09 §1 (and the action payload types engine/ emits, 09 §4).
// Only the types in use so far; the rest arrive with their modules.

export type Lang = 'ar_EG' | 'am_ET' | 'en';
export const LANGS: readonly Lang[] = ['ar_EG', 'am_ET', 'en'];

export type Zone = 'calm' | 'rising' | 'high' | 'unknown';

export type SourceKind = 'tarha' | 'demo';

/** Sensor fit chip levels (07 §3). */
export type FitLevel = 'good' | 'adjust' | 'none';

/** Vibration patterns from 04 §7. Emitted by engine/ as `{ a: 'haptic' }`, played by ui/. */
export type HapticPattern = 'rising' | 'highPrompt' | 'coolingStarted' | 'reminder' | 'batteryLow';

/** Recorded voice lines (04 §6). Grows as flows are built; every id needs audio in every language (12 §2.4). */
export type VoiceLineId = 'langName' | 'highPrompt' | 'deleteHold';
export const VOICE_LINE_IDS: readonly VoiceLineId[] = ['langName', 'highPrompt', 'deleteHold'];
