// 13 Phase 8 — Daily mode: mute, the monitoring service, notifications cancelled by Delete Everything, My Days from
// stored minutes, and an accelerated 8-hour soak of the monitoring session.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DemoTarhaSource, DEMO_TARHA } from '../../demo/DemoTarhaSource';
import { createMonitorSession } from '../../engine/session';
import { DEFAULT_BASELINE } from '../../signal/stress';
import type { Notifier } from '../../shared/notifierPort';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';

const mockNotifier = {
  current: null as null | (Notifier & { calls: string[] }),
};
jest.mock('../../notify/createNotifier', () => ({
  createNotifier: () => mockNotifier.current,
  registerMonitoringService: () => undefined,
}));

function recordingNotifier(): Notifier & { calls: string[] } {
  const calls: string[] = [];
  const rec = (name: string) => async () => {
    calls.push(name);
  };
  return {
    calls,
    requestPermission: async () => {
      calls.push('requestPermission');
      return true;
    },
    startMonitoringService: rec('startMonitoringService'),
    stopMonitoringService: rec('stopMonitoringService'),
    show: async (kind) => {
      calls.push(`show:${kind}`);
    },
    scheduleDailyReminder: async () => 'id-1',
    cancel: rec('cancel'),
    cancelAll: rec('cancelAll'),
  };
}

const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
jest.setTimeout(60_000);
async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('Daily mode (13 Phase 8)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 14, 0) });
    mockNotifier.current = recordingNotifier();
  });
  afterEach(() => jest.useRealTimers());

  test('Mute 30 min: the High-stress prompt stays away; turning alerts back on lets it return', async () => {
    await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
    for (const id of ['lang-en', 'language-continue', 'welcome-try', 'connect-button']) await press(id);
    await seconds(1);
    await press('connect-demo');
    await seconds(6);
    await press('connect-next');
    await press('calibrate-skip');
    await press('mute-button');
    await press('mute-m30');
    expect(screen.getByTestId('muted-notice')).toHaveTextContent(t('mute.paused'), { exact: false });
    await seconds(15);
    expect(screen.queryByTestId('prompt')).toBeNull();
    await press('mute-resume');
    await seconds(2);
    expect(screen.getByTestId('prompt')).toBeTruthy();
  });

  test('Daily mode starts the "TARA is with you" service; Delete Everything cancels every notification first', async () => {
    const store = createMemoryStore();
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    expect(mockNotifier.current!.calls.slice(0, 2)).toEqual(['requestPermission', 'startMonitoringService']);
    await press('tab-safety');
    await press('delete-everything');
    await fireEvent(screen.getByTestId('delete-hold'), 'pressIn');
    await seconds(4);
    expect(mockNotifier.current!.calls).toContain('cancelAll');
    expect(screen.getByTestId('screen-deleted-message')).toBeTruthy();
  });

  test('My Days shows stored days with time in each zone; only the retention window exists', async () => {
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await store.updateSettings({ retentionDays: 3 });
    const yesterday = new Date(2026, 10, 16, 14, 0).getTime();
    await store.appendMinute({ tsMinute: yesterday, stressMean: 80, stressMax: 85, validSeconds: 60, zone: 'high', coolingOn: true, source: 'tarha' });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    await press('tab-myDays');
    await seconds(1);
    expect(screen.getByTestId('my-days-footer')).toHaveTextContent(t('myDays.keepsOnly', { days: '3' }));
    expect(screen.getByTestId('day-5').props.accessibilityState).toMatchObject({ disabled: false });
    expect(screen.getByTestId('day-3').props.accessibilityState).toMatchObject({ disabled: true }); // older than 3 days
    await press('day-5');
    expect(screen.getByTestId('my-days-graph')).toBeTruthy();
  });
});

describe('8-hour soak (13 Phase 8 acceptance, accelerated)', () => {
  test('the session keeps monitoring for a full shift with bounded memory', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 6, 0) });
    const clock = { nowMs: () => Date.now(), monotonicMs: () => Date.now() };
    const source = new DemoTarhaSource({ clock, scenario: 'calmDay' });
    const session = createMonitorSession({ source, clock, baseline: DEFAULT_BASELINE });
    await session.connect(DEMO_TARHA.id);
    const HOURS = 8;
    for (let h = 0; h < HOURS; h += 1) jest.advanceTimersByTime(60 * 60_000);
    const snap = session.getSnapshot();
    expect(snap.connection).toBe('connected');
    expect(snap.calm).not.toBeNull();
    expect(snap.points.length).toBeLessThanOrEqual(10 * 60 + 1); // the 10-minute window, never the whole shift
    expect(snap.nowMs - new Date(2026, 10, 17, 6, 0).getTime()).toBe(HOURS * 60 * 60_000);
    session.dispose();
    jest.useRealTimers();
  });
});
