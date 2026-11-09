// i18n (06 §2): i18next with bundled resources only — nothing is ever loaded over a network.
// Each screen gets a fixed-language `t` from UiProvider, so several languages can render side by
// side (component gallery) and there is no global mutable language.
import { createInstance, type TFunction } from 'i18next';
import type { Lang } from '../../shared/types';
import { am_ET } from './strings/am_ET';
import { ar_EG } from './strings/ar_EG';
import { en, type Strings } from './strings/en';

/** BCP 47 tag per app language, used by i18next and Intl. */
export const LOCALE: Record<Lang, string> = { ar_EG: 'ar-EG', am_ET: 'am-ET', en: 'en' };

/** Each language's own name, shown untranslated on the language picker (03 Flow L). */
export const LANG_NATIVE_NAME: Record<Lang, string> = { ar_EG: 'العربية', am_ET: 'አማርኛ', en: 'English' };

export const STRINGS: Record<Lang, Strings> = { ar_EG, am_ET, en };

const i18n = createInstance();
void i18n.init({
  resources: {
    [LOCALE.ar_EG]: { translation: ar_EG },
    [LOCALE.am_ET]: { translation: am_ET },
    [LOCALE.en]: { translation: en },
  },
  lng: LOCALE.en,
  fallbackLng: false, // a missing translation is a bug, not something to paper over with English
  load: 'currentOnly',
  initAsync: false,
  interpolation: { escapeValue: false }, // React escapes; strings never go into HTML
  returnNull: false,
});

export type Translate = TFunction;

export function translatorFor(lang: Lang): Translate {
  return i18n.getFixedT(LOCALE[lang]);
}

export function isRtl(lang: Lang): boolean {
  return lang === 'ar_EG';
}
