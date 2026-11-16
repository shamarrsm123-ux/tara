import { CALM_HIGH, CALM_OK, count, events, has, MIN, Rig } from './harness';

describe('high episode (07 §5.1, 11 §3, 12 §2.2)', () => {
  test.each([
    ['fewer', 90],
    ['more', 45],
    ['normal', 60],
  ] as const)('%s sensitivity: starts only after W = %i s', (alertSensitivity, w) => {
    const rig = new Rig({ alertSensitivity });
    expect(has(rig.ticks(w, CALM_HIGH), 'showPrompt')).toBe(false);
    const at = rig.ticks(1, CALM_HIGH);
    expect(events(at)).toContain('high_episode_start');
    expect(has(at, 'showPrompt')).toBe(true);
  });

  test('needs ≥ 80% valid seconds in the window', () => {
    const mostlyValid = new Rig();
    expect(events(mostlyValid.ticks(61, (i) => (i % 10 === 9 ? null : CALM_HIGH)))).toContain('high_episode_start');

    const tooManyGaps = new Rig();
    expect(events(tooManyGaps.ticks(400, (i) => (i % 3 === 2 ? null : CALM_HIGH)))).not.toContain('high_episode_start');
  });

  test('S oscillating 68–72 does not start an episode', () => {
    const rig = new Rig();
    expect(events(rig.ticks(600, (i) => (i % 2 === 0 ? 32 : 28)))).not.toContain('high_episode_start');
  });

  test('once high, 68–72 does not end it; it ends only after S ≤ 55 for 60 s', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    expect(events(rig.ticks(300, (i) => (i % 2 === 0 ? 32 : 28)))).not.toContain('high_episode_end');
    expect(events(rig.ticks(60, 50))).not.toContain('high_episode_end');
    expect(events(rig.ticks(1, 50))).toContain('high_episode_end');
  });

  test('a stress spike during the calm hold restarts the 60 s', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.ticks(40, 50);
    rig.ticks(1, 40); // S = 60 > 55
    expect(events(rig.ticks(60, 50))).not.toContain('high_episode_end');
    expect(events(rig.ticks(1, 50))).toContain('high_episode_end');
  });

  test('ends after 10 min with no valid signal', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    expect(events(rig.ticks(599, null))).not.toContain('high_episode_end');
    expect(events(rig.ticks(2, null))).toContain('high_episode_end');
  });
});

/** Ends the current episode cleanly (S ≤ 55 for 60 s). */
const calmDown = (rig: Rig) => rig.ticks(61, CALM_OK);

