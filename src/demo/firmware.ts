// Firmware simulator (07 §2.4–2.5, §5.3; 08 §8; 12 §3). Pure state machine mirroring what the ESP32
// firmware must enforce on its own: max 20 min continuous then 5 min rest, battery lockout at ≤ 10%,
// and COOL_ON durations capped at 1200 s. Used by the demo source and by BLE tests (Phase 7).
import { BATT_LOCK, COOL_MAX_CONTINUOUS_MIN, COOL_MAX_DURATION_S, COOL_REST_MIN } from '../engine/constants';
import type { TarhaCooling, TarhaStatus } from '../shared/types';

const MAX_CONTINUOUS_S = COOL_MAX_CONTINUOUS_MIN * 60;
const REST_S = COOL_REST_MIN * 60;

export interface FirmwareState {
  batteryPct: number;
  cooling: TarhaCooling;
  remainingS: number;
  continuousS: number;
  restRemainingS: number;
}

export type FirmwareCommand = { op: 'coolOn'; durationS: number } | { op: 'coolOff' };

export const initialFirmware = (batteryPct: number): FirmwareState => ({
  batteryPct,
  cooling: 'off',
  remainingS: 0,
  continuousS: 0,
  restRemainingS: 0,
});

export function commandFirmware(state: FirmwareState, cmd: FirmwareCommand): FirmwareState {
  if (cmd.op === 'coolOff') {
    return state.cooling === 'on' ? { ...state, cooling: 'off', remainingS: 0, continuousS: 0 } : state;
  }
  if (state.batteryPct <= BATT_LOCK) return { ...state, cooling: 'locked_battery', remainingS: 0 };
  if (state.restRemainingS > 0) return { ...state, cooling: 'locked_rest' };
  const allowed = Math.min(Math.max(0, Math.round(cmd.durationS)), COOL_MAX_DURATION_S, MAX_CONTINUOUS_S - state.continuousS);
  return allowed > 0 ? { ...state, cooling: 'on', remainingS: allowed } : state;
}

/** Advances the firmware by `dtS` seconds with the current battery level. */
export function tickFirmware(state: FirmwareState, dtS: number, batteryPct: number): FirmwareState {
  const s = { ...state, batteryPct };
  if (s.cooling === 'on') {
    if (batteryPct <= BATT_LOCK) return { ...s, cooling: 'locked_battery', remainingS: 0, continuousS: 0 };
    const continuousS = s.continuousS + dtS;
    if (continuousS >= MAX_CONTINUOUS_S) return { ...s, cooling: 'locked_rest', remainingS: 0, continuousS: 0, restRemainingS: REST_S };
    const remainingS = s.remainingS - dtS;
    return remainingS <= 0 ? { ...s, cooling: 'off', remainingS: 0, continuousS: 0 } : { ...s, remainingS, continuousS };
  }
  if (s.cooling === 'locked_rest') {
    const restRemainingS = s.restRemainingS - dtS;
    return restRemainingS <= 0 ? { ...s, cooling: 'off', restRemainingS: 0 } : { ...s, restRemainingS };
  }
  if (s.cooling === 'locked_battery' && batteryPct > BATT_LOCK) return { ...s, cooling: 'off' };
  return s;
}

export function statusOf(state: FirmwareState): TarhaStatus {
  return { batteryPct: Math.round(state.batteryPct), cooling: state.cooling, coolingRemainingS: Math.round(state.remainingS), faults: 0 };
}
