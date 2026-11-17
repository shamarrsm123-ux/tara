import { contrastRatio, relativeLuminance, WCAG } from '../theme/contrast';
import { PALETTES, STATUS_TEXT_MIN_SIZE, TYPE_SIZE, type ThemeName } from '../theme/tokens';

const THEMES: ThemeName[] = ['sun', 'night'];
const STATUS = ['calm', 'rising', 'high', 'cool'] as const;

describe('contrast math', () => {
  test('black on white is 21:1 and identical colors are 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  test('rejects non-hex input instead of guessing', () => {
    expect(() => relativeLuminance('red')).toThrow();
  });
});

describe('Sun palette is the 04a v2 table (zone and cooling colors still 04 §3)', () => {
  test('uses the specified colors', () => {
    const { bg, surface, text, textMuted, sand, calm, rising, high, cool, demo } = PALETTES.sun;
    expect([bg, surface, text, textMuted, sand]).toEqual(['#FFFFFF', '#FFFFFF', '#1C1C1E', '#52525B', '#ECECEF']);
    expect([PALETTES.sun.accent, PALETTES.sun.ink, PALETTES.sun.chip]).toEqual(['#EF6A4A', '#1C1C1E', '#F4F4F6']);
    expect([calm, rising, high, cool, demo]).toEqual(['#1B7F3B', '#B87900', '#C62828', '#1565C0', '#FFD54F']);
  });

  test('primary text ≥ 15:1 and muted text ≥ 7:1 on the background (04 §3)', () => {
    expect(contrastRatio(PALETTES.sun.text, PALETTES.sun.bg)).toBeGreaterThanOrEqual(15);
    expect(contrastRatio(PALETTES.sun.textMuted, PALETTES.sun.bg)).toBeGreaterThanOrEqual(7);
  });
});

describe.each(THEMES)('%s theme meets WCAG AA (04 §3)', (theme) => {
  const p = PALETTES[theme];

  test('body text is AAA on background and surface', () => {
    expect(contrastRatio(p.text, p.bg)).toBeGreaterThanOrEqual(WCAG.aaaNormal);
    expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(WCAG.aaaNormal);
    expect(contrastRatio(p.textMuted, p.surface)).toBeGreaterThanOrEqual(WCAG.aaNormal);
  });

  test.each(STATUS)('%s is at least AA-large on background and surface', (token) => {
    expect(contrastRatio(p[token], p.bg)).toBeGreaterThanOrEqual(WCAG.aaLarge);
    expect(contrastRatio(p[token], p.surface)).toBeGreaterThanOrEqual(WCAG.aaLarge);
  });

  test.each(['calm', 'high', 'cool'] as const)('text on a filled %s button is AA', (token) => {
    expect(contrastRatio(p.onAccent, p[token])).toBeGreaterThanOrEqual(WCAG.aaNormal);
  });

  test('orange buttons: bold ≥ 20sp label is AA-large; orange text on cards is AA-large', () => {
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(WCAG.aaLarge);
    expect(contrastRatio(p.accent, p.surface)).toBeGreaterThanOrEqual(WCAG.aaLarge);
  });

  test('text on the dark panel is AAA', () => {
    expect(contrastRatio(p.onInk, p.ink)).toBeGreaterThanOrEqual(WCAG.aaaNormal);
  });

  test('text on chips is AAA', () => {
    expect(contrastRatio(p.text, p.chip)).toBeGreaterThanOrEqual(WCAG.aaaNormal);
  });

  test.each(['tintPeach', 'tintApricot', 'tintLemon', 'accentSoft'] as const)('text on %s cards is AAA and muted text is AA', (token) => {
    expect(contrastRatio(p.text, p[token])).toBeGreaterThanOrEqual(WCAG.aaaNormal);
    expect(contrastRatio(p.textMuted, p[token])).toBeGreaterThanOrEqual(WCAG.aaNormal);
  });

  test('inactive tab icons are visible (≥ 3:1) and the selected day pill label is AA-large', () => {
    expect(contrastRatio(p.neutral, p.surface)).toBeGreaterThanOrEqual(WCAG.aaLarge);
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(WCAG.aaLarge);
  });

  test('demo ribbon text is AA', () => {
    expect(contrastRatio(p.onDemo, p.demo)).toBeGreaterThanOrEqual(WCAG.aaNormal);
  });

  test('grey "not connected" ring and dash are visible (≥ 3:1)', () => {
    expect(contrastRatio(p.neutral, p.bg)).toBeGreaterThanOrEqual(WCAG.aaLarge);
    expect(contrastRatio(p.neutral, p.surface)).toBeGreaterThanOrEqual(WCAG.aaLarge);
  });
});

describe('typography (04 §4)', () => {
  test('no size is below the 16sp minimum', () => {
    expect(Math.min(...Object.values(TYPE_SIZE))).toBeGreaterThanOrEqual(16);
  });

  test('the zone word is large enough for amber to pass AA-large', () => {
    expect(TYPE_SIZE.zone).toBeGreaterThanOrEqual(STATUS_TEXT_MIN_SIZE);
  });

  test('specified sizes', () => {
    expect([TYPE_SIZE.calmNumber, TYPE_SIZE.title, TYPE_SIZE.body, TYPE_SIZE.button, TYPE_SIZE.caption]).toEqual([72, 28, 20, 22, 16]);
  });
});
