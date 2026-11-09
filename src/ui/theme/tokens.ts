// Design tokens from 04. Sun values are the 04 §3 table verbatim; Night is "mirrored with adjusted
// lightness" (04 §3) — 🟡 values chosen here, contrast-checked in theme tests.

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
    bg: '#FBF7F0',
    surface: '#FFFFFF',
    text: '#1A1714',
    textMuted: '#5A524A',
    sand: '#E9DCC6',
    calm: '#1B7F3B',
    rising: '#B87900',
    high: '#C62828',
    cool: '#1565C0',
    demo: '#FFD54F',
    onAccent: '#FFFFFF',
    onDemo: '#1A1714',
    bandCalm: '#E4F2E7',
    bandRising: '#FBF0D9',
    bandHigh: '#FAE3E3',
    bandCool: 'rgba(21, 101, 192, 0.18)',
    track: '#E9DCC6',
    neutral: '#7D746B',
  },
  night: {
    bg: '#231A14',
    surface: '#33281F',
    text: '#F6EBDC',
    textMuted: '#CDBEAA',
    sand: '#5A4A3A',
    calm: '#6FCF8A',
    rising: '#F2B544',
    high: '#FF8A80',
    cool: '#82B9F5',
    demo: '#FFD54F',
    onAccent: '#1A1714',
    onDemo: '#1A1714',
    bandCalm: '#26372A',
    bandRising: '#3B3020',
    bandHigh: '#3E2522',
    bandCool: 'rgba(130, 185, 245, 0.22)',
    track: '#4A3C30',
    neutral: '#A39584',
  },
};

/** Type sizes in sp (04 §4). 16 is the minimum anywhere. */
export const TYPE_SIZE = {
  calmNumber: 72,
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
export const RADIUS = { chip: 999, card: 20, button: 16 } as const;

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
