import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { translatorFor } from '../../ui/i18n';
import { AlertLessCard, PromptCard } from '../../ui/components/ActionCards';
import { UiProvider } from '../../ui/theme/UiProvider';
import { TryFlow } from '../TryFlow';

const t = translatorFor('en');
// Simulating 15+ minutes of fake time through the full UI takes a few real seconds.
jest.setTimeout(30_000);

async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}
async function minutes(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
  }
}
const press = (id: string) => fireEvent.press(screen.getByTestId(id));

/** Language → Welcome → Connect (demo) → Skip calibration → Home, with the Story scripted from Home. */
async function toHome() {
  await render(<TryFlow />);
  await press('lang-en');
  await press('language-continue');
  await press('welcome-try');
  await press('connect-button');
  await seconds(1);
  await press('connect-demo');
  await seconds(6);
  await press('connect-next');
  await press('calibrate-skip');
  await seconds(1);
}

describe('Screen 3 — the MVP (13 Phase 5)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 16, 14, 0) }));
  afterEach(() => jest.useRealTimers());

  test('12 §6 flow 3: prompt → No → nothing for 15 min while still high → prompt again', async () => {
    await toHome();
    await seconds(11);
    expect(screen.getByTestId('prompt')).toBeTruthy();
    expect(screen.getByText(t('prompt.highStress'))).toBeTruthy();

    await press('prompt-no');
    expect(screen.queryByTestId('prompt')).toBeNull();
    await minutes(14);
    await seconds(55);
    expect(screen.queryByTestId('prompt')).toBeNull();
    await seconds(10);
    expect(screen.getByTestId('prompt')).toBeTruthy();
  });

  test('Yes → blue cooling card with countdown; Calm 20 → 60 → 80; Stop always works', async () => {
    await toHome();
    await seconds(11);
    expect(screen.getByTestId('home-meter-value')).toHaveTextContent('20%');

    await press('prompt-yes');
    await seconds(1);
    expect(screen.queryByTestId('prompt')).toBeNull();
    expect(screen.getByText(t('cool.on'))).toBeTruthy();
    expect(screen.getByTestId('cooling-countdown')).toHaveTextContent(/^9:5\d$/);
    expect(screen.queryByTestId('home-cool')).toBeNull();
    expect(screen.queryByTestId('back')).toBeNull();

    await seconds(13);
    expect(screen.getByTestId('home-meter-value')).toHaveTextContent('60%');
    await seconds(5);
    expect(screen.getByTestId('home-meter-value')).toHaveTextContent('80%');
    expect(screen.getByTestId('home-meter-word')).toHaveTextContent(t('zone.calm'));
    expect(screen.getByText(t('demo.spedUp'))).toBeTruthy();

    await press('cooling-stop');
    await seconds(1);
    expect(screen.queryByTestId('cooling-card')).toBeNull();
    expect(screen.getByTestId('home-cool')).toBeTruthy();
    expect(screen.getByTestId('back')).toBeTruthy();
  });

  test('manual cooling starts immediately and can be extended once by 10 minutes', async () => {
    await toHome();
    await press('home-cool');
    await seconds(1);
    expect(screen.getByTestId('cooling-countdown')).toHaveTextContent(/^9:5\d$/);
    await press('cooling-extend');
    await seconds(1);
    expect(screen.getByTestId('cooling-countdown')).toHaveTextContent(/^19:5\d$/);
    expect(screen.queryByTestId('cooling-extend')).toBeNull();
  });
});

describe('Screen 3 cards', () => {
  const wrap = (node: ReactElement) =>
    render(
      <UiProvider lang="en" theme="sun">
        {node}
      </UiProvider>,
    );

  test.each(['battery', 'disconnected', 'rest'] as const)('cooling blocked (%s): "can\'t cool" message with reason icon; OK dismisses', async (reason) => {
    const onDismiss = jest.fn();
    await wrap(<PromptCard blockReason={reason} onAnswer={jest.fn()} onDismiss={onDismiss} />);
    expect(screen.getByText(t('prompt.cantCool'))).toBeTruthy();
    expect(screen.getByTestId(`prompt-blocked-${reason}`)).toBeTruthy();
    await press('prompt-ok');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('"alert less often?" reports the answer', async () => {
    const onAnswer = jest.fn();
    await wrap(<AlertLessCard onAnswer={onAnswer} />);
    expect(screen.getByText(t('alertLess.question'))).toBeTruthy();
    await press('alert-less-yes');
    expect(onAnswer).toHaveBeenCalledWith(true);
  });
});

describe('Tabs and the centre Cool button (04 §10, 04a v2 D6)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 16, 14, 0) }));
  afterEach(() => jest.useRealTimers());

  test('Home · My Days · Safety switch screens and keep the demo label on each', async () => {
    await toHome();
    expect(screen.getByTestId('tab-home').props.accessibilityState).toMatchObject({ selected: true });

    await press('tab-myDays');
    expect(screen.getByTestId('screen-my-days')).toBeTruthy();
    expect(screen.getByTestId('my-days-try-note')).toHaveTextContent(t('myDays.tryNote'));
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();

    await press('tab-safety');
    expect(screen.getByTestId('screen-safety')).toBeTruthy();
    expect(screen.getByText(t('safety.header'))).toBeTruthy();
    expect(screen.queryByTestId('safety-no-internet-info')).toBeNull();
    await press('safety-no-internet');
    expect(screen.getByTestId('safety-no-internet-info')).toHaveTextContent(t('safety.noInternetInfo'));
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();

    await press('tab-home');
    expect(screen.getByTestId('screen-home')).toBeTruthy();
  });

  test('the High-stress prompt appears over any tab, and Yes brings her to the cooling card on Home', async () => {
    await toHome();
    await press('tab-safety');
    await seconds(11);
    expect(screen.getByTestId('prompt')).toBeTruthy();
    await press('prompt-yes');
    await seconds(1);
    expect(screen.getByTestId('screen-home')).toBeTruthy();
    expect(screen.getByTestId('cooling-card')).toBeTruthy();
  });

  test('Cool from another tab starts cooling and shows Home; while on, the centre button shows "On"', async () => {
    await toHome();
    await press('tab-myDays');
    await press('home-cool');
    await seconds(1);
    expect(screen.getByTestId('screen-home')).toBeTruthy();
    expect(screen.getByTestId('cooling-card')).toBeTruthy();
    expect(screen.getByTestId('home-cooling-on').props.accessibilityState).toMatchObject({ disabled: true });
  });
});
