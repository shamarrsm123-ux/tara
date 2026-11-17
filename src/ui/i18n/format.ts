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

/** "9:05" as a countdown in the language's digits (Calm card timer, 03 Flow 3). */
export function formatCountdown(totalSeconds: number, lang: Lang): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const minutes = new Intl.NumberFormat(LOCALE[lang]).format(Math.floor(s / 60));
  const seconds = new Intl.NumberFormat(LOCALE[lang], { minimumIntegerDigits: 2 }).format(s % 60);
  return `${minutes}:${seconds}`;
}

/** "Monday, 16 November" in the language's script and digits (Home greeting row, 04a v2 §4). */
export function formatDate(epochMs: number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(epochMs));
}

/** Day number and short weekday for the My Days date strip ("16", "Mon"). */
export function formatDayParts(epochMs: number, lang: Lang): { day: string; weekday: string } {
  const date = new Date(epochMs);
  return {
    day: new Intl.DateTimeFormat(LOCALE[lang], { day: '2-digit' }).format(date),
    weekday: new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short' }).format(date),
  };
}
