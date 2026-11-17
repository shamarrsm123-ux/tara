// Bundled fonts: Plus Jakarta Sans for English (04a D3); Noto Sans Arabic / Ethiopic for those scripts (04 §4).
// Latin adds SemiBold for headings and labels (04a v2 §3); Arabic/Ethiopic bundle Regular + Bold only to keep the
// APK small (06 §10), so their "semibold" is Bold. Loaded offline via expo-font.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { NotoSansEthiopic_400Regular } from '@expo-google-fonts/noto-sans-ethiopic/400Regular';
import { NotoSansEthiopic_700Bold } from '@expo-google-fonts/noto-sans-ethiopic/700Bold';
import type { Lang } from '../../shared/types';

export const FONT_ASSETS = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  NotoSansArabic_400Regular,
  NotoSansArabic_700Bold,
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
};

type FontName = keyof typeof FONT_ASSETS;

export interface FontPair {
  regular: FontName;
  semibold: FontName;
  bold: FontName;
}

export const FONT_FAMILY: Record<Lang, FontPair> = {
  en: { regular: 'PlusJakartaSans_400Regular', semibold: 'PlusJakartaSans_600SemiBold', bold: 'PlusJakartaSans_700Bold' },
  ar_EG: { regular: 'NotoSansArabic_400Regular', semibold: 'NotoSansArabic_700Bold', bold: 'NotoSansArabic_700Bold' },
  am_ET: { regular: 'NotoSansEthiopic_400Regular', semibold: 'NotoSansEthiopic_700Bold', bold: 'NotoSansEthiopic_700Bold' },
};

/** Arabic and Ethiopic glyphs need taller lines than Latin to avoid clipping marks. */
export const LINE_HEIGHT_RATIO: Record<Lang, number> = { en: 1.3, ar_EG: 1.55, am_ET: 1.5 };
