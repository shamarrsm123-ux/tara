// Try-flow navigation and lifecycle (03 §0.1, Flows L → 0 → 1 → 1b → 2; 11 §1). Pure reducer.
// Lifecycle `fresh` → `trying` when the language is chosen. Nothing in this state is ever written to disk:
// storage is created only on Screen 5 "Yes" (Phase 6).
import type { Lang } from '../shared/types';

export type TryScreen = 'language' | 'welcome' | 'connect' | 'calibrate' | 'home';
export type Lifecycle = 'fresh' | 'trying';

export interface TryState {
  screen: TryScreen;
  lifecycle: Lifecycle;
  lang: Lang | null;
  isConnected: boolean;
  isDemo: boolean;
  isCalibrationSkipped: boolean;
}

export type TryAction =
  | { type: 'chooseLanguage'; lang: Lang }
  | { type: 'continue' }
  | { type: 'tryToCalm' }
  | { type: 'connected'; isDemo: boolean }
  | { type: 'next' }
  | { type: 'calibrated' }
  | { type: 'skipCalibration' }
  | { type: 'back' };

export const INITIAL_TRY: TryState = {
  screen: 'language',
  lifecycle: 'fresh',
  lang: null,
  isConnected: false,
  isDemo: false,
  isCalibrationSkipped: false,
};

const BACK: Record<TryScreen, TryScreen | null> = {
  language: null,
  welcome: 'language',
  connect: 'welcome',
  calibrate: 'connect',
  home: 'calibrate',
};

/** 03 §0.2: back is allowed on every Try screen (Screen 3's active cooling is handled in Phase 5). */
export function canGoBack(state: TryState): boolean {
  return BACK[state.screen] !== null;
}

export function reduceTry(state: TryState, action: TryAction): TryState {
  switch (action.type) {
    case 'chooseLanguage':
      return { ...state, lang: action.lang };
    case 'continue':
      return state.screen === 'language' && state.lang !== null ? { ...state, screen: 'welcome', lifecycle: 'trying' } : state;
    case 'tryToCalm':
      return state.screen === 'welcome' ? { ...state, screen: 'connect' } : state;
    case 'connected':
      return { ...state, isConnected: true, isDemo: action.isDemo };
    case 'next':
      return state.screen === 'connect' && state.isConnected ? { ...state, screen: 'calibrate' } : state;
    case 'calibrated':
      return state.screen === 'calibrate' ? { ...state, screen: 'home', isCalibrationSkipped: false } : state;
    case 'skipCalibration':
      return state.screen === 'calibrate' ? { ...state, screen: 'home', isCalibrationSkipped: true } : state;
    case 'back': {
      const previous = BACK[state.screen];
      return previous === null ? state : { ...state, screen: previous };
    }
  }
}