describe('high-stress prompt (07 §5.2, 12 §2.2)', () => {
  test('shows with voice, long-long vibration and a neutral notification', () => {
    const rig = new Rig();
    const actions = rig.ticks(61, CALM_HIGH);
    expect(actions).toEqual(
      expect.arrayContaining([
        { a: 'showPrompt' },
        { a: 'speak', line: 'highPrompt' },
        { a: 'haptic', pattern: 'highPrompt' },
        { a: 'notify', kind: 'coolBreak' },
        { a: 'logEvent', type: 'prompt_shown' },
      ]),
    );
  });

  test('no voice when "Speak automatically" is off', () => {
    const rig = new Rig({ speakAutomatically: false });
    const actions = rig.ticks(61, CALM_HIGH);
    expect(has(actions, 'showPrompt')).toBe(true);
    expect(has(actions, 'speak')).toBe(false);
  });

  test('suppressed while cooling is on', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    expect(has(rig.ticks(120, CALM_HIGH), 'showPrompt')).toBe(false);
  });

  test('suppressed while muted, and back after mute ends', () => {
    const rig = new Rig();
    rig.send({ t: 'mute', untilMs: 30 * MIN });
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(false);
    calmDown(rig);
    rig.advance(30 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('suppressed within 15 min of a No', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.send({ t: 'promptAnswer', yes: false });
    calmDown(rig);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(false);
    calmDown(rig);
    rig.advance(15 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('suppressed within 10 min after cooling ends', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    rig.status('off');
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(false);
    calmDown(rig);
    rig.advance(10 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('Yes → hides the prompt and asks the tarha to cool for the set length', () => {
    const rig = new Rig({ coolingMinutes: 15 });
    rig.status();
    rig.ticks(61, CALM_HIGH);
    const actions = rig.send({ t: 'promptAnswer', yes: true });
    expect(actions).toEqual(expect.arrayContaining([{ a: 'hidePrompt' }, { a: 'coolOn', durationS: 900, reason: 'prompt' }]));
  });

  test('third No in a day asks "alert less often?" exactly once', () => {
    const rig = new Rig();
    for (let i = 0; i < 4; i += 1) {
      rig.ticks(61, CALM_HIGH);
      const answer = rig.send({ t: 'promptAnswer', yes: false });
      expect(has(answer, 'askAlertLess')).toBe(i === 2);
      calmDown(rig);
      rig.advance(15 * MIN);
    }
    expect(count(rig.log, 'askAlertLess')).toBe(1);
  });

  test('the No count starts again on a new day', () => {
    const rig = new Rig();
    for (let i = 0; i < 2; i += 1) {
      rig.ticks(61, CALM_HIGH);
      rig.send({ t: 'promptAnswer', yes: false });
      calmDown(rig);
      rig.advance(15 * MIN);
    }
    rig.wallDays = 1;
    rig.ticks(61, CALM_HIGH);
    expect(has(rig.send({ t: 'promptAnswer', yes: false }), 'askAlertLess')).toBe(false);
  });

  test('only one prompt at a time (11 §8.8)', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    calmDown(rig);
    rig.advance(20 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(false);
    expect(rig.engine.snapshot().isPromptShowing).toBe(true);
  });

  test('a manual Cool while the prompt is up answers it', () => {
    const rig = new Rig();
    rig.status();
    rig.ticks(61, CALM_HIGH);
    expect(has(rig.send({ t: 'userCool', on: true }), 'hidePrompt')).toBe(true);
    expect(rig.engine.snapshot().isPromptShowing).toBe(false);
  });
});

describe('re-asking while stress stays high (03 Flow 3, 12 §6 flow 3; decision 2026-11-16)', () => {
  test('after a No, asks again once the 15 min are over if still high', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.send({ t: 'promptAnswer', yes: false });
    expect(has(rig.ticks(15 * 60 - 1, CALM_HIGH), 'showPrompt')).toBe(false);
    expect(has(rig.ticks(2, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('after cooling ends, asks again once the 10 min quiet and the 15 min cooldown are over', () => {
    const rig = new Rig();
    rig.status();
    rig.ticks(61, CALM_HIGH);
    rig.send({ t: 'promptAnswer', yes: true });
    rig.status('on');
    rig.ticks(60, CALM_HIGH);
    rig.send({ t: 'userCool', on: false });
    rig.status('off');
    expect(has(rig.ticks(14 * 60 - 1, CALM_HIGH), 'showPrompt')).toBe(false);
    expect(has(rig.ticks(62, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('a mute that ends during a high episode lets the prompt through', () => {
    const rig = new Rig();
    rig.send({ t: 'mute', untilMs: 2 * MIN });
    expect(has(rig.ticks(119, CALM_HIGH), 'showPrompt')).toBe(false);
    expect(has(rig.ticks(2, CALM_HIGH), 'showPrompt')).toBe(true);
  });
});

describe('"alert less often?" and the blocked-cooling card', () => {
  const threeNos = (rig: Rig) => {
    for (let i = 0; i < 3; i += 1) {
      rig.ticks(61, CALM_HIGH);
      rig.send({ t: 'promptAnswer', yes: false });
      calmDown(rig);
      rig.advance(15 * MIN);
    }
  };

  test('Yes uses the longer "fewer" window (90 s) for the rest of the day', () => {
    const rig = new Rig();
    threeNos(rig);
    expect(rig.engine.snapshot().isAskingAlertLess).toBe(true);
    rig.send({ t: 'alertLessAnswer', yes: true });
    expect(rig.engine.snapshot()).toMatchObject({ isAskingAlertLess: false, isAlertLessToday: true });
    expect(has(rig.ticks(90, CALM_HIGH), 'showPrompt')).toBe(false);
    expect(has(rig.ticks(1, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('No keeps the normal window', () => {
    const rig = new Rig();
    threeNos(rig);
    rig.send({ t: 'alertLessAnswer', yes: false });
    expect(rig.engine.snapshot().isAlertLessToday).toBe(false);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('the next day is back to normal', () => {
    const rig = new Rig();
    threeNos(rig);
    rig.send({ t: 'alertLessAnswer', yes: true });
    rig.wallDays = 1;
    expect(rig.engine.snapshot().isAlertLessToday).toBe(false);
    expect(has(rig.ticks(61, CALM_HIGH), 'showPrompt')).toBe(true);
  });

  test('dismissing the "can\'t cool right now" card hides it without counting a No', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    expect(rig.send({ t: 'promptDismiss' })).toEqual([{ a: 'hidePrompt' }]);
    expect(events(rig.log)).not.toContain('prompt_no');
    expect(rig.send({ t: 'promptDismiss' })).toEqual([]);
  });
});

describe('automatic cooling (07 §5.2, 03 Flow 9.4)', () => {
  test('cools without asking; a second auto-start within 30 min is blocked', () => {
    const rig = new Rig({ coolingMode: 'auto' });
    rig.status();
    const first = rig.ticks(61, CALM_HIGH);
    expect(first).toEqual(expect.arrayContaining([{ a: 'coolOn', durationS: 600, reason: 'auto' }, { a: 'speak', line: 'autoCooling' }]));
    expect(has(first, 'showPrompt')).toBe(false);

    rig.status('on');
    rig.status('off');
    calmDown(rig);
    rig.advance(16 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'coolOn')).toBe(false);

    calmDown(rig);
    rig.advance(12 * MIN);
    expect(has(rig.ticks(61, CALM_HIGH), 'coolOn')).toBe(true);
  });
});
