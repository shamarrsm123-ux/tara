// Cooling state (07 §5.3, 11 §4). The displayed state mirrors tarha `status` notifications; the only
// optimistic state is `starting`, which times out after 2 s. Firmware is the last line of safety (08 §8).
import {
  BATT_LOCK,
  COOL_CONFIRM_S,
  COOL_EXTEND_MIN,
  COOL_MAX_CONTINUOUS_MIN,
  COOL_REST_MIN,
  POST_COOLING_QUIET_MIN,
} from './constants';
import type { Settings, TarhaStatus } from '../shared/types';
import type { CoolBlockReason, CoolingDisplay, CoolOffReason, CoolOnReason, EngineAction, Step } from './types';

const MS_PER_S = 1000;
const MS_PER_MIN = 60_000;
const MAX_CONTINUOUS_MS = COOL_MAX_CONTINUOUS_MIN * MS_PER_MIN;

export interface CoolingSession {
  startMs: number;
  plannedEndMs: number;
  reason: CoolOnReason;
  isExtended: boolean;
  isOffRequested: boolean;
  hasSpokenCalmer: boolean;
}

export interface CoolingState {
  display: CoolingDisplay;
  isConnected: boolean;
  hasEverConnected: boolean;
  batteryPct: number | null;
  startingSinceMs: number | null;
  pendingReason: CoolOnReason | null;
  pendingDurationS: number | null;
  session: CoolingSession | null;
  restUntilMs: number;
  quietUntilMs: number;
  hasStartFailed: boolean;
}

export const INITIAL_COOLING: CoolingState = {
  display: 'off',
  isConnected: false,
  hasEverConnected: false,
  batteryPct: null,
  startingSinceMs: null,
  pendingReason: null,
  pendingDurationS: null,
  session: null,
  restUntilMs: Number.NEGATIVE_INFINITY,
  quietUntilMs: Number.NEGATIVE_INFINITY,
  hasStartFailed: false,
};

export function coolBlockReason(state: CoolingState, nowMs: number): CoolBlockReason | null {
  if (!state.isConnected) return 'disconnected';
  if (state.display === 'locked_battery' || (state.batteryPct !== null && state.batteryPct <= BATT_LOCK)) return 'battery';
  if (state.display === 'locked_rest' || nowMs < state.restUntilMs) return 'rest';
  if (state.display !== 'off') return 'busy';
  return null;
}

export function requestCoolOn(state: CoolingState, reason: CoolOnReason, settings: Settings, nowMs: number): Step<CoolingState> {
  if (coolBlockReason(state, nowMs) !== null) return { state, actions: [] };
  const durationS = settings.coolingMinutes * 60;
  return {
    state: { ...state, display: 'starting', startingSinceMs: nowMs, pendingReason: reason, pendingDurationS: durationS, hasStartFailed: false },
    actions: [{ a: 'coolOn', durationS, reason }],
  };
}

export function requestCoolOff(state: CoolingState, reason: CoolOffReason): Step<CoolingState> {
  if (state.display === 'starting') {
    return { state: { ...state, display: 'off', startingSinceMs: null, pendingReason: null }, actions: [{ a: 'coolOff', reason }] };
  }
  if (state.display !== 'on' || state.session === null || state.session.isOffRequested) return { state, actions: [] };
  return { state: { ...state, session: { ...state.session, isOffRequested: true } }, actions: [{ a: 'coolOff', reason }] };
}

/** One extension of +10 min, never past 20 min continuous (07 §5.3). 🟡 Re-sends COOL_ON with the new remaining time. */
export function extendCooling(state: CoolingState, nowMs: number): Step<CoolingState> {
  const s = state.session;
  if (state.display !== 'on' || s === null || s.isExtended || s.isOffRequested) return { state, actions: [] };
  const plannedEndMs = Math.min(s.plannedEndMs + COOL_EXTEND_MIN * MS_PER_MIN, s.startMs + MAX_CONTINUOUS_MS);
  if (plannedEndMs <= s.plannedEndMs) return { state, actions: [] };
  return {
    state: { ...state, session: { ...s, plannedEndMs, isExtended: true } },
    actions: [{ a: 'coolOn', durationS: Math.ceil((plannedEndMs - nowMs) / MS_PER_S), reason: 'manual' }],
  };
}

