// 03 Flow 18 from Daily mode: 5 taps on the version → Demo mode → "Bad 2 PM week" shows a real pattern offer from
// in-memory history, labeled DEMO; nothing reaches storage; Exit demo returns to her tarha source.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';

jest.setTimeout(30_000);
const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('Demo mode in Daily mode (03 Flow 18)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) }));
  afterEach(() => jest.useRealTimers());

  test('hidden entry → Bad 2 PM week offer (DEMO, never stored) → Exit demo', async () => {
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    await press('tab-safety');
    await seconds(1);
    expect(screen.queryByTestId('demo-mode')).toBeNull();
    for (let i = 0; i < 5; i += 1) await press('about-version');
    await press('demo-start-badTwoPmWeek');
    await seconds(2);
    await press('tab-home');
    await seconds(1);
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    expect(screen.getByTestId('pattern-offer')).toBeTruthy();
    await press('pattern-offer-yes');
    expect(await store.getPatterns()).toEqual([]);
    expect(await store.queryMinutes(0, Number.MAX_SAFE_INTEGER)).toEqual([]);

    await press('tab-safety');
    await seconds(1);
    await press('demo-exit');
    await seconds(1);
    expect(screen.queryByText(t('demo.ribbon'))).toBeNull();
  });
});
