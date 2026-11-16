import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import { LANGS, type Lang } from '../../../shared/types';
import { translatorFor } from '../../i18n';
import { UiProvider } from '../../theme/UiProvider';
import { DELETE_HOLD_MS, MAX_FONT_SCALE, TYPE_SIZE } from '../../theme/tokens';
import { AppText } from '../AppText';
import { CalmMeter } from '../CalmMeter';
import { DecisionCard } from '../DecisionCard';
import { DemoRibbon } from '../DemoRibbon';
import { FitChip } from '../FitChip';
import { HoldToConfirm, secondsLeft, startHold } from '../HoldToConfirm';

const wrap = (ui: ReactElement, lang: Lang = 'en', fontScale = 1) =>
  render(
    <UiProvider lang={lang} theme="sun" fontScale={fontScale}>
      {ui}
    </UiProvider>,
  );

describe('CalmMeter (04 §9.1)', () => {
  test.each(LANGS)('shows number, zone word and accessible label in %s', async (lang) => {
    const t = translatorFor(lang);
    await wrap(<CalmMeter calm={20} zone="high" status="live" testID="m" />, lang);
    expect(screen.getByTestId('m-word')).toHaveTextContent(t('zone.high'));
    expect(screen.getByTestId('m').props.accessibilityLabel).toContain(t('zone.high'));
  });

  test('not connected: no number, "—", status word', async () => {
    await wrap(<CalmMeter calm={55} zone="calm" status="notConnected" testID="m" />);
    expect(screen.getByTestId('m-value')).toHaveTextContent('—');
    expect(screen.getByTestId('m-word')).toHaveTextContent('Not connected');
  });

  test('poor fit shows "Adjust sensor" and never a stale number', async () => {
    await wrap(<CalmMeter calm={20} zone="high" status="adjustSensor" testID="m" />);
    expect(screen.getByTestId('m-value')).toHaveTextContent('—');
    expect(screen.getByTestId('m-word')).toHaveTextContent('Adjust sensor');
  });

  test('clamps out-of-range values', async () => {
    await wrap(<CalmMeter calm={140} zone="calm" status="live" testID="m" />);
    expect(screen.getByTestId('m-value')).toHaveTextContent('100%');
  });
});

describe('FitChip (04 §9.3)', () => {
  test.each([
    ['good', 'Good'],
    ['adjust', 'Adjust'],
    ['none', 'No contact'],
  ] as const)('%s → "%s"', async (fit, word) => {
    await wrap(<FitChip fit={fit} />);
    expect(screen.getByText(word)).toBeTruthy();
  });
});

describe('DecisionCard (04 §9.4)', () => {
  test('Yes and No call their handlers', async () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    await wrap(<DecisionCard tone="high" question="Q?" yesLabel="Yes" noLabel="No" onYes={onYes} onNo={onNo} testID="c" />);
    await fireEvent.press(screen.getByTestId('c-yes'));
    await fireEvent.press(screen.getByTestId('c-no'));
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).toHaveBeenCalledTimes(1);
  });

  test('No is the same size as Yes, never hidden (04 §5)', async () => {
    await wrap(<DecisionCard tone="cool" question="Q?" yesLabel="Yes" noLabel="No" onYes={jest.fn()} onNo={jest.fn()} testID="c" />);
    const size = (id: string) => {
      const s = StyleSheet.flatten(screen.getByTestId(id).props.style);
      return { minHeight: s.minHeight, alignSelf: s.alignSelf };
    };
    expect(size('c-no')).toEqual(size('c-yes'));
    expect(size('c-yes').minHeight).toBe(64);
  });

  test('tag pill shows the word with a dot in the tone color (red for high stress, 04a D4)', async () => {
    await wrap(<DecisionCard tone="high" tagLabel="High stress" question="Q?" yesLabel="Y" noLabel="N" onYes={jest.fn()} onNo={jest.fn()} testID="c" />);
    expect(screen.getByTestId('c-tag')).toHaveTextContent('High stress');
    expect(StyleSheet.flatten(screen.getByTestId('c-tag-dot').props.style).backgroundColor).toBe('#C62828');
  });
});