export function canExtend(state: CoolingState): boolean {
  const s = state.session;
  return state.display === 'on' && s !== null && !s.isExtended && !s.isOffRequested && s.plannedEndMs < s.startMs + MAX_CONTINUOUS_MS;
}

function endSession(state: CoolingState, display: CoolingDisplay, nowMs: number): Step<CoolingState> {
  if (state.session === null) return { state: { ...state, display }, actions: [] };
  const ranFullLimit = nowMs - state.session.startMs >= MAX_CONTINUOUS_MS - MS_PER_S;
  return {
    state: {
      ...state,
      display,
      session: null,
      quietUntilMs: nowMs + POST_COOLING_QUIET_MIN * MS_PER_MIN,
      restUntilMs: ranFullLimit || display === 'locked_rest' ? nowMs + COOL_REST_MIN * MS_PER_MIN : state.restUntilMs,
    },
    actions: [{ a: 'logEvent', type: 'cooling_stop' }],
  };
}

function startSession(state: CoolingState, status: TarhaStatus, nowMs: number): Step<CoolingState> {
  if (state.session !== null) return { state: { ...state, display: 'on' }, actions: [] };
  const reason = state.pendingReason ?? 'manual';
  const durationS = state.pendingDurationS ?? status.coolingRemainingS;
  const session: CoolingSession = {
    startMs: nowMs,
    plannedEndMs: nowMs + Math.min(durationS * MS_PER_S, MAX_CONTINUOUS_MS),
    reason,
    isExtended: false,
    isOffRequested: false,
    hasSpokenCalmer: false,
  };
  return {
    state: { ...state, display: 'on', session, startingSinceMs: null, pendingReason: null, pendingDurationS: null },
    actions: [
      { a: 'logEvent', type: 'cooling_start', source: reason },
      { a: 'haptic', pattern: 'coolingStarted' },
    ],
  };
}

function applyConnection(state: CoolingState, connected: boolean, nowMs: number): Step<CoolingState> {
  if (connected === state.isConnected) return { state, actions: [] };
  if (!connected) {
    const ended = endSession({ ...state, startingSinceMs: null, pendingReason: null }, 'off', nowMs);
    return { state: { ...ended.state, isConnected: false }, actions: [...ended.actions, { a: 'logEvent', type: 'disconnect' }] };
  }
  const actions: EngineAction[] = state.hasEverConnected ? [{ a: 'logEvent', type: 'reconnect' }] : [];
  return { state: { ...state, isConnected: true, hasEverConnected: true }, actions };
}

function applyCoolingField(state: CoolingState, status: TarhaStatus, nowMs: number): Step<CoolingState> {
  switch (status.cooling) {
    case 'on':
      return startSession(state, status, nowMs);
    case 'off':
      return state.display === 'starting' ? { state, actions: [] } : endSession(state, 'off', nowMs);
    default:
      return endSession({ ...state, startingSinceMs: null, pendingReason: null }, status.cooling, nowMs);
  }
}

export function applyStatus(state: CoolingState, status: TarhaStatus, connected: boolean, nowMs: number): Step<CoolingState> {
  const conn = applyConnection(state, connected, nowMs);
  if (!connected) return conn;
  const next = applyCoolingField({ ...conn.state, batteryPct: status.batteryPct }, status, nowMs);
  const isLowWhileOn = next.state.display === 'on' && status.batteryPct <= BATT_LOCK;
  const stop = isLowWhileOn ? requestCoolOff(next.state, 'battery') : { state: next.state, actions: [] };
  return { state: stop.state, actions: [...conn.actions, ...next.actions, ...stop.actions] };
}

/** Per-second housekeeping: the 2 s start confirmation and the session timer. */
export function tickCooling(state: CoolingState, nowMs: number): Step<CoolingState> {
  if (state.display === 'starting' && state.startingSinceMs !== null && nowMs - state.startingSinceMs >= COOL_CONFIRM_S * MS_PER_S) {
    return { state: { ...state, display: 'off', startingSinceMs: null, pendingReason: null, hasStartFailed: true }, actions: [] };
  }
  const s = state.session;
  if (state.display === 'on' && s !== null && !s.isOffRequested && nowMs >= s.plannedEndMs) {
    return requestCoolOff(state, s.plannedEndMs >= s.startMs + MAX_CONTINUOUS_MS ? 'rest' : 'timer');
  }
  return { state, actions: [] };
}
