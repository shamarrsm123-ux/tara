import { canGoBack, INITIAL_TRY, reduceTry, setUpState, type TryAction, type TryState } from '../tryNavigation';

const run = (...actions: TryAction[]): TryState => actions.reduce(reduceTry, INITIAL_TRY);
const toCalibrate: TryAction[] = [
  { type: 'chooseLanguage', lang: 'en' },
  { type: 'continue' },
  { type: 'tryToCalm' },
  { type: 'connected', isDemo: true },
  { type: 'next' },
];

describe('Try navigation (03 §0.1, 11 §1)', () => {
  test('starts fresh on the language screen', () => {
    expect(INITIAL_TRY).toMatchObject({ screen: 'language', lifecycle: 'fresh', lang: null });
  });

  test('Continue needs a language; choosing it moves fresh → trying', () => {
    expect(run({ type: 'continue' }).screen).toBe('language');
    expect(run({ type: 'chooseLanguage', lang: 'ar_EG' }).lifecycle).toBe('fresh');
    expect(run({ type: 'chooseLanguage', lang: 'ar_EG' }, { type: 'continue' })).toMatchObject({ screen: 'welcome', lifecycle: 'trying', lang: 'ar_EG' });
  });

  test('Next on Connect needs a connected tarha', () => {
    const atConnect = run({ type: 'chooseLanguage', lang: 'en' }, { type: 'continue' }, { type: 'tryToCalm' });
    expect(reduceTry(atConnect, { type: 'next' }).screen).toBe('connect');
    expect(run(...toCalibrate)).toMatchObject({ screen: 'calibrate', isDemo: true });
  });

  test('calibration completes or is skipped into Home', () => {
    const atCalibrate = run(...toCalibrate);
    expect(reduceTry(atCalibrate, { type: 'calibrated' })).toMatchObject({ screen: 'home', isCalibrationSkipped: false });
    expect(reduceTry(atCalibrate, { type: 'skipCalibration' })).toMatchObject({ screen: 'home', isCalibrationSkipped: true });
  });

  test('back works on every Try screen except the first (03 §0.2)', () => {
    const home = run(...toCalibrate, { type: 'calibrated' });
    expect(reduceTry(home, { type: 'back' }).screen).toBe('calibrate');
    expect(canGoBack(home)).toBe(true);
    expect(canGoBack(INITIAL_TRY)).toBe(false);
    expect(reduceTry(INITIAL_TRY, { type: 'back' })).toBe(INITIAL_TRY);
  });

  test('actions that do not apply to the current screen are ignored', () => {
    expect(reduceTry(INITIAL_TRY, { type: 'tryToCalm' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'calibrated' })).toBe(INITIAL_TRY);
    expect(reduceTry(INITIAL_TRY, { type: 'skipCalibration' })).toBe(INITIAL_TRY);
  });
});

describe('Try story Screens 4–6 and Daily mode (03 Flows 4–6, 11 §1)', () => {
  const atHome = (): TryState => ({ ...INITIAL_TRY, screen: 'home', lifecycle: 'trying', lang: 'en', isConnected: true, isDemo: true });
  const run = (state: TryState, ...actions: TryAction[]) => actions.reduce(reduceTry, state);

  test('Home → Example → (answer required) → Save → Yes → Privacy → Daily', () => {
    const example = run(atHome(), { type: 'continueStory' });
    expect(example.screen).toBe('example');
    expect(run(example, { type: 'exampleDone' }).screen).toBe('example'); // must answer first
    const save = run(example, { type: 'answerExample', yes: false }, { type: 'exampleDone' });
    expect(save).toMatchObject({ screen: 'save', patternOffers: false, lifecycle: 'trying' });
    const privacy = run(save, { type: 'saved' });
    expect(privacy).toMatchObject({ screen: 'privacy', lifecycle: 'setUp' });
    expect(canGoBack(privacy)).toBe(false);
    expect(run(privacy, { type: 'privacyDone' }).screen).toBe('daily');
  });

  test('Screen 5 "No" and Delete Everything return to a fresh install', () => {
    const save = run(atHome(), { type: 'continueStory' }, { type: 'answerExample', yes: true }, { type: 'exampleDone' });
    expect(run(save, { type: 'reset' })).toEqual(INITIAL_TRY);
    expect(run(setUpState('am_ET'), { type: 'reset' })).toEqual(INITIAL_TRY);
  });

  test('a set-up app launches into Daily mode in her language; the story cannot be re-entered', () => {
    const daily = setUpState('am_ET');
    expect(daily).toMatchObject({ screen: 'daily', lifecycle: 'setUp', lang: 'am_ET' });
    expect(canGoBack(daily)).toBe(false);
    expect(run(daily, { type: 'continueStory' })).toBe(daily);
  });

  test('back walks the story: Save → Example → Home', () => {
    const save = run(atHome(), { type: 'continueStory' }, { type: 'answerExample', yes: true }, { type: 'exampleDone' });
    expect(run(save, { type: 'back' }).screen).toBe('example');
    expect(run(save, { type: 'back' }, { type: 'back' }).screen).toBe('home');
  });
});
