import { LANGS } from '../../shared/types';
import { isRtl, LANG_NATIVE_NAME, STRINGS, translatorFor } from '../i18n';
import { formatClock, formatNumber } from '../i18n/format';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

const FLAT = Object.fromEntries(LANGS.map((l) => [l, flatten(STRINGS[l] as unknown as Tree)])) as Record<
  (typeof LANGS)[number],
  Record<string, string>
>;
const EN_KEYS = Object.keys(FLAT.en).sort();
const placeholders = (s: string) => [...s.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();

// 04 §12. 🟡 Arabic equivalents drafted here; Amharic list needs a native speaker (13 Phase 12).
const BANNED: Record<string, readonly RegExp[]> = {
  any: [/abnormal/i, /disorder/i, /PMDD/i, /symptom/i, /diagnosis/i, /brain scan/i, /mind reading/i],
  ar_EG: [/اضطراب/, /تشخيص/, /أعراض/, /غير طبيعي/],
};

describe('i18n completeness (12 §2.4)', () => {
  test.each(LANGS)('%s has exactly the English keys', (lang) => {
    expect(Object.keys(FLAT[lang]).sort()).toEqual(EN_KEYS);
  });

  test.each(LANGS)('%s has no empty strings', (lang) => {
    expect(Object.entries(FLAT[lang]).filter(([, v]) => v.trim() === '')).toEqual([]);
  });

  test.each(LANGS)('%s uses the same {{placeholders}} as English', (lang) => {
    const mismatched = EN_KEYS.filter((k) => placeholders(FLAT[lang][k]!).join() !== placeholders(FLAT.en[k]!).join());
    expect(mismatched).toEqual([]);
  });

  test.each(LANGS)('%s translator resolves every key to its own string (never the key itself)', (lang) => {
    const t = translatorFor(lang);
    const unresolved = EN_KEYS.filter((k) => (t as (key: string) => string)(k) === k);
    expect(unresolved).toEqual([]);
  });

  test('every language has a native name for the picker', () => {
    expect(LANGS.map((l) => LANG_NATIVE_NAME[l].length > 0)).toEqual([true, true, true]);
  });
});

describe('copy rules (04 §12)', () => {
  test.each(LANGS)('%s contains no banned words', (lang) => {
    const rules = [...(BANNED.any ?? []), ...(BANNED[lang] ?? [])];
    const hits = Object.entries(FLAT[lang]).filter(([, v]) => rules.some((r) => r.test(v)));
    expect(hits).toEqual([]);
  });
});

describe('direction and formatting', () => {
  test('only Arabic is right-to-left', () => {
    expect(LANGS.filter(isRtl)).toEqual(['ar_EG']);
  });

  test('interpolates values into translations', () => {
    expect(translatorFor('en')('deleteAll.hold', { seconds: '3' })).toBe('Hold for 3 seconds');
  });

  test('formats numbers with locale digits', () => {
    expect(formatNumber(20, 'en')).toBe('20');
    expect(formatNumber(20, 'ar_EG')).toBe('٢٠');
  });

  test('formats a clock time', () => {
    const noonUtc = Date.UTC(2026, 0, 1, 12, 5);
    expect(formatClock(noonUtc, 'en')).toMatch(/\d{1,2}:05/);
  });
});
