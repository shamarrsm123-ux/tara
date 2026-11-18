import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { translatorFor } from '../../ui/i18n';
import { createMemoryStore } from '../../store/memoryStore';
import { TryFlow } from '../TryFlow';
import { INITIAL_TRY } from '../tryNavigation';

// 13 Phase 4 acceptance: install → moving Calm meter in under 2 minutes, in Arabic, without reading English.
const t = translatorFor('ar_EG');
// Driving minutes of fake time through the full UI takes a few real seconds under a loaded test run.
jest.setTimeout(30_000);
const LATIN = /[A-Za-z]/;

type Node = { children?: (Node | string)[] | null } | string | null;
function texts(node: Node | Node[]): string[] {
  if (node === null) return [];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (typeof node === 'string') return [node];
  return (node.children ?? []).flatMap(texts);
}
const visibleEnglish = () => texts(screen.toJSON() as Node).filter((s) => LATIN.test(s));

let elapsedS = 0;
async function seconds(n: number) {
  for (let i = 0; i < n; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    elapsedS += 1;
  }
}
/** A tester takes about 2 s to look and tap. */
async function tap(testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
  await seconds(2);
}

describe('Try flow in Arabic (13 Phase 4)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 9, 14, 0) });
    elapsedS = 0;
  });
  afterEach(() => jest.useRealTimers());

  test('install → moving Calm meter in < 2 min, no English on screen after choosing Arabic', async () => {
    await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
    expect(screen.queryByTestId('language-continue')).toBeNull();

    await tap('lang-ar_EG');
    await tap('language-continue');
    expect(screen.getByTestId('screen-intro')).toBeTruthy();
    expect(screen.getByText(t('intro.coolTitle'))).toBeTruthy();
    expect(visibleEnglish()).toEqual([]);

    await tap('intro-next');
    await tap('intro-next');
    expect(visibleEnglish()).toEqual([]);
    await tap('intro-start');
    await tap('connect-button');
    expect(screen.getByTestId('connect-not-found')).toHaveTextContent(t('connect.notFound'));
    expect(visibleEnglish()).toEqual([]);

    await tap('connect-demo');
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    await seconds(4);
    await tap('connect-next');
    expect(screen.getByTestId('screen-calibrate')).toBeTruthy();
    expect(visibleEnglish()).toEqual([]);

    await seconds(60);
    expect(screen.getByTestId('calibrate-message')).toHaveTextContent(t('calibrate.done'));
    await seconds(3);
    // Keep TARA on this phone? shows her live Calm meter (03 Flow O5).
    expect(screen.getByTestId('screen-save')).toBeTruthy();
    // Live, not "—": an Arabic-digit number and a zone word.
    expect(screen.getByTestId('save-meter-value')).toHaveTextContent(/[٠-٩]/);
    const zoneWords = [t('zone.calm'), t('zone.rising'), t('zone.high')];
    expect(zoneWords.some((w) => screen.queryByText(w) !== null)).toBe(true);
    expect(visibleEnglish()).toEqual([]);
    expect(elapsedS).toBeLessThan(120);
  });

  test('Skip uses the default baseline and goes straight to Keep TARA', async () => {
    await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
    await tap('lang-ar_EG');
    await tap('language-continue');
    await tap('intro-next');
    await tap('intro-next');
    await tap('intro-start');
    await tap('connect-button');
    await tap('connect-demo');
    await seconds(4);
    await tap('connect-next');
    await tap('calibrate-skip');
    expect(screen.getByTestId('screen-save')).toBeTruthy();
  });

  test('Next stays disabled until 5 s of Good fit; back returns to the previous screen', async () => {
    await render(<TryFlow store={createMemoryStore()} initial={INITIAL_TRY} />);
    await tap('lang-en');
    await tap('language-continue');
    await tap('intro-next');
    await tap('intro-next');
    await tap('intro-start');
    await tap('connect-button');
    await fireEvent.press(screen.getByTestId('connect-demo'));
    await seconds(2);
    expect(screen.getByTestId('connect-next').props.accessibilityState).toMatchObject({ disabled: true });
    await seconds(4);
    expect(screen.getByTestId('connect-next').props.accessibilityState).toMatchObject({ disabled: false });
    await tap('back');
    expect(screen.getByTestId('screen-intro')).toBeTruthy();
  });
});
