// The real clock. Everything time-dependent takes a Clock so tests can inject a fake one (09 §1).
import type { Clock } from './types';

export const systemClock: Clock = {
  nowMs: () => Date.now(),
  monotonicMs: () => performance.now(),
};
