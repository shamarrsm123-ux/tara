// PMDD-aware cooling (03 Flows 19–20, 07 §10): opt in from Settings, log day 1, see the menstrual phase and what
// TARA does differently on Home, correct the phase, answer the evening check-in, and see both on My Days.
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';

const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const settle = async (n = 3) => {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });
  }
};

async function savedStore(cycleAware: boolean) {
  const store = createMemoryStore(() => Date.now());
  await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: { patternOffers: false } });
  if (cycleAware) await store.updateSettings({ cycleAware: true });
  return store;
}

jest.setTimeout(30_000);

describe('PMDD-aware cooling (Flows 19–20)', () => {
  afterEach(() => jest.useRealTimers());

  test('off by default: no cycle card, no check-in', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 20, 0) });
    const store = await savedStore(false);
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await settle(5);
    expect(screen.queryByTestId('cycle-card')).toBeNull();
    expect(screen.queryByTestId('check-in')).toBeNull();
  });

  test('turn on in Settings → log day 1 today → menstrual phase, day 1, cooling sooner', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) });
    const store = await savedStore(false);
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await settle(5);
    await press('tab-safety');
    await settle();
    await fireEvent.press(within(screen.getByTestId('set-cycle')).getByText(t('settings.on')));
    await settle(5);
    expect((await store.getSettings()).cycleAware).toBe(true);
    await press('tab-home');
    await settle(5);
    expect(screen.getByTestId('cycle-log-first')).toHaveTextContent(t('cycle.logFirst'));
    await press('cycle-started');
    await settle(5);
    expect(screen.getByTestId('cycle-phase')).toHaveTextContent(t('cycle.phase.menstrual'));
    expect(screen.getByTestId('cycle-support')).toHaveTextContent(t('cycle.support.more'));
    expect(await store.listCycleStarts()).toEqual([{ dayMs: new Date(2026, 10, 17).getTime(), isEstimated: false }]);
    expect(screen.queryByTestId('check-in')).toBeNull(); // only in the evening
  });

  test('day 1 logged 22 days ago → late luteal; "correct my phase" → follicular, usual cooling', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) });
    const store = await savedStore(true);
    await store.addCycleStart({ dayMs: new Date(2026, 9, 26).getTime(), isEstimated: false });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await settle(5);
    expect(screen.getByTestId('cycle-phase')).toHaveTextContent(t('cycle.phase.lateLuteal'));
    await press('tab-safety');
    await settle();
    await press('cycle-correct-follicular');
    await settle(5);
    await press('tab-home');
    await settle(3);
    expect(screen.getByTestId('cycle-phase')).toHaveTextContent(t('cycle.phase.follicular'));
    expect(screen.getByTestId('cycle-support')).toHaveTextContent(t('cycle.support.none'));
  });

  test('evening check-in: answer three questions → saved for today → shown on My Days with the phase', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 20, 0) });
    const store = await savedStore(true);
    await store.addCycleStart({ dayMs: new Date(2026, 9, 26).getTime(), isEstimated: false });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await settle(5);
    expect(screen.getByTestId('check-in-save')).toBeDisabled();
    await fireEvent.press(within(screen.getByTestId('check-in-mood')).getByText(t('checkIn.level2')));
    await fireEvent.press(within(screen.getByTestId('check-in-irritability')).getByText(t('checkIn.level1')));
    await fireEvent.press(within(screen.getByTestId('check-in-body')).getByText(t('checkIn.level0')));
    await press('check-in-save');
    await settle(5);
    expect(await store.queryCheckIns(0, Number.MAX_SAFE_INTEGER)).toEqual([{ dayMs: new Date(2026, 10, 17).getTime(), mood: 2, irritability: 1, body: 0 }]);
    expect(screen.queryByTestId('check-in')).toBeNull();
    await press('tab-myDays');
    await settle(5);
    expect(screen.getByTestId('my-days-phase')).toHaveTextContent(t('cycle.phase.lateLuteal'));
    expect(screen.getByTestId('my-days-check-in-mood')).toHaveTextContent(`${t('checkIn.mood')}: ${t('checkIn.level2')}`);
  });

  test('"Later" hides the check-in for today only', async () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 20, 0) });
    const store = await savedStore(true);
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await settle(5);
    await press('check-in-later');
    await settle();
    expect(screen.queryByTestId('check-in')).toBeNull();
    expect(await store.queryCheckIns(0, Number.MAX_SAFE_INTEGER)).toEqual([]);
  });
});
