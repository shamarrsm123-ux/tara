// Patterned vibration so she needn't look at the phone (04 §7).
// 🟡 Pulse lengths are unspecified in 04; short = 80 ms, long = 400 ms, gap = 150 ms.
import { Platform, Vibration } from 'react-native';
import type { HapticPattern } from '../shared/types';

export const HAPTIC_SHORT_MS = 80;
export const HAPTIC_LONG_MS = 400;
export const HAPTIC_GAP_MS = 150;

type Pulse = 'short' | 'long';

/** 04 §7, pulse by pulse. */
export const HAPTIC_PULSES: Record<HapticPattern, readonly Pulse[]> = {
  rising: ['short', 'short'],
  highPrompt: ['long', 'long'],
  coolingStarted: ['short'],
  reminder: ['short', 'long'],
  batteryLow: ['short', 'short', 'short'],
};

/** Vibrate/pause durations, starting with a vibration: [on, off, on, …]. */
export function vibrationTimings(pattern: HapticPattern): number[] {
  return HAPTIC_PULSES[pattern].flatMap((pulse, i) => [
    ...(i > 0 ? [HAPTIC_GAP_MS] : []),
    pulse === 'short' ? HAPTIC_SHORT_MS : HAPTIC_LONG_MS,
  ]);
}

export function playHaptic(pattern: HapticPattern): void {
  const timings = vibrationTimings(pattern);
  // Android's pattern starts with a wait; the web Vibration API starts with a vibration.
  Vibration.vibrate(Platform.OS === 'android' ? [0, ...timings] : timings);
}
