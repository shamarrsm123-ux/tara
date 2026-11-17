// Design tokens. Visual language from 04a (v2, 2026-11-16): white screens, soft peach-tinted cards, one coral
// action color, thin outlined chips and round buttons; zone colors and blue-for-cooling unchanged from 04 §3.
// Night mirrors Sun with adjusted lightness — contrast-checked in theme tests.

export type ThemeName = 'sun' | 'night';

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  sand: string;
  calm: string;
  rising: string;
  high: string;
  cool: string;
  demo: string;
  /** Action color: primary buttons, selection, brand (04a D2). */
  accent: string;
  accentSoft: string;
  /** Near-black pills and panels, and text on them. */
  ink: string;
  onInk: string;
  /** Chip / inactive pill background. */
  chip: string;
  /** Soft tinted card fills (04a v2 §2): peach, apricot, lemon. */
  tintPeach: string;
  tintApricot: string;
  tintLemon: string;
  /** Hairline borders of outlined chips and round buttons. */
  line: string;
  /** Text/icons drawn on a filled calm/high/cool background. */
  onAccent: string;
  /** Text on the demo yellow. */
  onDemo: string;
  /** Pale graph background bands (04 §9.2). */
  bandCalm: string;
  bandRising: string;
  bandHigh: string;
  bandCool: string;
  /** Empty part of the Calm ring and the grey "not connected" ring. */
  track: string;
  neutral: string;
}

export const PALETTES: Record<ThemeName, Palette> = {
  sun: {
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1C1C1E',
    textMuted: '#52525B',
    sand: '#ECECEF',
    calm: '#1B7F3B',
    rising: '#B87900',
    high: '#C62828',
    cool: '#1565C0',
    demo: '#FFD54F',
    accent: '#EF6A4A',
    accentSoft: '#FDECE7',
    ink: '#1C1C1E',
    onInk: '#FFFFFF',
    chip: '#F4F4F6',
    tintPeach: '#FDF2EE',
    tintApricot: '#FEF5EC',
    tintLemon: '#FBFAEC',
    line: '#ECECEF',
    onAccent: '#FFFFFF',
    onDemo: '#1A1714',
    bandCalm: '#E4F2E7',
    bandRising: '#FBF0D9',
    bandHigh: '#FAE3E3',
    bandCool: 'rgba(21, 101, 192, 0.12)',
    track: '#F0F0F2',
    neutral: '#7A7A85',
  },
  night: {
    bg: '#0F0F11',
    surface: '#1A1A1D',
    text: '#F2F2F5',
    textMuted: '#B8B8C0',
    sand: '#2C2C31',
    calm: '#6FCF8A',
    rising: '#F2B544',
    high: '#FF8A80',
    cool: '#82B9F5',
    demo: '#FFD54F',
    accent: '#FF8466',
    accentSoft: '#3A221B',
    ink: '#26262B',
    onInk: '#F2F2F5',
    chip: '#26262B',
    tintPeach: '#2A1D19',
    tintApricot: '#2A2219',
    tintLemon: '#25241A',
    line: '#2C2C31',
    onAccent: '#1A1714',
    onDemo: '#1A1714',
    bandCalm: '#26372A',
    bandRising: '#3B3020',
    bandHigh: '#3E2522',
    bandCool: 'rgba(130, 185, 245, 0.2)',
    track: '#2A2A2F',
    neutral: '#8E8E98',
  },
};

/** Type sizes in sp (04 §4). 16 is the minimum anywhere. */
export const TYPE_SIZE = {
  calmNumber: 72,
  headline: 32,
  title: 28,
  question: 24,
  button: 22,
  zone: 22,
  body: 20,
  caption: 16,
} as const;
export type TypeVariant = keyof typeof TYPE_SIZE;

/** Amber `rising` is AA only as large text (3:1), so any variant drawn in a status color must be bold and ≥ 20sp. */
export const STATUS_TEXT_MIN_SIZE = 20;

/** Layout & touch (04 §5). */
export const TOUCH_MIN = 56;
export const PRIMARY_BUTTON_HEIGHT = 64;
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const RADIUS = { chip: 999, card: 24, tile: 20, tag: 10, button: 999 } as const;

/** One very soft shadow for white cards and the tab bar (04a v2 §3). */
export const SHADOW = {
  shadowColor: '#1C1C1E',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;

/** Coral glow under the primary button and the centre Cool button (04a v2 §4). */
export const ACCENT_GLOW = {
  shadowColor: '#EF6A4A',
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6,
} as const;

/** Bottom tab bar (04 §10: icon + label, 64dp) with the raised centre Cool button (04a v2 D6). */
export const TAB_BAR_HEIGHT = 72;
export const FAB_SIZE = 64;
export const FAB_LIFT = 26;

/** Calm meter ring (04a v2 D1). */
export const RING_STROKE = 22;
export const RING_SIZE = 260;

/** Motion (04 §9.1, §9.5, §11). */
export const METER_EASE_MS = 400;
export const TRANSITION_MAX_MS = 300;
export const DELETE_HOLD_MS = 3000;

/** Android font scaling must work up to 130% without layout break (04 §13). */
export const MAX_FONT_SCALE = 1.3;

/** Learn Your Calm breathing circle: in 4 s, out 6 s (03 Flow 1b, 04 §10). */
export const BREATHE_IN_MS = 4000;
export const BREATHE_OUT_MS = 6000;
/** Pause on "Thank you. Now I know your calm." before Home (03 Flow 1b step 4). 🟡 length unspecified. */
export const CALIBRATION_DONE_PAUSE_MS = 2500;
/** Voice nudge after the fit has not been Good for this long (03 Flow 1 step 5). */
export const FIT_NUDGE_MS = 5000;

/** Illustration colors (04 §8, 04a v3 §6). Fixed artwork colors — never used for text, so not contrast-bound.
 *  🟡 Skin tones, tarha colors and scenes are drafts to review with community members (13 Phase 12). */
export const ART = {
  skinWarm: '#B07A52',
  skinDeep: '#7A4E31',
  blush: '#E07A5F',
  tarhaCream: '#FFF8F1',
  tarhaShade: '#F1DCCB',
  tarhaCoral: '#F7A58A',
  tarhaCoralShade: '#E9876A',
  dress: '#C9705A',
  dressShade: '#AF5A46',
  skyTop: '#FFD9C4',
  skyBottom: '#FFF5EC',
  sun: '#FFB27A',
  sunGlow: '#FFD3A8',
  hillFar: '#F4C7A6',
  fieldMid: '#C9DDA9',
  fieldNear: '#A9CB8E',
  palm: '#D69A74',
  cloud: '#FFFFFF',
  coolTop: '#DCEBFF',
  coolBottom: '#F4F9FF',
  breeze: '#6FA8F0',
  breezeSoft: '#B9D6FA',
  phone: '#2B2B30',
  screen: '#FFF3EC',
  leaf: '#9CC48A',
} as const;

/** Soft blob colors for screen backdrops, per mood (04a v3 §6). */
export const BACKDROP = {
  warm: ['#FFE1D3', '#FFEFD9'],
  calm: ['#DDF1E2', '#EAF6E3'],
  rising: ['#FCEBC8', '#FFF1D6'],
  high: ['#FBD9D4', '#FFE6DC'],
  cool: ['#DCEBFF', '#E6F3FF'],
} as const;
export type BackdropMood = keyof typeof BACKDROP;

/** Gradient ends for the Calm ring, per zone (lighter → zone color). */
export const RING_GRADIENT = {
  calm: '#4CC27A',
  rising: '#E8B23A',
  high: '#F0645A',
} as const;
