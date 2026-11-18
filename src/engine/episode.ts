// High-stress episode state machine (07 §5.1, 11 §3): none → pending → high → none. Pure.
import { HIGH_END_HOLD_S, HIGH_END_NO_SIGNAL_MIN, HIGH_END_S, ZONE_HIGH_MIN_S } from './constants';
import { classify, pushSustain, sustainOutcome, type Sustain } from './sustain';
import type { EpisodePhase } from './types';

export interface EpisodeState {
  phase: EpisodePhase;
  pending: Sustain | null;
  calmHoldStartMs: number | null;
  lastValidMs: number | null;
}

export const INITIAL_EPISODE: EpisodeState = { phase: 'none', pending: null, calmHoldStartMs: null, lastValidMs: null };

export type EpisodeChange = 'started' | 'ended' | null;

interface EpisodeStep {
  state: EpisodeState;
  change: EpisodeChange;
}

const MS_PER_S = 1000;
const MS_PER_MIN = 60_000;

function stepPending(state: EpisodeState, stress: number | null, valid: boolean, nowMs: number, sustainS: number, highMinS: number): EpisodeStep {
  const pending = pushSustain(state.pending, classify(valid, stress, (v) => v >= highMinS), nowMs);
  if (pending === null) return { state: { ...state, phase: 'none', pending: null }, change: null };
  const outcome = sustainOutcome(pending, nowMs, sustainS);
  if (outcome === 'met') return { state: { ...state, phase: 'high', pending: null, calmHoldStartMs: null }, change: 'started' };
  if (outcome === 'failed') return { state: { ...state, phase: 'none', pending: null }, change: null };
  return { state: { ...state, phase: 'pending', pending }, change: null };
}

function stepHigh(state: EpisodeState, stress: number | null, valid: boolean, nowMs: number): EpisodeStep {
  if (!valid || stress === null) {
    const isSilent = state.lastValidMs === null || nowMs - state.lastValidMs >= HIGH_END_NO_SIGNAL_MIN * MS_PER_MIN;
    return isSilent
      ? { state: { ...INITIAL_EPISODE, lastValidMs: state.lastValidMs }, change: 'ended' }
      : { state: { ...state, calmHoldStartMs: null }, change: null };
  }
  if (stress > HIGH_END_S) return { state: { ...state, calmHoldStartMs: null }, change: null };
  const holdStart = state.calmHoldStartMs ?? nowMs;
  if (nowMs - holdStart >= HIGH_END_HOLD_S * MS_PER_S) return { state: { ...INITIAL_EPISODE }, change: 'ended' };
  return { state: { ...state, calmHoldStartMs: holdStart }, change: null };
}

/** `highMinS` is the high-zone threshold, lowered in harder cycle phases (07 §10.3). */
export function stepEpisode(
  state: EpisodeState,
  stress: number | null,
  valid: boolean,
  nowMs: number,
  sustainS: number,
  highMinS: number = ZONE_HIGH_MIN_S,
): EpisodeStep {
  const isValidSecond = valid && stress !== null;
  const result = state.phase === 'high' ? stepHigh(state, stress, valid, nowMs) : stepPending(state, stress, valid, nowMs, sustainS, highMinS);
  return {
    state: { ...result.state, lastValidMs: isValidSecond ? nowMs : result.state.lastValidMs },
    change: result.change,
  };
}
