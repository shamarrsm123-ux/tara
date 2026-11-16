// Design tokens. Visual language from 04a (team decision 2026-11-16): neutral near-white, white cards, orange
// action color, near-black panels; zone colors and blue-for-cooling unchanged from 04 §3. Night mirrors
// Sun with adjusted lightness — contrast-checked in theme tests.

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
    bg: '#F5F5F7',
    surface: '#FFFFFF',
    text: '#111114',
    textMuted: '#52525B',
    sand: '#E5E5EA',
    calm: '#1B7F3B',
    rising: '#B87900',
    high: '#C62828',
    cool: '#1565C0',
    demo: '#FFD54F',
    accent: '#E96B10',
    accentSoft: '#FFEEE2',
    ink: '#18181B',
    onInk: '#FFFFFF',
    chip: '#EFEFF2',
    onAccent: '#FFFFFF',
    onDemo: '#1A1714',
    bandCalm: '#E4F2E7',
    bandRising: '#FBF0D9',
    bandHigh: '#FAE3E3',
    bandCool: 'rgba(21, 101, 192, 0.14)',
    track: '#E5E5EA',
    neutral: '#7A7A85',
  },
  night: {
    bg: '#111113',
    surface: '#1C1C1F',
    text: '#F2F2F5',
    textMuted: '#B8B8C0',
    sand: '#2E2E33',
    calm: '#6FCF8A',
    rising: '#F2B544',
    high: '#FF8A80',
    cool: '#82B9F5',
    demo: '#FFD54F',
    accent: '#FF8A3D',
    accentSoft: '#3A2414',
    ink: '#26262B',
    onInk: '#F2F2F5',
    chip: '#2A2A2E',
    onAccent: '#1A1714',
    onDemo: '#1A1714',
    bandCalm: '#26372A',
    bandRising: '#3B3020',
    bandHigh: '#3E2522',
    bandCool: 'rgba(130, 185, 245, 0.22)',
    track: '#2E2E33',
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
export const RADIUS = { chip: 999, card: 28, button: 999 } as const;

/** One soft shadow for cards and round buttons (04a §3). */
export const SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

/** Calm meter (04 §9.1). */
export const RING_STROKE = 18;
export const RING_SIZE = 240;

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
