// Types every `t('…')` key against the English source strings, so a typo is a compile error.
import 'i18next';
import type { Strings } from './strings/en';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Strings };
  }
}
