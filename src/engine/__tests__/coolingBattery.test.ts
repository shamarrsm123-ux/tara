import { CALM_HIGH, CALM_OK, events, has, MIN, Rig, SEC } from './harness';

describe('cooling (07 §5.3, 11 §4, 12 §2.2)', () => {
  test('default 10 min; displayed as on only after the tarha confirms', () => {
    const rig = new Rig();
    rig.status();
    expect(rig.send({ t: 'userCool', on: true })).toEqual([{ a: 'coolOn', durationS: 600, reason: 'manual' }]);
    expect(rig.engine.snapshot().cooling).toBe('starting');
    const confirmed = rig.status('on');
    expect(rig.engine.snapshot().cooling).toBe('on');
    expect(confirmed).toEqual(expect.arrayContaining([{ a: 'logEvent', type: 'cooling_start', source: 'manual' }, { a: 'haptic', pattern: 'coolingStarted' }]));
  });

  test('timer ends the session at 10 min', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    expect(has(rig.ticks(600, CALM_OK), 'coolOff')).toBe(false);
    expect(rig.ticks(1, CALM_OK)).toContainEqual({ a: 'coolOff', reason: 'timer' });
  });

  test('no confirmation within 2 s → back to off with "couldn\'t start"', () => {
    const rig = new Rig();
    rig.status();
    rig.send({ t: 'userCool', on: true });
    rig.ticks(2, CALM_OK);
    expect(rig.engine.snapshot().cooling).toBe('starting');
    rig.ticks(1, CALM_OK);
    expect(rig.engine.snapshot()).toMatchObject({ cooling: 'off', hasCoolingStartFailed: true });
  });

  test('one extension of +10 min only', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    expect(rig.send({ t: 'extendCooling' })).toEqual([{ a: 'coolOn', durationS: 1200, reason: 'manual' }]);
    expect(rig.engine.snapshot().canExtendCooling).toBe(false);
    expect(rig.send({ t: 'extendCooling' })).toEqual([]);
  });

  test('never more than 20 min continuous, then a 5 min rest', () => {
    const rig = new Rig({ coolingMinutes: 15 });
    rig.status();
    rig.coolingOn();
    expect(rig.send({ t: 'extendCooling' })).toEqual([{ a: 'coolOn', durationS: 1200, reason: 'manual' }]);
    expect(has(rig.ticks(1200, CALM_OK), 'coolOff')).toBe(false);
    expect(rig.ticks(1, CALM_OK)).toContainEqual({ a: 'coolOff', reason: 'rest' });
    rig.status('off');
    expect(rig.engine.snapshot().coolBlockReason).toBe('rest');
    expect(rig.send({ t: 'userCool', on: true })).toEqual([]);
    rig.advance(5 * MIN);
    expect(rig.engine.snapshot().coolBlockReason).toBeNull();
  });

  test('locked at tarha battery ≤ 10%', () => {
    const rig = new Rig();
    rig.status('off', 10);
    expect(rig.send({ t: 'userCool', on: true })).toEqual([]);
    expect(rig.engine.snapshot().coolBlockReason).toBe('battery');
  });

  test('the app also stops cooling when the battery drops to 10% (invariant 7)', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    expect(rig.status('on', 9)).toContainEqual({ a: 'coolOff', reason: 'battery' });
  });

  test('firmware lockouts are mirrored', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    rig.status('locked_rest');
    expect(rig.engine.snapshot()).toMatchObject({ cooling: 'locked_rest', coolBlockReason: 'rest' });
    rig.status('locked_battery', 8);
    expect(rig.engine.snapshot().cooling).toBe('locked_battery');
  });

  test('stop works any time; user stop', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    expect(rig.send({ t: 'userCool', on: false })).toEqual([{ a: 'coolOff', reason: 'user' }]);
  });

  test('disconnect mid-cooling → not connected, cooling off, events logged; reconnect logged', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    const lost = rig.status('on', 80, false);
    expect(events(lost)).toEqual(['cooling_stop', 'disconnect']);
    expect(rig.engine.snapshot()).toMatchObject({ cooling: 'off', isConnected: false, coolBlockReason: 'disconnected' });
    expect(events(rig.status())).toEqual(['reconnect']);
  });

  test('cannot cool while disconnected', () => {
    expect(new Rig().send({ t: 'userCool', on: true })).toEqual([]);
  });

  test('"You are calmer now" once per session when Calm returns to the Calm zone', () => {
    const rig = new Rig();
    rig.status();
    rig.coolingOn();
    rig.ticks(1, CALM_HIGH);
    expect(rig.ticks(1, CALM_OK)).toContainEqual({ a: 'speak', line: 'calmerNow' });
    rig.ticks(1, CALM_HIGH);
    expect(rig.ticks(1, CALM_OK)).not.toContainEqual({ a: 'speak', line: 'calmerNow' });
  });
});

describe('battery alerts (07 §7, 03 Flow 12)', () => {
  test('≤ 20% alerts once per charge cycle and re-arms above 30%', () => {
    const rig = new Rig();
    rig.status('off', 25);
    expect(rig.status('off', 20)).toContainEqual({ a: 'notify', kind: 'batteryLow' });
    expect(rig.status('off', 19)).toEqual([]);
    rig.status('off', 31);
    expect(rig.status('off', 20)).toContainEqual({ a: 'notify', kind: 'batteryLow' });
  });

  test('jumping past several thresholds fires only the most severe', () => {
    const rig = new Rig();
    const actions = rig.status('off', 8);
    expect(actions).toContainEqual({ a: 'notify', kind: 'batteryLock' });
    expect(actions).not.toContainEqual({ a: 'notify', kind: 'batteryLow' });
    expect(rig.status('off', 3)).toContainEqual({ a: 'notify', kind: 'batteryOff' });
  });

  test('phone ≤ 15% while monitoring: once a day, never when not monitoring', () => {
    const rig = new Rig();
    expect(rig.send({ t: 'phoneBattery', pct: 10 })).toEqual([]);
    rig.status();
    expect(rig.send({ t: 'phoneBattery', pct: 15 })).toContainEqual({ a: 'notify', kind: 'phoneBatteryLow' });
    expect(rig.send({ t: 'phoneBattery', pct: 12 })).toEqual([]);
    rig.wallDays = 1;
    expect(rig.send({ t: 'phoneBattery', pct: 12 })).toContainEqual({ a: 'notify', kind: 'phoneBatteryLow' });
  });

  test('mute does not silence battery alerts (07 §5.5)', () => {
    const rig = new Rig();
    rig.send({ t: 'mute', untilMs: 60 * MIN });
    expect(rig.status('off', 20)).toContainEqual({ a: 'notify', kind: 'batteryLow' });
  });

  test('timing sanity: ticks advance one second each', () => {
    const rig = new Rig();
    rig.ticks(3, CALM_OK);
    expect(rig.mono).toBe(3 * SEC);
  });
});
