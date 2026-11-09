import { createMonitorSession, type MonitorSession } from '../../engine/session';
import type { EngineAction } from '../../engine/types';
import { detectPatterns } from '../../patterns/detect';
import { Calibrator } from '../../signal/calibrator';
import { DEFAULT_BASELINE } from '../../signal/stress';
import type { MetricsSample } from '../../shared/types';
import { DEMO_TARHA, DemoTarhaSource } from '../DemoTarhaSource';
import { badTwoPmWeekHistory } from '../history';
import { DEMO_SCENARIO_IDS, type DemoScenarioId } from '../scenarios';

const clock = { nowMs: () => Date.now(), monotonicMs: () => Date.now() };

interface Demo {
  source: DemoTarhaSource;
  session: MonitorSession;
  actions: EngineAction[];
  samples: MetricsSample[];
  advance(seconds: number): Promise<void>;
}

async function startDemo(id: DemoScenarioId, useDemoTiming = true): Promise<Demo> {
  const source = new DemoTarhaSource({ clock, scenario: id });
  const actions: EngineAction[] = [];
  const samples: MetricsSample[] = [];
  source.onMetrics((s) => samples.push(s));
  const session = createMonitorSession({
    source,
    clock,
    baseline: DEFAULT_BASELINE,
    timing: useDemoTiming ? { sustainS: source.scenario.sustainOverrideS } : {},
    onAction: (a) => actions.push(a),
  });
  await session.connect(DEMO_TARHA.id);
  source.startScenario();
  return {
    source,
    session,
    actions,
    samples,
    advance: async (seconds) => {
      for (let i = 0; i < seconds; i += 1) {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      }
    },
  };
}

const has = (actions: readonly EngineAction[], kind: EngineAction['a']) => actions.some((a) => a.a === kind);
const calmNow = (d: Demo) => d.session.getSnapshot().calm as number;

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 9, 13, 0) }));
afterEach(() => jest.useRealTimers());

describe('Story — the 30-second MVP (07 §8)', () => {
  test('Calm 70 → 55 → 20, prompt, Yes → cooling, 20 → 60 → 80, "calmer now"', async () => {
    const d = await startDemo('story');
    await d.advance(5);
    expect(calmNow(d)).toBeCloseTo(55, 0);
    await d.advance(4);
    expect(calmNow(d)).toBeCloseTo(20, 0);
    expect(has(d.actions, 'showPrompt')).toBe(false);
    await d.advance(1);
    expect(has(d.actions, 'showPrompt')).toBe(true);
    expect(d.session.getSnapshot().zone).toBe('high');

    await d.advance(1);
    d.session.dispatch({ t: 'promptAnswer', yes: true });
    expect(d.actions).toContainEqual({ a: 'coolOn', durationS: 600, reason: 'prompt' });
    expect(d.session.getSnapshot().engine.cooling).toBe('on');

    await d.advance(14);
    expect(calmNow(d)).toBeCloseTo(60, 0);
    await d.advance(5);
    expect(calmNow(d)).toBeCloseTo(80, 0);
    expect(d.session.getSnapshot().zone).toBe('calm');
    expect(d.actions).toContainEqual({ a: 'speak', line: 'calmerNow' });
    expect(d.session.getSnapshot().coolingBands.length).toBe(1);
  });

  test('without Yes, Calm stays red', async () => {
    const d = await startDemo('story');
    await d.advance(30);
    expect(calmNow(d)).toBeCloseTo(20, 0);
  });

  test('the 3 s sustain is a demo-only override — the real engine timing still needs 60 s', async () => {
    const d = await startDemo('story', false);
    await d.advance(30);
    expect(has(d.actions, 'showPrompt')).toBe(false);
    await d.advance(40);
    expect(has(d.actions, 'showPrompt')).toBe(true);
  });
});

