// Help-request text (03 Flow 11 step 4, 09 §8): exactly what the preview shows and what lands in the SMS composer.
// No GPS, no stress numbers — only her chosen name and, if she picked one, a general place label (P7, P8).
import type { PlaceLabel } from '../shared/types';
import type { Translate } from '../ui/i18n';

export function buildHelpMessage(t: Translate, name: string | null, place: PlaceLabel | null): string {
  const who = name !== null && name.trim().length > 0 ? t('help.messageNamed', { name: name.trim() }) : t('help.messageUnnamed');
  const where = place === null ? '' : t('help.messagePlace', { place: t(`place.${place}` as const) });
  return `${who}${where}${t('help.messageSign')}`;
}

/** 03 Flow 10 step 4: the optional test message to a new contact. */
export function buildTestMessage(t: Translate, name: string | null): string {
  const who = name !== null && name.trim().length > 0 ? name.trim() : t('help.someone');
  return t('help.testMessage', { name: who });
}

/** Last three digits for the contact list (03 Flow 10 step 3). */
export const lastDigits = (phoneE164: string): string => phoneE164.slice(-3);
