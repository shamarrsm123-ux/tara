// The engine (09 §4): pure, deterministic decisions from inputs + an injected clock. Implements 07 §5 and
// 11 §3–5. The monotonic `nowMono` drives every timer; the wall clock is used only to bucket "per day"
// counters (3 No's a day, one phone-battery alert a day).
import type { Clock, Settings, VoiceLineId, Zone } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import { applyPhoneBattery, applyTarhaBattery, INITIAL_BATTERY, type BatteryState } from './battery';
import {
  AUTO_COOL_MIN_GAP_MIN,
  HELP_COOLDOWN_MIN,
  HELP_SUSTAIN_MIN,
  NO_COUNT_ASK,
  PROMPT_COOLDOWN_MIN,
  SUSTAIN_S,
  ZONE_VERY_HIGH_MIN_S,
} from './constants';
import {
  applyStatus,
  canExtend,
  coolBlockReason,
  extendCooling,
  INITIAL_COOLING,
  requestCoolOff,
  requestCoolOn,
  tickCooling,
  type CoolingState,
} from './cooling';
import { INITIAL_EPISODE, stepEpisode, type EpisodeState } from './episode';
import { classify, pushSustain, sustainOutcome, type Sustain } from './sustain';
import type { EngineAction, EngineInput, EngineSnapshot, Step } from './types';

const MS_PER_MIN = 60_000;

interface PromptState {
  isShowing: boolean;
  cooldownUntilMs: number;
  lastAutoStartMs: number;
  noCount: number;
  noDay: string | null;
  alertLessAskedDay: string | null;
}

interface HelpState {
  window: Sustain | null;
  isAsking: boolean;
  cooldownUntilMs: number;
}

export interface EngineState {
  settings: Settings;
  episode: EpisodeState;
  cooling: CoolingState;
  battery: BatteryState;
  prompt: PromptState;
  help: HelpState;
  muteUntilMs: number | null;
  /** In this episode, cooling ran or the prompt was shown (07 §5.4 precondition for the help question). */
  hasEpisodeIntervention: boolean;
  lastZone: Zone;
}

const NEVER = Number.NEGATIVE_INFINITY;

export function initialEngineState(settings: Settings = DEFAULT_SETTINGS): EngineState {
  return {
    settings,
    episode: INITIAL_EPISODE,
    cooling: INITIAL_COOLING,
    battery: INITIAL_BATTERY,
    prompt: { isShowing: false, cooldownUntilMs: NEVER, lastAutoStartMs: NEVER, noCount: 0, noDay: null, alertLessAskedDay: null },
    help: { window: null, isAsking: false, cooldownUntilMs: NEVER },
    muteUntilMs: null,
    hasEpisodeIntervention: false,
    lastZone: 'unknown',
  };
}