describe('HoldToConfirm (04 §9.5)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('countdown seconds', async () => {
    expect([secondsLeft(0, 3000), secondsLeft(1, 3000), secondsLeft(2001, 3000), secondsLeft(3000, 3000)]).toEqual([3, 3, 1, 0]);
  });

  test('startHold fires once after the hold and can be cancelled', async () => {
    const done = jest.fn();
    const cancel = startHold(3000, jest.fn(), done);
    jest.advanceTimersByTime(2999);
    expect(done).not.toHaveBeenCalled();
    cancel();
    jest.advanceTimersByTime(5000);
    expect(done).not.toHaveBeenCalled();
    startHold(3000, jest.fn(), done);
    jest.advanceTimersByTime(3000);
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('releasing before 3 s cancels', async () => {
    const onConfirm = jest.fn();
    await wrap(<HoldToConfirm label="Delete Everything" onConfirm={onConfirm} testID="h" />);
    await fireEvent(screen.getByTestId('h'), 'pressIn');
    await act(async () => {
      jest.advanceTimersByTime(DELETE_HOLD_MS - 1);
    });
    await fireEvent(screen.getByTestId('h'), 'pressOut');
    await act(async () => {
      jest.advanceTimersByTime(DELETE_HOLD_MS);
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('holding for 3 s confirms exactly once, with a visible countdown', async () => {
    const onConfirm = jest.fn();
    await wrap(<HoldToConfirm label="Delete Everything" onConfirm={onConfirm} testID="h" />);
    await fireEvent(screen.getByTestId('h'), 'pressIn');
    expect(screen.getByTestId('h-countdown')).toHaveTextContent('3');
    await act(async () => {
      jest.advanceTimersByTime(DELETE_HOLD_MS);
    });
    await fireEvent(screen.getByTestId('h'), 'pressOut');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('DemoRibbon (04 §9.6)', () => {
  test.each(LANGS)('always labels demo data in %s, plus "sped up" when time-compressed', async (lang) => {
    const t = translatorFor(lang);
    await wrap(<DemoRibbon isSpedUp />, lang);
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    expect(screen.getByText(t('demo.spedUp'))).toBeTruthy();
    expect(screen.getByTestId('demo-ribbon-corner')).toBeTruthy();
  });

  test('has nothing that could dismiss it', async () => {
    await wrap(<DemoRibbon />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('font scale (04 §13)', () => {
  test('130% scales text and caps further OS scaling', async () => {
    await wrap(<AppText variant="body">x</AppText>, 'en', MAX_FONT_SCALE);
    const text = screen.getByText('x');
    expect(StyleSheet.flatten(text.props.style).fontSize).toBeCloseTo(TYPE_SIZE.body * MAX_FONT_SCALE);
    expect(text.props.maxFontSizeMultiplier).toBeCloseTo(1);
  });

  test('Arabic text runs are right-to-left even with no letters (e.g. "٧٢٪")', async () => {
    await wrap(<AppText variant="body">x</AppText>, 'ar_EG');
    expect(StyleSheet.flatten(screen.getByText('x').props.style).writingDirection).toBe('rtl');
  });

  test('uses the script-specific Noto font', async () => {
    await wrap(<AppText variant="body">x</AppText>, 'am_ET');
    expect(StyleSheet.flatten(screen.getByText('x').props.style).fontFamily).toBe('NotoSansEthiopic_400Regular');
  });
});

describe('RTL', () => {
  test('Arabic sets right-to-left layout direction; English left-to-right', async () => {
    const { toJSON, rerender } = await render(
      <UiProvider lang="ar_EG" theme="sun">
        <AppText variant="body">x</AppText>
      </UiProvider>,
    );
    const dir = () => StyleSheet.flatten((toJSON() as unknown as { props: { style: unknown } }).props.style as never).direction;
    expect(dir()).toBe('rtl');
    await rerender(
      <UiProvider lang="en" theme="sun">
        <AppText variant="body">x</AppText>
      </UiProvider>,
    );
    expect(dir()).toBe('ltr');
  });
});
