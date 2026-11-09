// Engine inputs, actions and snapshot (09 §4). The engine is the only producer of prompts, help questions
// and automatic cooling; the UI may only dispatch inputs.
import type { EventType, HapticPattern, NotifyKind, Settings, TarhaStatus, VoiceLineId, Zone } from '../shared/types';

export type EngineInput =
  | { t: 'tick'; calm: number | null; zone: Zone; valid: boolean }
  | { t: 'status'; status: TarhaStatus; connected: boolean }
  | { t: 'promptAnswer'; yes: boolean }
  | { t: 'helpAnswer'; yes: boolean }
  | { t: 'userCool'; on: boolean }
  | { t: 'extendCooling' }
  | { t: 'mute'; untilMs: number | null } // on the same monotonic timeline as `nowMono`
  | { t: 'phoneBattery'; pct: number }
  | { t: 'settings'; settings: Settings };

export type CoolOnReason = 'manual' | 'prompt' | 'auto';
/** 🟡 `battery` added: the app also stops cooling at ≤ 10% (11 §8 invariant 7), not only the firmware. */
export type CoolOffReason = 'user' | 'timer' | 'rest' | 'battery';

export type EngineAction =
  | { a: 'showPrompt' }
  | { a: 'hidePrompt' }
  | { a: 'coolOn'; durationS: number; reason: CoolOnReason }
  | { a: 'coolOff'; reason: CoolOffReason }
  | { a: 'askHelp' }
  | { a: 'askAlertLess' }
  | { a: 'notify'; kind: NotifyKind }
  | { a: 'logEvent'; type: EventType; source?: CoolOnReason }
  | { a: 'speak'; line: VoiceLineId }
  | { a: 'haptic'; pattern: HapticPattern };

/** Every action kind the engine can emit. Nothing here can send anything off the phone (10 P8). */
export const ENGINE_ACTION_KINDS: readonly EngineAction['a'][] = [
  'showPrompt',
  'hidePrompt',
  'coolOn',
  'coolOff',
  'askHelp',
  'askAlertLess',
  'notify',
  'logEvent',
  'speak',
  'haptic',
];

/** Cooling as displayed — always reconciled from tarha `status`, never assumed (11 §4). */
export type CoolingDisplay = 'off' | 'starting' | 'on' | 'locked_battery' | 'locked_rest' | 'fault';

/** Why cooling can't start right now (03 Flow 3 step 6). */
export type CoolBlockReason = 'disconnected' | 'battery' | 'rest' | 'busy';

export type EpisodePhase = 'none' | 'pending' | 'high';

export interface EngineSnapshot {
  episode: EpisodePhase;
  isPromptShowing: boolean;
  isHelpAsking: boolean;
  cooling: CoolingDisplay;
  coolBlockReason: CoolBlockReason | null;
  hasCoolingStartFailed: boolean;
  coolingEndsAtMono: number | null;
  canExtendCooling: boolean;
  isMuted: boolean;
  isConnected: boolean;
  tarhaBatteryPct: number | null;
}

export interface Step<S> {
  state: S;
  actions: EngineAction[];
}