describe('other scenarios (03 Flow 18)', () => {
  test('Calm day: stays calm for 10 minutes, no prompt', async () => {
    const d = await startDemo('calmDay');
    await d.advance(600);
    expect(has(d.actions, 'showPrompt')).toBe(false);
    expect(d.session.getSnapshot().points.every((p) => (p.calm as number) >= 55)).toBe(true);
  });

  test('Bad 2 PM week: history yields the 2 PM pattern with a 1:30 PM reminder; live signal is calm', async () => {
    const history = badTwoPmWeekHistory(new Date(2026, 10, 9));
    expect(detectPatterns(history.events, history.minutes, new Date(2026, 10, 9)).patterns).toEqual([
      { patternMin: 14 * 60, reminderMin: 13 * 60 + 30, matchingDays: 5 },
    ]);
    const d = await startDemo('badTwoPmWeek');
    await d.advance(120);
    expect(has(d.actions, 'showPrompt')).toBe(false);
  });

  test('Low battery: 20%, 10% and 3% alerts, then cooling is locked', async () => {
    const d = await startDemo('lowBattery');
    await d.advance(60);
    const kinds = d.actions.flatMap((a) => (a.a === 'notify' ? [a.kind] : []));
    expect(kinds).toEqual(['batteryLow', 'batteryLock', 'batteryOff']);
    expect(d.session.getSnapshot().engine.coolBlockReason).toBe('battery');
    d.session.dispatch({ t: 'userCool', on: true });
    expect(d.actions.some((a) => a.a === 'coolOn')).toBe(false);
  });

  test('Loose sensor: fit chip shows Adjust and No contact; no alerts and no Calm from bad contact', async () => {
    const d = await startDemo('looseSensor');
    const fits = new Set<string | null>();
    const calmWhileBad: (number | null)[] = [];
    for (let i = 0; i < 200; i += 1) {
      await d.advance(1);
      const snap = d.session.getSnapshot();
      fits.add(snap.fit);
      const phase = (i + 1) % 40;
      if (phase >= 21 && phase < 40) calmWhileBad.push(snap.calm);
    }
    expect([...fits]).toEqual(expect.arrayContaining(['good', 'adjust', 'none']));
    expect(calmWhileBad.every((c) => c === null)).toBe(true);
    expect(has(d.actions, 'showPrompt') || has(d.actions, 'askHelp')).toBe(false);
  });

  test.each(DEMO_SCENARIO_IDS)('%s: every sample is tagged demo and passes the real decoder', async (id) => {
    const d = await startDemo(id);
    await d.advance(20);
    expect(d.samples.length).toBe(20);
    expect(d.samples.every((s) => s.source === 'demo')).toBe(true);
  });
});

describe('demo source contract (09 §2)', () => {
  test('scan finds exactly the demo tarha; any other id is not found', async () => {
    const source = new DemoTarhaSource({ clock, scenario: 'calmDay' });
    expect(await source.scan()).toEqual([DEMO_TARHA]);
    await expect(source.connect('someone-else')).rejects.toMatchObject({ code: 'BLE_NOT_FOUND' });
  });

  test('coolOn > 1200 s → VALIDATION_ERROR; while disconnected → BLE_DISCONNECTED', async () => {
    const source = new DemoTarhaSource({ clock, scenario: 'calmDay' });
    await expect(source.coolOn(600)).rejects.toMatchObject({ code: 'BLE_DISCONNECTED' });
    await source.connect(DEMO_TARHA.id);
    await expect(source.coolOn(1201)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await source.disconnect();
  });

  test('disconnect → Calm "—", not connected, cooling unavailable', async () => {
    const d = await startDemo('calmDay');
    await d.advance(5);
    await d.session.disconnect();
    expect(d.session.getSnapshot()).toMatchObject({ connection: 'disconnected', calm: null, zone: 'unknown' });
    expect(d.session.getSnapshot().engine.coolBlockReason).toBe('disconnected');
  });

  test('Learn Your Calm on the idle demo signal converges to the default baseline', async () => {
    const source = new DemoTarhaSource({ clock, scenario: 'story' });
    const cal = new Calibrator();
    source.onMetrics((s) => cal.push(s));
    await source.connect(DEMO_TARHA.id);
    jest.advanceTimersByTime(60_000);
    const baseline = cal.result();
    expect(baseline.m).toBeCloseTo(DEFAULT_BASELINE.m, 2);
    expect(baseline.s).toBeCloseTo(DEFAULT_BASELINE.s, 2);
    await source.disconnect();
  });
});
