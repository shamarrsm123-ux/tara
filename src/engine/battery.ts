// Battery alerts (07 §7, 03 Flow 12). Tarha alerts fire once per charge cycle and re-arm above 30%.
// When several thresholds are crossed at once, only the most severe alert fires. Pure.
import { BATT_LOCK, BATT_LOW, BATT_OFF, BATT_REARM, PHONE_BATT_LOW } from './constants';
import type { EngineAction, Step } from './types';

type Level = 'low' | 'lock' | 'off';

export interface BatteryState {
  armed: Readonly<Record<Level, boolean>>;
  phoneAlertDay: string | null;
}

export const INITIAL_BATTERY: BatteryState = { armed: { low: true, lock: true, off: true }, phoneAlertDay: null };

const SEVERITY: readonly Level[] = ['low', 'lock', 'off'];

const ALERT = {
  low: { notify: 'batteryLow', line: 'batteryLow' },
  lock: { notify: 'batteryLock', line: 'batteryLock' },
  off: { notify: 'batteryOff', line: 'batteryOff' },
} as const;

function levelFor(pct: number): Level | null {
  if (pct <= BATT_OFF) return 'off';
  if (pct <= BATT_LOCK) return 'lock';
  if (pct <= BATT_LOW) return 'low';
  return null;
}

export function applyTarhaBattery(state: BatteryState, pct: number, isSpeaking: boolean): Step<BatteryState> {
  if (pct > BATT_REARM) return { state: { ...state, armed: INITIAL_BATTERY.armed }, actions: [] };
  const level = levelFor(pct);
  if (level === null || !state.armed[level]) return { state, actions: [] };

  const upTo = SEVERITY.indexOf(level);
  const armed = Object.fromEntries(SEVERITY.map((l, i) => [l, i <= upTo ? false : state.armed[l]])) as Record<Level, boolean>;
  const actions: EngineAction[] = [
    { a: 'notify', kind: ALERT[level].notify },
    ...(isSpeaking ? [{ a: 'speak' as const, line: ALERT[level].line }] : []),
    { a: 'haptic', pattern: 'batteryLow' },
    { a: 'logEvent', type: 'battery_low' },
  ];
  return { state: { ...state, armed }, actions };
}

/** Phone ≤ 15% while monitoring: one alert per day (07 §7). */
export function applyPhoneBattery(state: BatteryState, pct: number, isMonitoring: boolean, dayKey: string, isSpeaking: boolean): Step<BatteryState> {
  if (!isMonitoring || pct > PHONE_BATT_LOW || state.phoneAlertDay === dayKey) return { state, actions: [] };
  return {
    state: { ...state, phoneAlertDay: dayKey },
    actions: [{ a: 'notify', kind: 'phoneBatteryLow' }, ...(isSpeaking ? [{ a: 'speak' as const, line: 'phoneBatteryLow' as const }] : [])],
  };
}
