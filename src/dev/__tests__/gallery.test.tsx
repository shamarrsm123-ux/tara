import { fireEvent, render, screen } from '@testing-library/react-native';
import { LANGS } from '../../shared/types';
import { LANG_NATIVE_NAME, translatorFor } from '../../ui/i18n';
import { GalleryScreen } from '../GalleryScreen';

// 13 Phase 1 acceptance: the gallery renders every component in all three languages, Sun & Night,
// at 100% and 130% font scale.
const COMBOS = LANGS.flatMap((lang) =>
  (['Sun', 'Night'] as const).flatMap((theme) => (['100%', '130%'] as const).map((scale) => ({ lang, theme, scale }))),
);

describe('component gallery', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test.each(COMBOS)('renders all components: $lang / $theme / $scale', async ({ lang, theme, scale }) => {
    const t = translatorFor(lang);
    await render(<GalleryScreen />);
    await fireEvent.press(screen.getByText(LANG_NATIVE_NAME[lang]));
    await fireEvent.press(screen.getByText(theme));
    await fireEvent.press(screen.getByText(scale));

    expect(screen.getByTestId('meter-live')).toBeTruthy();
    expect(screen.getByTestId('meter-off-word')).toHaveTextContent(t('meter.notConnected'));
    expect(screen.getByText(t('fit.good'))).toBeTruthy();
    expect(screen.getByText(t('fit.none'))).toBeTruthy();
    expect(screen.getByText(t('prompt.highStress'))).toBeTruthy();
    expect(screen.getByText(t('prompt.yesCool'))).toBeTruthy();
    expect(screen.getByText(t('deleteAll.button'))).toBeTruthy();
    expect(screen.getByText(t('demo.ribbon'))).toBeTruthy();
    expect(screen.getByLabelText(t('graph.a11y', { minutes: lang === 'ar_EG' ? '١٠' : '10' }))).toBeTruthy();
  });
});
