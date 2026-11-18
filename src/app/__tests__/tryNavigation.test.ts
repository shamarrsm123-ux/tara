import { canGoBack, INITIAL_TRY, isSetupStep, reduceTry, setUpState, type TryAction, type TryState } from '../tryNavigation';

const run = (...actions: TryAction[]): TryState => actions.reduce(reduceTry, INITIAL_TRY);
const from = (state: TryState, ...actions: TryAction[]): TryState => actions.reduce(reduceTry, state);
const toIntro: TryAction[] = [{ type: 'chooseLanguage', lang: 'en' }, { type: 'continue' }];
const toCalibrate: TryAction[] = [...toIntro, { type: 'getStarted' }, { type: 'connected', isDemo: true }, { type: 'next' }];

describe('onboarding (03 Flows O1–O5, 11 §1)', () => {
  test('starts fresh on the language screen; Continue needs a language and moves fresh → trying', () => {
    expect(INITIAL_TRY).toMatchObject({ screen: 'language', lifecycle: 'fresh', lang: null });
    expect(run({ type: 'continue' }).screen).toBe('language');
    expect(run(...toIntro)).toMatchObject({ screen: 'intro', lifecycle: 'trying', lang: 'en' });
  });

  test('Meet TARA → the 30-second demo and back, or Get started → Connect', () => {
    const intro = run(...toIntro);
    expect(from(intro, { type: 'watchDemo' }).screen).toBe('story');
    expect(from(intro, { type: 'watchDemo' }, { type: 'storyDone' }).screen).toBe('intro');
    expect(from(intro, { type: 'watchDemo' }, { type: 'back' }).screen).toBe('intro');
    expect(from(intro, { type: 'getStarted' }).screen).toBe('connect');
  });

  test('Next on Connect needs a connected tarha; calibration (done or skipped) leads to Keep TARA', () => {
    const atConnect = run(...toIntro, { type: 'getStarted' });
    expect(reduceTry(atConnect, { type: 'next' }).screen).toBe('connect');
    const atCalibrate = run(...toCalibrate);
    expect(atCalibrate).toMatchObject({ screen: 'calibrate', isDemo: true });
    expect(reduceTry(atCalibrate, { type: 'calibrated' })).toMatchObject({ screen: 'save', isCalibrationSkipped: false });
    expect(reduceTry(atCalibrate, { type: 'skipCalibration' })).toMatchObject({ screen: 'save', isCalibrationSkipped: true });
  });

  test('"No" keeps TARA for this session (Try home, still trying); its card returns to the question', () => {
    const home = run(...toCalibrate, { type: 'calibrated' }, { type: 'notSaved' });
    expect(home).toMatchObject({ screen: 'home', lifecycle: 'trying' });
    expect(canGoBack(home)).toBe(false);
    expect(from(home, { type: 'askSave' }).screen).toBe('save');
  });

  test('"Yes" → setUp and the setup steps in order → Daily mode with the one-time tip', () => {
    const name = run(...toCalibrate, { type: 'calibrated' }, { type: 'saved' });
    expect(name).toMatchObject({ screen: 'setupName', lifecycle: 'setUp' });
    const screens = [name.screen];
    let s = name;
    for (let i = 0; i < 5; i += 1) {
      s = reduceTry(s, { type: 'setupNext' });
      screens.push(s.screen);
    }
    expect(screens).toEqual(['setupName', 'setupAge', 'setupCycle', 'setupReminders', 'setupFamily', 'daily']);
    expect(s.isFirstDaily).toBe(true);
    expect(reduceTry(s, { type: 'tipSeen' }).isFirstDaily).toBe(false);
  });

  test('back works among setup steps but never back to the Save question', () => {
    const name = run(...toCalibrate, { type: 'calibrated' }, { type: 'saved' });
    expect(canGoBack(name)).toBe(false);
    const cycle = from(name, { type: 'setupNext' }, { type: 'setupNext' });
    expect(from(cycle, { type: 'back' }).screen).toBe('setupAge');
    expect(isSetupStep('setupCycle')).toBe(true);
    expect(isSetupStep('daily')).toBe(false);
  });

  test('actions that do not apply to the current screen are ignored', () => {
    expect(reduceTry(INITIAL_TRY, { type: 'getStarted' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'calibrated' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'saved' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'setupNext' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'back' })).toBe(INITIAL_TRY);
  });
});

describe('Daily mode (11 §1)', () => {
  test('a saved app opens in Daily mode; Learn my calm again goes and comes back; reset is a fresh install', () => {
    const daily = setUpState('ar_EG');
    expect(daily).toMatchObject({ screen: 'daily', lifecycle: 'setUp', lang: 'ar_EG' });
    expect(from(daily, { type: 'recalibrate' }).screen).toBe('recalibrate');
    expect(from(daily, { type: 'recalibrate' }, { type: 'recalibrated' }).screen).toBe('daily');
    expect(from(daily, { type: 'reset' })).toEqual(INITIAL_TRY);
  });
});
