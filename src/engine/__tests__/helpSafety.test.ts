import { ENGINE_ACTION_KINDS } from '../types';
import { CALM_HIGH, CALM_OK, CALM_VERY_HIGH, count, has, MIN, Rig, SEC } from './harness';

describe('help question (07 §5.4, 12 §2.2)', () => {
  test('asks after 10 min at S ≥ 85 when the prompt was shown in this episode', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.send({ t: 'promptAnswer', yes: false });
    expect(has(rig.ticks(600, CALM_VERY_HIGH), 'askHelp')).toBe(false);
    expect(rig.ticks(1, CALM_VERY_HIGH)).toEqual(
      expect.arrayContaining([{ a: 'askHelp' }, { a: 'notify', kind: 'helpQuestion' }, { a: 'logEvent', type: 'help_question_shown' }]),
    );
  });

  test('asks after 10 min at S ≥ 85 despite cooling', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    rig.ticks(61, CALM_HIGH);
    expect(has(rig.ticks(601, CALM_VERY_HIGH), 'askHelp')).toBe(true);
  });

  test('the help question only ever comes after the prompt (or cooling) in that episode', () => {
    const rig = new Rig();
    rig.send({ t: 'mute', untilMs: 2 * MIN });
    rig.ticks(61, CALM_HIGH); // episode starts muted: no prompt, so no help question either
    expect(has(rig.log, 'askHelp') || has(rig.log, 'showPrompt')).toBe(false);
    rig.send({ t: 'mute', untilMs: null });
    rig.ticks(900, CALM_VERY_HIGH);
    const kinds = rig.log.map((a) => a.a);
    expect(kinds.indexOf('showPrompt')).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf('askHelp')).toBeGreaterThan(kinds.indexOf('showPrompt'));
  });

  test('60 min cooldown after an engine-initiated question', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.ticks(601, CALM_VERY_HIGH);
    rig.send({ t: 'helpAnswer', yes: false });
    expect(has(rig.ticks(50 * 60, CALM_VERY_HIGH), 'askHelp')).toBe(false);
    expect(has(rig.ticks(22 * 60, CALM_VERY_HIGH), 'askHelp')).toBe(true);
    expect(count(rig.log, 'askHelp')).toBe(2);
  });

  test('never asked from invalid signal', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    expect(has(rig.ticks(900, null), 'askHelp')).toBe(false);
  });

  test('needs ≥ 80% valid seconds over the 10 min', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    expect(has(rig.ticks(1200, (i) => (i % 3 === 2 ? null : CALM_VERY_HIGH)), 'askHelp')).toBe(false);
  });

  test('suppressed while muted', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.send({ t: 'mute', untilMs: rig.mono + 60 * MIN });
    expect(has(rig.ticks(601, CALM_VERY_HIGH), 'askHelp')).toBe(false);
  });

  test('only one help question visible at a time', () => {
    const rig = new Rig();
    rig.ticks(61, CALM_HIGH);
    rig.ticks(601, CALM_VERY_HIGH);
    rig.advance(61 * MIN);
    expect(has(rig.ticks(601, CALM_VERY_HIGH), 'askHelp')).toBe(false);
    expect(rig.engine.snapshot().isHelpAsking).toBe(true);
  });
});

describe('safety structure (10 P8, 11 §8)', () => {
  test('the engine has no action that could send anything off the phone', () => {
    expect(ENGINE_ACTION_KINDS.filter((k) => /sms|send|compose|upload|network|location/i.test(k))).toEqual([]);
  });

  test('a long random session only ever emits declared action kinds', () => {
    const rig = new Rig();
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    rig.status();
    for (let i = 0; i < 5000; i += 1) {
      const r = rand();
      if (r < 0.01) rig.send({ t: 'promptAnswer', yes: rand() < 0.5 });
      else if (r < 0.015) rig.send({ t: 'userCool', on: rand() < 0.5 });
      else if (r < 0.02) rig.status(rand() < 0.5 ? 'on' : 'off', Math.round(rand() * 100), rand() < 0.95);
      else if (r < 0.022) rig.send({ t: 'helpAnswer', yes: false });
      else rig.ticks(1, rand() < 0.1 ? null : Math.round(rand() * 100));
    }
    expect(rig.log.every((a) => ENGINE_ACTION_KINDS.includes(a.a))).toBe(true);
    expect(rig.log.filter((a) => a.a === 'coolOn').every((a) => a.a === 'coolOn' && a.durationS <= 1200)).toBe(true);
  });

  test('no alerts while disconnected and invalid', () => {
    const rig = new Rig();
    const actions = rig.ticks(20 * 60, null);
    expect(has(actions, 'showPrompt') || has(actions, 'askHelp')).toBe(false);
  });

  test('engine step stays under 2 ms (06 §10, 12 §7)', () => {
    const rig = new Rig();
    rig.status();
    const start = performance.now();
    rig.ticks(10_000, (i) => (i % 400 < 200 ? CALM_HIGH : CALM_OK));
    expect((performance.now() - start) / 10_000).toBeLessThan(2);
    expect(rig.mono).toBe(10_000 * SEC);
  });
});
