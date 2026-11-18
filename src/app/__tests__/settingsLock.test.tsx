// 13 Phase 11 acceptance: a setting change reaches the engine immediately and survives a restart; App Lock uses the
// phone's unlock and shows nothing before it; language change is saved; "Learn my calm again" navigation.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { DEFAULT_BASELINE } from '../../signal/stress';
import { createMemoryStore } from '../../store/memoryStore';
import { translatorFor } from '../../ui/i18n';
import { initialStateFor } from '../launch';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY, reduceTry, setUpState } from '../tryNavigation';
import { onboardToDaily } from './onboard';

jest.setTimeout(60_000);
const t = translatorFor('en');
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

/** The whole first run to Daily mode with the demo tarha (03 Flows O1–O6). */
async function storyToDaily() {
  const store = createMemoryStore(() => Date.now());
  const view = await render(<TryFlow store={store} initial={INITIAL_TRY} />);
  await onboardToDaily();
  return { store, view };
}

describe('Settings, App Lock, language (13 Phase 11)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 17, 10, 0) });
    jest.mocked(LocalAuthentication.getEnrolledLevelAsync).mockResolvedValue(1);
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true } as never);
  });
  afterEach(() => jest.useRealTimers());

  test('cooling length 5 min applies at once and survives a restart', async () => {
    const { store, view } = await storyToDaily();
    await press('tab-safety');
    await seconds(1);
    await press('set-length-5');
    await seconds(1);
    await press('tab-home');
    await press('home-cool');
    await seconds(2);
    expect(screen.getByTestId('cooling-countdown')).toHaveTextContent(/^4:5\d$/);

    view.unmount();
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    expect((await store.getSettings()).coolingMinutes).toBe(5);
    await press('tab-safety');
    await seconds(1);
    expect(screen.getByTestId('set-length-5').props.accessibilityState).toMatchObject({ selected: true });
  });

  test('App Lock: locked TARA shows nothing of hers until the phone unlock succeeds', async () => {
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false } as never);
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: { appLock: true } });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    expect(screen.getByTestId('screen-locked')).toBeTruthy();
    expect(screen.queryByTestId('tab-bar')).toBeNull();
    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true } as never);
    await press('lock-unlock');
    await seconds(1);
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
  });

  test('App Lock without a phone screen lock explains and does not turn on', async () => {
    jest.mocked(LocalAuthentication.getEnrolledLevelAsync).mockResolvedValue(0);
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    await press('tab-safety');
    await seconds(1);
    await press('lock-yes');
    await seconds(1);
    expect(screen.getByText(t('lock.noScreenLock'))).toBeTruthy();
    expect((await store.getSettings()).appLock).toBe(false);
  });

  test('language change switches the app and is saved for next launch', async () => {
    const store = createMemoryStore(() => Date.now());
    await store.createFromTrySession({ lang: 'en', baseline: DEFAULT_BASELINE, prefs: {} });
    await render(<TryFlow store={store} initial={await initialStateFor(store)} />);
    await seconds(1);
    await press('tab-safety');
    await seconds(1);
    await press('set-lang-ar_EG');
    await seconds(1);
    expect(screen.getByText(translatorFor('ar_EG')('settings.title'))).toBeTruthy();
    expect(await store.readPlainPrefs()).toEqual({ hasCompletedSetup: true, language: 'ar_EG' });
  });

  test('"Learn my calm again" goes to calibration and back to Daily', () => {
    const daily = setUpState('en');
    const re = reduceTry(daily, { type: 'recalibrate' });
    expect(re.screen).toBe('recalibrate');
    expect(reduceTry(re, { type: 'back' }).screen).toBe('daily');
    expect(reduceTry(re, { type: 'recalibrated' }).screen).toBe('daily');
  });
});
