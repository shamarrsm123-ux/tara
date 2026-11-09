// Locale-aware number and time formatting (04 §4).
// 🟡 Arabic uses the ar-EG default (Eastern Arabic digits). Following the phone's own digit setting
// needs expo-localization; deferred until Settings (Phase 11).
import type { Lang } from '../../shared/types';
import { LOCALE } from './index';

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 0 }).format(value);
}

export function formatClock(epochMs: number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: '2-digit', minute: '2-digit' }).format(new Date(epochMs));
}