/** Local calendar day of a wall-clock time, for per-day counters. */
export function localDayKey(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const isMuted = (s: EngineState, now: number) => s.muteUntilMs !== null && now < s.muteUntilMs;
const voice = (s: EngineState, line: VoiceLineId): EngineAction[] => (s.settings.speakAutomatically ? [{ a: 'speak', line }] : []);
const withCooling = (s: EngineState, step: Step<CoolingState>): Step<EngineState> => ({ state: { ...s, cooling: step.state }, actions: step.actions });

/** 07 §5.2: on an episode start, ask (or auto-cool) unless cooling is on, muted, cooling down, or post-cooling quiet. */
function onEpisodeStart(s: EngineState, now: number): Step<EngineState> {
  const isBlocked =
    s.cooling.display !== 'off' || isMuted(s, now) || now < s.prompt.cooldownUntilMs || now < s.cooling.quietUntilMs || s.prompt.isShowing;
  if (isBlocked) return { state: s, actions: [] };

  if (s.settings.coolingMode === 'auto') {
    if (now < s.prompt.lastAutoStartMs + AUTO_COOL_MIN_GAP_MIN * MS_PER_MIN || coolBlockReason(s.cooling, now) !== null) {
      return { state: s, actions: [] };
    }
    const cool = requestCoolOn(s.cooling, 'auto', s.settings, now);
    return {
      state: {
        ...s,
        cooling: cool.state,
        hasEpisodeIntervention: true,
        prompt: { ...s.prompt, lastAutoStartMs: now, cooldownUntilMs: now + PROMPT_COOLDOWN_MIN * MS_PER_MIN },
      },
      actions: [...cool.actions, { a: 'notify', kind: 'coolBreak' }, ...voice(s, 'autoCooling')],
    };
  }

  return {
    state: { ...s, hasEpisodeIntervention: true, prompt: { ...s.prompt, isShowing: true } },
    actions: [
      { a: 'showPrompt' },
      { a: 'logEvent', type: 'prompt_shown' },
      { a: 'notify', kind: 'coolBreak' },
      ...voice(s, 'highPrompt'),
      { a: 'haptic', pattern: 'highPrompt' },
    ],
  };
}

/** 07 §5.4: very high for 10 min (≥ 80% valid) despite cooling or a prompt in this episode → only *ask*. */
function updateHelp(s: EngineState, stress: number | null, valid: boolean, now: number): Step<EngineState> {
  if (s.episode.phase !== 'high') return { state: { ...s, help: { ...s.help, window: null } }, actions: [] };
  const window = pushSustain(s.help.window, classify(valid, stress, (v) => v >= ZONE_VERY_HIGH_MIN_S), now);
  const outcome = window === null ? 'failed' : sustainOutcome(window, now, HELP_SUSTAIN_MIN * 60);
  if (outcome === 'waiting') return { state: { ...s, help: { ...s.help, window } }, actions: [] };
  const canAsk = outcome === 'met' && s.hasEpisodeIntervention && !isMuted(s, now) && now >= s.help.cooldownUntilMs && !s.help.isAsking;
  if (!canAsk) return { state: { ...s, help: { ...s.help, window: null } }, actions: [] };
  return {
    state: { ...s, help: { window: null, isAsking: true, cooldownUntilMs: now + HELP_COOLDOWN_MIN * MS_PER_MIN } },
    actions: [{ a: 'askHelp' }, { a: 'logEvent', type: 'help_question_shown' }, { a: 'notify', kind: 'helpQuestion' }, ...voice(s, 'helpQuestion')],
  };
}

/** 03 Flow 3: "You are calmer now", once per cooling session, when Calm returns to the Calm zone. */
function updateCalmer(s: EngineState, zone: Zone, valid: boolean): Step<EngineState> {
  const session = s.cooling.session;
  const isReturn = valid && zone === 'calm' && s.lastZone !== 'calm' && s.lastZone !== 'unknown';
  const next = { ...s, lastZone: valid ? zone : s.lastZone };
  if (!isReturn || session === null || s.cooling.display !== 'on' || session.hasSpokenCalmer) return { state: next, actions: [] };
  return {
    state: { ...next, cooling: { ...s.cooling, session: { ...session, hasSpokenCalmer: true } } },
    actions: voice(s, 'calmerNow'),
  };
}

function onTick(s0: EngineState, calm: number | null, zone: Zone, valid: boolean, now: number): Step<EngineState> {
  const stress = calm === null ? null : 100 - calm;
  const cool = withCooling(s0, tickCooling(s0.cooling, now));
  const ep = stepEpisode(cool.state.episode, stress, valid, now, SUSTAIN_S[cool.state.settings.alertSensitivity]);
  const s1: EngineState = {
    ...cool.state,
    episode: ep.state,
    hasEpisodeIntervention: ep.change === 'started' ? cool.state.cooling.display === 'on' : cool.state.hasEpisodeIntervention,
  };
  const episodeActions: EngineAction[] =
    ep.change === 'started' ? [{ a: 'logEvent', type: 'high_episode_start' }] : ep.change === 'ended' ? [{ a: 'logEvent', type: 'high_episode_end' }] : [];
  const prompt = ep.change === 'started' ? onEpisodeStart(s1, now) : { state: s1, actions: [] };
  const s2 = { ...prompt.state, hasEpisodeIntervention: prompt.state.hasEpisodeIntervention || prompt.state.cooling.display === 'on' };
  const help = updateHelp(s2, stress, valid, now);
  const calmer = updateCalmer(help.state, zone, valid);
  return { state: calmer.state, actions: [...cool.actions, ...episodeActions, ...prompt.actions, ...help.actions, ...calmer.actions] };
}

function onPromptAnswer(s: EngineState, yes: boolean, now: number, day: string): Step<EngineState> {
  if (!s.prompt.isShowing) return { state: s, actions: [] };
  const prompt = { ...s.prompt, isShowing: false, cooldownUntilMs: now + PROMPT_COOLDOWN_MIN * MS_PER_MIN };
  if (yes) {
    const cool = requestCoolOn(s.cooling, 'prompt', s.settings, now);
    return { state: { ...s, prompt, cooling: cool.state }, actions: [{ a: 'hidePrompt' }, { a: 'logEvent', type: 'prompt_yes' }, ...cool.actions] };
  }
  const noCount = (s.prompt.noDay === day ? s.prompt.noCount : 0) + 1;
  const shouldAsk = noCount === NO_COUNT_ASK && s.prompt.alertLessAskedDay !== day;
  return {
    state: { ...s, prompt: { ...prompt, noCount, noDay: day, alertLessAskedDay: shouldAsk ? day : s.prompt.alertLessAskedDay } },
    actions: [{ a: 'hidePrompt' }, { a: 'logEvent', type: 'prompt_no' }, ...(shouldAsk ? [{ a: 'askAlertLess' as const }] : [])],
  };
}

function onUserCool(s: EngineState, on: boolean, now: number): Step<EngineState> {
  if (!on) return withCooling(s, requestCoolOff(s.cooling, 'user'));
  const cool = requestCoolOn(s.cooling, 'manual', s.settings, now);
  if (!s.prompt.isShowing || cool.actions.length === 0) return { state: { ...s, cooling: cool.state }, actions: cool.actions };
  // She chose to cool herself while the prompt was up: that answers it.
  return {
    state: { ...s, cooling: cool.state, prompt: { ...s.prompt, isShowing: false, cooldownUntilMs: now + PROMPT_COOLDOWN_MIN * MS_PER_MIN } },
    actions: [{ a: 'hidePrompt' }, ...cool.actions],
  };
}

function onStatus(s: EngineState, input: Extract<EngineInput, { t: 'status' }>, now: number): Step<EngineState> {
  const cool = applyStatus(s.cooling, input.status, input.connected, now);
  const batt = input.connected ? applyTarhaBattery(s.battery, input.status.batteryPct, s.settings.speakAutomatically) : { state: s.battery, actions: [] };
  return { state: { ...s, cooling: cool.state, battery: batt.state }, actions: [...cool.actions, ...batt.actions] };
}

export function reduce(s: EngineState, input: EngineInput, now: number, day: string): Step<EngineState> {
  switch (input.t) {
    case 'tick':
      return onTick(s, input.calm, input.zone, input.valid, now);
    case 'status':
      return onStatus(s, input, now);
    case 'promptAnswer':
      return onPromptAnswer(s, input.yes, now, day);
    case 'helpAnswer':
      return { state: { ...s, help: { ...s.help, isAsking: false } }, actions: [] };
    case 'userCool':
      return onUserCool(s, input.on, now);
    case 'extendCooling':
      return withCooling(s, extendCooling(s.cooling, now));
    case 'mute':
      return { state: { ...s, muteUntilMs: input.untilMs }, actions: [] };
    case 'phoneBattery': {
      const b = applyPhoneBattery(s.battery, input.pct, s.cooling.isConnected, day, s.settings.speakAutomatically);
      return { state: { ...s, battery: b.state }, actions: b.actions };
    }
    case 'settings':
      return { state: { ...s, settings: input.settings }, actions: [] };
  }
}

export function snapshotOf(s: EngineState, now: number): EngineSnapshot {
  return {
    episode: s.episode.phase,
    isPromptShowing: s.prompt.isShowing,
    isHelpAsking: s.help.isAsking,
    cooling: s.cooling.display,
    coolBlockReason: coolBlockReason(s.cooling, now),
    hasCoolingStartFailed: s.cooling.hasStartFailed,
    coolingEndsAtMono: s.cooling.session?.plannedEndMs ?? null,
    canExtendCooling: canExtend(s.cooling),
    isMuted: isMuted(s, now),
    isConnected: s.cooling.isConnected,
    tarhaBatteryPct: s.cooling.batteryPct,
  };
}

export interface Engine {
  step(input: EngineInput, nowMono: number): EngineAction[];
  snapshot(): EngineSnapshot;
}

export function createEngine(clock: Clock, settings: Settings = DEFAULT_SETTINGS): Engine {
  let state = initialEngineState(settings);
  return {
    step(input, nowMono) {
      const result = reduce(state, input, nowMono, localDayKey(clock.nowMs()));
      state = result.state;
      return result.actions;
    },
    snapshot() {
      return snapshotOf(state, clock.monotonicMs());
    },
  };
}
