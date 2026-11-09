import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { translatorFor } from '../../ui/i18n';
import { UiProvider } from '../../ui/theme/UiProvider';
import { DemoPlaygroundScreen } from '../DemoPlaygroundScreen';

const t = translatorFor('en');

async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

describe('demo playground (13 Phase 3)', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 10, 9, 13, 0) }));
  afterEach(() => jest.useRealTimers());

  test('Story: ribbon labelled "sped up" the whole time; prompt appears; Yes starts cooling', async () => {
    await render(
      <UiProvider lang="en" theme="sun">
        <DemoPlaygroundScreen onExit={jest.fn()} />
      </UiProvider>,
    );
    expect(screen.queryByText(t('demo.ribbon'))).toBeNull();

    await fireEvent.press(screen.getByTestId('scenario-story'));
    await seconds(1);
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    expect(screen.getByText(t('demo.spedUp'))).toBeTruthy();

    await seconds(10);
    expect(screen.getByTestId('demo-prompt')).toBeTruthy();
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();

    await fireEvent.press(screen.getByTestId('demo-prompt-yes'));
    await seconds(1);
    expect(screen.queryByTestId('demo-prompt')).toBeNull();
    expect(screen.getByText(t('cool.stop'))).toBeTruthy();
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
  });

  test('Calm day is real-time: ribbon without "sped up"', async () => {
    await render(
      <UiProvider lang="en" theme="sun">
        <DemoPlaygroundScreen onExit={jest.fn()} />
      </UiProvider>,
    );
    await fireEvent.press(screen.getByTestId('scenario-calmDay'));
    await seconds(2);
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    expect(screen.queryByText(t('demo.spedUp'))).toBeNull();
    expect(screen.getByTestId('demo-meter-word')).toHaveTextContent(t('zone.calm'));
  });
});
