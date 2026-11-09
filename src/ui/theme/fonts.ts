// Bundled Noto fonts (04 §4): one family across scripts keeps glyph height consistent.
// Only Regular + Bold are bundled to keep the APK small (06 §10). Loaded offline via expo-font.
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { NotoSansEthiopic_400Regular } from '@expo-google-fonts/noto-sans-ethiopic/400Regular';
import { NotoSansEthiopic_700Bold } from '@expo-google-fonts/noto-sans-ethiopic/700Bold';
import type { Lang } from '../../shared/types';

export const FONT_ASSETS = {
  NotoSans_400Regular,
  NotoSans_700Bold,
  NotoSansArabic_400Regular,
  NotoSansArabic_700Bold,
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
};

type FontName = keyof typeof FONT_ASSETS;

export interface FontPair {
  regular: FontName;
  bold: FontName;
}

export const FONT_FAMILY: Record<Lang, FontPair> = {
  en: { regular: 'NotoSans_400Regular', bold: 'NotoSans_700Bold' },
  ar_EG: { regular: 'NotoSansArabic_400Regular', bold: 'NotoSansArabic_700Bold' },
  am_ET: { regular: 'NotoSansEthiopic_400Regular', bold: 'NotoSansEthiopic_700Bold' },
};

/** Arabic and Ethiopic glyphs need taller lines than Latin to avoid clipping marks. */
export const LINE_HEIGHT_RATIO: Record<Lang, number> = { en: 1.3, ar_EG: 1.55, am_ET: 1.5 };
