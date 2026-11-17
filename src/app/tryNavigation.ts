// App navigation and lifecycle (03 §0.1, Try story L → 0 → 1 → 1b → 2 → 4 → 5 → 6, then Daily mode; 11 §1).
// Pure reducer. Lifecycle `fresh` → `trying` when the language is chosen → `setUp` on Screen 5 "Yes"; Screen 5
// "No" and Delete Everything both return to a fresh install (`INITIAL_TRY`).
import type { Lang } from '../shared/types';

export type TryScreen = 'language' | 'welcome' | 'connect' | 'calibrate' | 'home' | 'example' | 'save' | 'privacy' | 'daily';
export type Lifecycle = 'fresh' | 'trying' | 'setUp';

export interface TryState {
  screen: TryScreen;
  lifecycle: Lifecycle;
  lang: Lang | null;
  isConnected: boolean;
  isDemo: boolean;
  isCalibrationSkipped: boolean;
  /** Screen 4 answer, kept in memory until Screen 5 "Yes" (03 Flow 4 step 2). */
  patternOffers: boolean | null;
}

export type TryAction =
  | { type: 'chooseLanguage'; lang: Lang }
  | { type: 'continue' }
  | { type: 'tryToCalm' }
  | { type: 'connected'; isDemo: boolean }
  | { type: 'next' }
  | { type: 'calibrated' }
  | { type: 'skipCalibration' }
  | { type: 'continueStory' }
  | { type: 'answerExample'; yes: boolean }
  | { type: 'exampleDone' }
  | { type: 'saved' }
  | { type: 'privacyDone' }
  | { type: 'reset' }
  | { type: 'back' };

export const INITIAL_TRY: TryState = {
  screen: 'language',
  lifecycle: 'fresh',
  lang: null,
  isConnected: false,
  isDemo: false,
  isCalibrationSkipped: false,
  patternOffers: null,
};

/** Launch state when the app is already set up: Daily mode, Home tab, in her saved language (11 §1). */
export function setUpState(lang: Lang): TryState {
  return { ...INITIAL_TRY, screen: 'daily', lifecycle: 'setUp', lang, isConnected: false };
}

const BACK: Record<TryScreen, TryScreen | null> = {
  language: null,
  welcome: 'language',
  connect: 'welcome',
  calibrate: 'connect',
  home: 'calibrate',
  example: 'home',
  save: 'example',
  // Once saved there is no way back into the Try story.
  privacy: null,
  daily: null,
};

/** 03 §0.2: back is allowed on every Try screen (Screen 3's active cooling is handled by the container). */
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
    case 'continueStory':
      return state.screen === 'home' && state.lifecycle === 'trying' ? { ...state, screen: 'example' } : state;
    case 'answerExample':
      return state.screen === 'example' ? { ...state, patternOffers: action.yes } : state;
    case 'exampleDone':
      return state.screen === 'example' && state.patternOffers !== null ? { ...state, screen: 'save' } : state;
    case 'saved':
      return state.screen === 'save' ? { ...state, screen: 'privacy', lifecycle: 'setUp' } : state;
    case 'privacyDone':
      return state.screen === 'privacy' ? { ...state, screen: 'daily' } : state;
    case 'reset':
      return INITIAL_TRY;
    case 'back': {
      const previous = BACK[state.screen];
      return previous === null ? state : { ...state, screen: previous };
    }
  }
}
