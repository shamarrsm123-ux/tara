// 13 Phase 9 acceptance (12 §6 flow 4): a stored week with stress around 2 PM → offer on Home → Yes schedules a
// 1:30 PM reminder → shortening retention to 1 day cancels it and shows "I need more days".
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DEFAULT_BASELINE } from '../../signal/stress';
import type { Notifier } from '../../shared/notifierPort';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';

const mockNotifier = { calls: [] as string[] };
jest.mock('../../notify/createNotifier', () => ({
  registerMonitoringService: () => undefined,
  createNotifier: (): Notifier => ({
    requestPermission: async () => true,
    startMonitoringService: async () => undefined,
    stopMonitoringService: async () => undefined,
    show: async () => undefined,
    scheduleDailyReminder: async (minute: number) => {
      mockNotifier.calls.push(`schedule:${minute}`);
      return 'reminder-1';
    },
    cancel: async (id: string) => {
      mockNotifier.calls.push(`cancel:${id}`);
    },
    cancelAll: async () => undefined,
  }),
}));

const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const settle = () =>
  act(async () => {
    jest.advanceTimersByTime(50);
    await Promise.resolve();
  });

async function storeWithWeek() {
  const store = createMemoryStore(() => Date.now());
  await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: { patternOffers: true } });
  for (let d = 0; d < 7; d += 1) {
    const day = new Date(2026, 10, 17 - d, 9, 0).getTime();
    for (let i = 0; i < 150; i += 1) {
      await store.appendMinute({ tsMinute: day + i * 60_000, stressMean: 40, stressMax: 50, validSeconds: 60, zone: 'calm', coolingOn: false, source: 'tarha' });
    }
    if (d !== 3 && d !== 6) await store.appendEvent({ ts: new Date(2026, 10, 17 - d, 14, 5).getTime(), type: 'high_episode_start', source: null, origin: 'tarha' });
  }
  return store;
}

describe('Smart reminders (13 Phase 9)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 20, 0) });
    mockNotifier.calls = [];
  });
  afterEach(() => jest.useRealTimers());

  test('offer → Yes schedules 1:30 PM; retention 1 day → reminder cancelled + "I need more days"', async () => {
    const store = await storeWithWeek();
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    for (let i = 0; i < 5; i += 1) await settle();
    expect(screen.getByTestId('pattern-offer')).toBeTruthy();
    await press('pattern-offer-yes');
    for (let i = 0; i < 3; i += 1) await settle();
    expect(mockNotifier.calls).toEqual(['schedule:810']);
    expect((await store.getPatterns())[0]).toMatchObject({ slotStartMin: 840, status: 'accepted', reminderNotificationId: 'reminder-1' });

    await press('tab-safety');
    await settle();
    await press('safety-retention-1');
    for (let i = 0; i < 5; i += 1) await settle();
    expect(mockNotifier.calls).toContain('cancel:reminder-1');
    await press('tab-home');
    await settle();
    expect(screen.getByTestId('pattern-need-more')).toHaveTextContent(t('pattern.needMore'));
    expect(screen.getByTestId('pattern-faded')).toBeTruthy();
  });

  test('No → not offered again (declined for 7 days)', async () => {
    const store = await storeWithWeek();
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    for (let i = 0; i < 5; i += 1) await settle();
    await press('pattern-offer-no');
    for (let i = 0; i < 3; i += 1) await settle();
    expect(screen.queryByTestId('pattern-offer')).toBeNull();
    expect((await store.getPatterns())[0]).toMatchObject({ status: 'declined' });
    expect(mockNotifier.calls).toEqual([]);
  });
});
