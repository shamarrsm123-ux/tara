// Every tunable (⚙️) value from 07 §9, in one place. Changing one must not require touching
// logic (07 §0). Any change is recorded in 07 (13 Phase 15). Demo-only overrides live in demo/.

// Sensor fit (07 §3)
export const FIT_GOOD = 70;
export const FIT_ADJUST = 40;

// Stress index (07 §4)
export const EMA_TAU_S = 10;
export const BASELINE_SECONDS = 60;
export const S_MIN_SPREAD = 0.05;
export const STRESS_OFFSET = 30;
export const STRESS_GAIN = 20;

// Zones, on the stress index S (07 §4.5). Calm C = 100 − S.
export const ZONE_CALM_MAX_S = 50;
export const ZONE_HIGH_MIN_S = 70;
export const ZONE_VERY_HIGH_MIN_S = 85;

// High episode & prompt (07 §5.1–5.2)
export const SUSTAIN_S = { fewer: 90, normal: 60, more: 45 } as const;
export const VALID_FRACTION = 0.8;
export const HIGH_END_S = 55;
export const HIGH_END_HOLD_S = 60;
export const PROMPT_COOLDOWN_MIN = 15;
export const POST_COOLING_QUIET_MIN = 10;
export const NO_COUNT_ASK = 3;
export const AUTO_COOL_MIN_GAP_MIN = 30;

// Cooling (07 §5.3)
export const COOL_MAX_CONTINUOUS_MIN = 20;
export const COOL_REST_MIN = 5;

// Help question (07 §5.4)
export const HELP_SUSTAIN_MIN = 10;
export const HELP_COOLDOWN_MIN = 60;

// Patterns & reminders (07 §6)
export const PATTERN_MIN_USABLE_DAYS = 4;
export const PATTERN_MIN_MATCH_DAYS = 3;
export const PATTERN_FADE_BELOW = 2;
export const REMINDER_LEAD_MIN = 30;
export const PATTERN_DECLINE_DAYS = 7;

// Battery (07 §7)
export const BATT_LOW = 20;
export const BATT_LOCK = 10;
export const BATT_OFF = 3;
export const PHONE_BATT_LOW = 15;

// Retention (05, 10 P4)
export const RETENTION_MAX_DAYS = 7;

/** Calm level at or above which the zone is Calm (C = 100 − S). */
export const CALM_ZONE_MIN_C = 100 - ZONE_CALM_MAX_S;
/** Calm level at or below which the zone is High stress. */
export const HIGH_ZONE_MAX_C = 100 - ZONE_HIGH_MIN_S;

// ---- Values stated in the body of 07 (and 09) but not in the §9 summary ----

// BLE packet (07 §2.3, §2.5, §2.7; 09 §2)
export const PROTOCOL_VERSION = 1;
export const METRICS_PACKET_BYTES = 14;
export const SEQ_GAP_UNSTABLE = 5;
export const SIGNAL_UNSTABLE_S = 10;
export const COOL_MAX_DURATION_S = 1200;

// Fit chip shown after a stable reading (07 §3)
export const FIT_STABLE_S = 3;

// EMA reset after this long without a valid second (07 §4.2)
export const EMA_RESET_INVALID_S = 30;

// 🟡 Population default baseline when calibration is skipped (07 §4.3 says "firmware-provided"; no values
// given). ln(beta / (alpha + theta)) ≈ −0.7 for a typical resting ratio of ~0.5. Revisit with real data.
export const DEFAULT_BASELINE_M = -0.7;
export const DEFAULT_BASELINE_S = 0.25;

// High episode ends after this long with no valid signal (07 §5.1)
export const HIGH_END_NO_SIGNAL_MIN = 10;

// Cooling (07 §5.3, 11 §4)
export const COOL_EXTEND_MIN = 10;
export const COOL_CONFIRM_S = 2;

// Battery alert re-arms above this level (07 §7)
export const BATT_REARM = 30;

// Pattern detection (07 §6)
export const PATTERN_USABLE_DAY_VALID_MIN = 120;
export const PATTERN_FIRST_SLOT_MIN = 6 * 60;
export const PATTERN_LAST_SLOT_MIN = 19 * 60 + 30;
export const PATTERN_SLOT_STEP_MIN = 30;
export const PATTERN_WINDOW_MIN = 60;
export const PATTERN_ROUND_MIN = 15;
export const PATTERN_MAX = 2;

// Minute summaries (05 §2.4): zone is `unknown` below this many valid seconds; cooling counts as on for the
// minute when active at least this long.
export const MINUTE_ZONE_MIN_VALID_S = 30;
export const MINUTE_COOLING_MIN_S = 30;

// Tarha connection (03 Flow 1, 09 §2)
export const SCAN_TIMEOUT_S = 10;
export const RECONNECT_BACKOFF_START_S = 2;
export const RECONNECT_BACKOFF_MAX_S = 60;
