// App navigation and lifecycle (03 §0.1 and Flows O1–O6, rebuilt 2026-11-17; 11 §1). Pure reducer.
// First run: Language → Meet TARA (or the 30-second demo) → Connect → Learn your calm → Keep TARA on this phone?
// "Yes" creates storage (lifecycle `setUp`) and opens the optional setup steps: name → age → PMDD-aware cooling
// → reminders → family → Daily mode. "No" keeps TARA running for this session with nothing saved (Try home).
// Delete Everything returns to a fresh install (`INITIAL_TRY`).
import type { Lang } from '../shared/types';

export type TryScreen =
  | 'language'
  | 'intro'
  | 'story'
  | 'connect'
  | 'calibrate'
  | 'save'
  | 'home'
  | 'setupName'
  | 'setupAge'
  | 'setupCycle'
  | 'setupReminders'
  | 'setupFamily'
  | 'daily'
  | 'recalibrate';
export type Lifecycle = 'fresh' | 'trying' | 'setUp';

/** The optional setup steps after "Yes", in order (03 Flow O6). */
export const SETUP_STEPS = ['setupName', 'setupAge', 'setupCycle', 'setupReminders', 'setupFamily'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export interface TryState {
  screen: TryScreen;
  lifecycle: Lifecycle;
  lang: Lang | null;
  isConnected: boolean;
  isDemo: boolean;
  isCalibrationSkipped: boolean;
  /** Daily mode was just reached from setup: show the one-time tip on Home (03 Flow O6 step 6). */
  isFirstDaily: boolean;
}

export type TryAction =
  | { type: 'chooseLanguage'; lang: Lang }
  | { type: 'continue' }
  | { type: 'getStarted' }
  | { type: 'watchDemo' }
  | { type: 'storyDone' }
  | { type: 'connected'; isDemo: boolean }
  | { type: 'next' }
  | { type: 'calibrated' }
  | { type: 'skipCalibration' }
  | { type: 'saved' }
  /** "No" on Keep TARA — use it for this session only; nothing is stored. */
  | { type: 'notSaved' }
  /** From the Try home's "Keep TARA on this phone?" card. */
  | { type: 'askSave' }
  /** Next setup step (each one is skippable; the screen itself saves her answer first). */
  | { type: 'setupNext' }
  | { type: 'tipSeen' }
  | { type: 'reset' }
  /** Settings → "Learn my calm again" (03 Flow 16) and its end. */
  | { type: 'recalibrate' }
  | { type: 'recalibrated' }
  | { type: 'back' };

export const INITIAL_TRY: TryState = {
  screen: 'language',
  lifecycle: 'fresh',
  lang: null,
  isConnected: false,
  isDemo: false,
  isCalibrationSkipped: false,
  isFirstDaily: false,
};

/** Launch state when the app is already set up: Daily mode, Home tab, in her saved language (11 §1). */
export function setUpState(lang: Lang): TryState {
  return { ...INITIAL_TRY, screen: 'daily', lifecycle: 'setUp', lang };
}

const BACK: Record<TryScreen, TryScreen | null> = {
  language: null,
  intro: 'language',
  story: 'intro',
  connect: 'intro',
  calibrate: 'connect',
  save: 'calibrate',
  // After "No" she uses TARA unsaved; the way forward is the Keep TARA card, not back into setup.
  home: null,
  // Once saved there is no way back to the Save question; setup steps go back among themselves.
  setupName: null,
  setupAge: 'setupName',
  setupCycle: 'setupAge',
  setupReminders: 'setupCycle',
  setupFamily: 'setupReminders',
  daily: null,
  recalibrate: 'daily',
};

export function canGoBack(state: TryState): boolean {
  return BACK[state.screen] !== null;
}

export function isSetupStep(screen: TryScreen): screen is SetupStep {
  return (SETUP_STEPS as readonly TryScreen[]).includes(screen);
}

function nextSetup(state: TryState): TryState {
  if (!isSetupStep(state.screen)) return state;
  const following = SETUP_STEPS[SETUP_STEPS.indexOf(state.screen) + 1];
  return following === undefined ? { ...state, screen: 'daily', isFirstDaily: true } : { ...state, screen: following };
}

const on = (state: TryState, screen: TryScreen, next: Partial<TryState>): TryState => (state.screen === screen ? { ...state, ...next } : state);

export function reduceTry(state: TryState, action: TryAction): TryState {
  switch (action.type) {
    case 'chooseLanguage':
      return { ...state, lang: action.lang };
    case 'continue':
      return state.screen === 'language' && state.lang !== null ? { ...state, screen: 'intro', lifecycle: 'trying' } : state;
    case 'getStarted':
      return on(state, 'intro', { screen: 'connect' });
    case 'watchDemo':
      return on(state, 'intro', { screen: 'story' });
    case 'storyDone':
      return on(state, 'story', { screen: 'intro' });
    case 'connected':
      return { ...state, isConnected: true, isDemo: action.isDemo };
    case 'next':
      return state.screen === 'connect' && state.isConnected ? { ...state, screen: 'calibrate' } : state;
    case 'calibrated':
      return on(state, 'calibrate', { screen: 'save', isCalibrationSkipped: false });
    case 'skipCalibration':
      return on(state, 'calibrate', { screen: 'save', isCalibrationSkipped: true });
    case 'saved':
      return on(state, 'save', { screen: 'setupName', lifecycle: 'setUp' });
    case 'notSaved':
      return on(state, 'save', { screen: 'home' });
    case 'askSave':
      return state.screen === 'home' && state.lifecycle === 'trying' ? { ...state, screen: 'save' } : state;
    case 'setupNext':
      return nextSetup(state);
    case 'tipSeen':
      return { ...state, isFirstDaily: false };
    case 'reset':
      return INITIAL_TRY;
    case 'recalibrate':
      return on(state, 'daily', { screen: 'recalibrate' });
    case 'recalibrated':
      return on(state, 'recalibrate', { screen: 'daily' });
    case 'back': {
      const previous = BACK[state.screen];
      return previous === null ? state : { ...state, screen: previous };
    }
  }
}
