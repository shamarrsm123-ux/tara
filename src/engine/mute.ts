// Mute choices (03 Flow 7 step 5, 07 §5.5): 30 min / 1 hour / rest of today. The engine compares mute times on the
// session's monotonic clock, so the wall-clock "rest of today" is converted here.
import { addDays, dayStartOf } from './history';

export type MuteChoice = 'm30' | 'h1' | 'day';

const MIN_MS = 60_000;
const DURATION_MS: Record<Exclude<MuteChoice, 'day'>, number> = { m30: 30 * MIN_MS, h1: 60 * MIN_MS };

/** Mute end on the monotonic timeline, given the same instant on both clocks. */
export function muteUntilMono(choice: MuteChoice, nowMs: number, nowMono: number): number {
  if (choice === 'day') return nowMono + (addDays(dayStartOf(nowMs), 1) - nowMs);
  return nowMono + DURATION_MS[choice];
}
