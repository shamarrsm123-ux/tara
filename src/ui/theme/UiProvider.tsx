// Provides theme, language, translator and font scale to ui/ components.
// RTL: 🟡 layout direction is set with the `direction` style on this provider's root view instead of
// I18nManager.forceRTL. I18nManager only applies after an app restart, and the only in-app restart in
// Expo is expo-updates, which is forbidden (06 §2). `direction` flips layout immediately on Android and web.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Lang } from '../../shared/types';
import { isRtl, translatorFor, type Translate } from '../i18n';
import { FONT_FAMILY, LINE_HEIGHT_RATIO, type FontPair } from './fonts';
import { MAX_FONT_SCALE, PALETTES, type Palette, type ThemeName } from './tokens';

export interface UiValue {
  lang: Lang;
  theme: ThemeName;
  palette: Palette;
  t: Translate;
  isRtl: boolean;
  /** In-app scale on top of the OS setting; the gallery uses it to preview 130%. */
  fontScale: number;
  fonts: FontPair;
  lineHeightRatio: number;
}

const UiContext = createContext<UiValue | null>(null);

interface UiProviderProps {
  lang: Lang;
  theme: ThemeName;
  fontScale?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function UiProvider({ lang, theme, fontScale = 1, style, children }: UiProviderProps) {
  const value = useMemo<UiValue>(
    () => ({
      lang,
      theme,
      palette: PALETTES[theme],
      t: translatorFor(lang),
      isRtl: isRtl(lang),
      fontScale: Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE),
      fonts: FONT_FAMILY[lang],
      lineHeightRatio: LINE_HEIGHT_RATIO[lang],
    }),
    [lang, theme, fontScale],
  );
  return (
    <UiContext.Provider value={value}>
      <View style={[styles.root, { direction: value.isRtl ? 'rtl' : 'ltr' }, style]}>{children}</View>
    </UiContext.Provider>
  );
}

export function useUi(): UiValue {
  const value = useContext(UiContext);
  if (value === null) {
    throw new Error('useUi() must be used inside <UiProvider>');
  }
  return value;
}

const styles = StyleSheet.create({ root: { alignSelf: 'stretch' } });
