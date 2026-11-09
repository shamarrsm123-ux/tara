import { commandFirmware, initialFirmware, statusOf, tickFirmware } from '../firmware';

const run = (seconds: number, battery = 80, state = commandFirmware(initialFirmware(battery), { op: 'coolOn', durationS: 600 })) =>
  Array.from({ length: seconds }).reduce<typeof state>((s) => tickFirmware(s, 1, battery), state);

describe('firmware simulator (07 §5.3, 08 §8, 12 §5)', () => {
  test('cools for the requested duration, then stops by itself', () => {
    expect(run(599).cooling).toBe('on');
    expect(run(600).cooling).toBe('off');
  });

  test('caps any request at 1200 s', () => {
    expect(commandFirmware(initialFirmware(80), { op: 'coolOn', durationS: 5000 }).remainingS).toBe(1200);
  });

  test('stops at 20 min continuous even if asked for more, then rests 5 min', () => {
    const on = commandFirmware(initialFirmware(80), { op: 'coolOn', durationS: 1200 });
    const at20 = run(1200, 80, on);
    expect(at20.cooling).toBe('locked_rest');
    expect(commandFirmware(at20, { op: 'coolOn', durationS: 600 }).cooling).toBe('locked_rest');
    expect(run(300, 80, at20).cooling).toBe('off');
  });

  test('refuses to cool and stops cooling at battery ≤ 10%', () => {
    expect(commandFirmware(initialFirmware(10), { op: 'coolOn', durationS: 600 }).cooling).toBe('locked_battery');
    const on = commandFirmware(initialFirmware(50), { op: 'coolOn', durationS: 600 });
    expect(tickFirmware(on, 1, 9).cooling).toBe('locked_battery');
    expect(tickFirmware(tickFirmware(on, 1, 9), 1, 40).cooling).toBe('off');
  });

  test('COOL_OFF stops immediately; status reports the state', () => {
    const on = commandFirmware(initialFirmware(70), { op: 'coolOn', durationS: 600 });
    expect(statusOf(on)).toEqual({ batteryPct: 70, cooling: 'on', coolingRemainingS: 600, faults: 0 });
    expect(statusOf(commandFirmware(on, { op: 'coolOff' })).cooling).toBe('off');
  });
});
