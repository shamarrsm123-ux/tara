// App launch (11 §1): fresh → Choose Language; set up → Daily mode in her saved language, monitoring with the
// saved baseline and honestly "not connected" until BLE exists (Phase 7). Nothing demo is shown or stored.
import { act, render, screen } from '@testing-library/react-native';
import type { Store } from '../../shared/storePort';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';

// Full-UI flows drive fake time through many renders; give them room under a loaded coverage run.
jest.setTimeout(30_000);

describe('launch (11 §1)', () => {
  test('a fresh install opens on Choose Language', async () => {
    expect(await initialStateFor(createMemoryStore())).toEqual(INITIAL_TRY);
  });

  test('an unreadable store starts fresh instead of crashing', async () => {
    const broken = { ...createMemoryStore(), readPlainPrefs: () => Promise.reject(new Error('keystore unavailable')) } as Store;
    expect(await initialStateFor(broken)).toEqual(INITIAL_TRY);
  });

  test('a set-up phone opens Daily mode in Amharic: tabs, no demo label, tarha not connected', async () => {
    const store = createMemoryStore();
    await store.createFromTrySession({ lang: 'am_ET', baseline: { m: -0.6, s: 0.2, isDefault: false }, prefs: {} });
    const initial = await initialStateFor(store);
    expect(initial).toMatchObject({ screen: 'daily', lifecycle: 'setUp', lang: 'am_ET' });

    await render(<TryFlow store={store} initial={initial} />);
    await act(async () => undefined);
    const t = translatorFor('am_ET');
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    expect(screen.getByTestId('home-meter-word')).toHaveTextContent(t('meter.notConnected'));
    expect(screen.queryByText(t('demo.ribbon'))).toBeNull();
    expect(screen.queryByTestId('back')).toBeNull();
  });
});
