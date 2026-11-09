// Voice line registry (04 §6, 12 §2.4): every line id has a bundled audio file in every language.
// 🟡 All entries are a placeholder tone until native speakers record them (13 Phase 12). A release
// build must not ship placeholders; `placeholderEntries()` is what that check will use.
import { LANGS, VOICE_LINE_IDS, type Lang, type VoiceLineId } from '../../shared/types';

export interface VoiceAsset {
  /** Metro asset module id (result of `require('…wav')`). */
  source: number;
  isPlaceholder: boolean;
}

const PLACEHOLDER: VoiceAsset = {
  source: require('../../../assets/voice/placeholder.wav') as number,
  isPlaceholder: true,
};

function placeholderLines(): Record<VoiceLineId, VoiceAsset> {
  return Object.fromEntries(VOICE_LINE_IDS.map((id) => [id, PLACEHOLDER])) as Record<VoiceLineId, VoiceAsset>;
}

export const VOICE_ASSETS: Record<Lang, Record<VoiceLineId, VoiceAsset>> = {
  ar_EG: placeholderLines(),
  am_ET: placeholderLines(),
  en: placeholderLines(),
};

export function placeholderEntries(): { lang: Lang; line: VoiceLineId }[] {
  return LANGS.flatMap((lang) =>
    VOICE_LINE_IDS.filter((line) => VOICE_ASSETS[lang][line].isPlaceholder).map((line) => ({ lang, line })),
  );
}
