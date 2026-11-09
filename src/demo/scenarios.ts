// Demo scenarios (03 Flow 18, 07 §8). Each one is a pure script: given seconds since the scenario started
// (and when cooling began, if it did), what Calm level, sensor fit, motion and battery the simulated tarha
// should produce. Demo-only overrides (the Story's 3 s sustain window) live here, not in engine/constants.
import { FIT_GOOD } from '../engine/constants';

export type DemoScenarioId = 'story' | 'calmDay' | 'badTwoPmWeek' | 'lowBattery' | 'looseSensor';

export const DEMO_SCENARIO_IDS: readonly DemoScenarioId[] = ['story', 'calmDay', 'badTwoPmWeek', 'lowBattery', 'looseSensor'];

export interface ScenarioFrame {
  calm: number;
  fit: number;
  motion: boolean;
  batteryPct: number;
}

export interface DemoScenario {
  id: DemoScenarioId;
  /** Time-compressed scenarios must be labelled "sped up" (08 §12). */
  isSpedUp: boolean;
  /** Demo-only engine override (07 §8). */
  sustainOverrideS?: number;
  frame(tS: number, coolingSinceS: number | null): ScenarioFrame;
}

const GOOD_FIT = 95;
const ADJUST_FIT = 55;
const NO_CONTACT_FIT = 20;

const lerp = (from: number, to: number, f: number) => from + (to - from) * Math.min(1, Math.max(0, f));
const steady = (calm: number, batteryPct = 85): ScenarioFrame => ({ calm, fit: GOOD_FIT, motion: false, batteryPct });

/** A gently wandering calm level that stays in the Calm zone. */
const calmWander = (tS: number) => 70 + 6 * Math.sin((2 * Math.PI * tS) / 180) + 2 * Math.sin(tS * 0.9);

/**
 * The 30-second MVP (07 §8): Calm 70 → 55 → 20 (red), prompt after a 3 s sustain, then after cooling starts
 * 20 → 60 → 80. If she doesn't cool, Calm stays at 20.
 */
const story: DemoScenario = {
  id: 'story',
  isSpedUp: true,
  sustainOverrideS: 3,
  frame(tS, coolingSinceS) {
    if (coolingSinceS === null) {
      const calm = tS < 5 ? lerp(70, 55, tS / 5) : lerp(55, 20, (tS - 5) / 2);
      return steady(calm, 80);
    }
    const dt = tS - coolingSinceS;
    return steady(dt < 14 ? lerp(20, 60, dt / 14) : lerp(60, 80, (dt - 14) / 5), 80);
  },
};

const calmDay: DemoScenario = { id: 'calmDay', isSpedUp: false, frame: (tS) => steady(calmWander(tS)) };

/** Live signal is a calm day; the week of history comes from history.ts so Flow 4 can show a real pattern card. */
const badTwoPmWeek: DemoScenario = { id: 'badTwoPmWeek', isSpedUp: false, frame: (tS) => steady(calmWander(tS)) };

/** Battery drains fast (sped up) through 20%, 10% and 3% so every 07 §7 alert fires within a minute. */
const lowBattery: DemoScenario = {
  id: 'lowBattery',
  isSpedUp: true,
  frame: (tS) => steady(62, Math.max(1, 26 - tS * 0.5)),
};

/** Fit cycles Good → Adjust → No contact → motion. While the fit is bad the signal looks very stressed, but no alert may fire. */
const LOOSE_CYCLE_S = 40;
const looseSensor: DemoScenario = {
  id: 'looseSensor',
  isSpedUp: false,
  frame(tS) {
    const phase = tS % LOOSE_CYCLE_S;
    if (phase < 20) return steady(60);
    if (phase < 30) return { calm: 15, fit: ADJUST_FIT, motion: false, batteryPct: 85 };
    if (phase < 35) return { calm: 15, fit: NO_CONTACT_FIT, motion: false, batteryPct: 85 };
    return { calm: 15, fit: GOOD_FIT, motion: true, batteryPct: 85 };
  },
};

export const SCENARIOS: Record<DemoScenarioId, DemoScenario> = { story, calmDay, badTwoPmWeek, lowBattery, looseSensor };

/** Before a scenario starts (connect + Learn Your Calm): a calm signal at the default baseline. */
export const IDLE_FRAME: ScenarioFrame = steady(70, 85);

export const isValidFrame = (f: ScenarioFrame) => f.fit >= FIT_GOOD && !f.motion;
