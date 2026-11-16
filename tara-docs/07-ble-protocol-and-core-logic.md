# TARA — BLE Protocol & Core Logic Specification

**Version:** 1.0
**Document:** 07 — BLE Protocol & Core Logic (the equivalent of Nexus's API spec)
**Status:** Ready — every constant below is a prototype default, marked tunable
**Depends on:** 02, 03, 05, 06

---

## 0. Purpose

Nexus's `07` defined the contract between client and server. TARA has no server; its two critical contracts are:

1. **Tarha ↔ phone** — the BLE protocol (Section 2).
2. **Signal ↔ decisions** — how numbers become a Calm level, and how the Calm level becomes prompts, cooling, reminders and help questions (Sections 3–8).

All values marked ⚙️ are tunable constants defined in one file (`engine/constants.ts`); changing one must not require touching logic.

### 0.1 The Science Honesty Clause

"Beta waves = stress" is a simplification. TARA uses a **relative index**: the ratio of beta power to alpha+theta power, compared with *her own* calm baseline. Published work shows in-ear/behind-ear EEG can classify stress better than chance under study conditions (≈77% cross-subject in one 66-person in-ear study), and that combining EEG with HRV may help further. These are single studies under lab conditions. TARA's index is a **research signal, not a medical measurement**, and all user-facing language follows from that.

---

## 1. Units & Conventions

- Time: phone monotonic clock for durations; local wall clock for patterns/reminders.
- Sample rate into the engine: **1 Hz** (one BLE metrics packet per second).
- "Valid second": a sample with fit = Good and passing packet validation.
- Stress index `S` ∈ [0,100], higher = more stressed. **Calm `C = 100 − S`** is the only number shown.

---

## 2. BLE Protocol

### 2.1 Roles
Tarha = GATT peripheral. Phone = central. One phone per tarha (bonded).

### 2.2 Service & Characteristics
Custom 128-bit UUIDs (generated once, recorded in `ble/uuids.ts` and firmware):

| Characteristic | Props | Purpose |
|---|---|---|
| `metrics` | Notify | 1 Hz sensor summary |
| `status` | Read, Notify | Battery, cooling state, faults |
| `control` | Write (with response) | Commands from phone |
| Device Information Service (standard 0x180A) | Read | Model, firmware version |

All three custom characteristics require an **encrypted, bonded link** (LE Secure Connections). The phone refuses unencrypted connections.

🟡 *Prototype limitation: with no display/keypad on the tarha, pairing is "Just Works" (encrypted but not MITM-authenticated). Product version should add a button-press confirmation or an out-of-band code printed on the tarha.*

### 2.3 `metrics` packet (little-endian, 14 bytes)

| Offset | Field | Type | Notes |
|---|---|---|---|
| 0 | `ver` | u8 | Protocol version = 1 |
| 1 | `seq` | u16 | Wraps; used to detect drops |
| 3 | `theta` | u16 | Band power, scaled (fixed-point, firmware-defined scale, same for all bands) |
| 5 | `alpha` | u16 | 8–12 Hz |
| 7 | `beta` | u16 | 13–30 Hz |
| 9 | `fit` | u8 | Contact quality 0–100 |
| 10 | `temp` | i16 | Skin temp × 100 °C; `0x7FFF` = no sensor |
| 12 | `flags` | u8 | bit0 motion artifact, bit1 saturation |
| 13 | `crc8` | u8 | CRC-8 over bytes 0–12 |

Theta (4–8 Hz) included for the ratio's denominator. **No raw waveform is ever transmitted.**

🟡 *Phase 2: "CRC-8" is implemented as CRC-8/SMBUS (poly 0x07, init 0x00, no reflection) — firmware must match. Packets longer than 14 bytes with a supported `ver` are accepted and trailing bytes ignored (§2.6). Saturation/motion flags decode to a sample that is an invalid second (`isValid` = false) rather than a decode error, so the 09 `MetricsSample` fields stay meaningful; length/CRC/version/all-zero bands are decode errors. A second whose band ratio is undefined (beta = 0 or alpha + theta = 0) is also invalid.*

### 2.4 `status` packet (6 bytes)
`ver u8 · battery_pct u8 · cooling u8 (0 off, 1 on, 2 locked: battery, 3 locked: rest period, 4 fault) · cooling_remaining_s u16 · faults u8`

Sent on change and at least every 10 s.

### 2.5 `control` opcodes
| Opcode | Payload | Effect |
|---|---|---|
| `0x01 COOL_ON` | `duration_s u16` | Start cooling (firmware enforces its own max 1200 s and battery lockout) |
| `0x02 COOL_OFF` | — | Stop cooling |
| `0x03 BLINK` | — | Blink LED 3 s (identify during pairing) |
| `0x04 PING` | — | Liveness check |

**Firmware is the safety authority for cooling** (max duration, battery cutoff, optional overcool cutoff). The app's rules are a first layer; firmware is the last.

### 2.6 Versioning
`ver` mismatch → app shows "Please update TARA" and does not interpret metrics. New fields are only appended; old apps ignore trailing bytes when `ver` is supported.

### 2.7 Validation (phone side)
Reject a packet (treat as invalid second) if: wrong length, unsupported `ver`, CRC fail, all bands 0, or any saturation flag. Gaps in `seq` > 5 → mark "signal unstable" for 10 s.

---

## 3. Sensor Fit

| `fit` | Chip | Valid? |
|---|---|---|
| ≥ 70 ⚙️ | Good | Yes |
| 40–69 | Adjust | No |
| < 40 | No contact | No |

Also invalid if the motion-artifact flag is set. Fit chip shown after 3 s of a stable reading (no flicker).

---

## 4. Stress Index

### 4.1 Per-second raw value
`x = ln( beta / (alpha + theta) )`, computed only for valid seconds.

### 4.2 Smoothing
Exponential moving average with time constant **10 s** ⚙️: `x̄ ← x̄ + (x − x̄) · (1 − e^(−1/10))`. Reset if > 30 s of invalid seconds.

### 4.3 Baseline (calibration, Flow 1b)
Collect 60 valid seconds. `m = median(x)`, `s = max(1.4826 · MAD(x), s_min)` where `s_min = 0.05` ⚙️.
Default baseline (if skipped): firmware-provided population default for `m`, `s` ⚙️, flagged `is_default`. 🟡 *Phase 2: until firmware provides one, the app default is m = −0.7, s = 0.25 (`DEFAULT_BASELINE_M/S`).*

### 4.4 Mapping to 0–100
`z = (x̄ − m) / s`
`S = clamp(30 + 20·z, 0, 100)` ⚙️  → at her baseline, S = 30 (Calm 70, green).

### 4.5 Zones
| Zone | Stress S | Calm C | Color |
|---|---|---|---|
| Calm | ≤ 50 | ≥ 50 | Green |
| Rising | 51–69 | 31–49 | Yellow |
| High | ≥ 70 | ≤ 30 | Red |
| Very high (internal) | ≥ 85 | ≤ 15 | Red |

---

## 5. Engine Rules

### 5.1 High episode
- **Starts** when S ≥ 70 for a sustain window W with ≥ 80% valid seconds.
  W by sensitivity: Fewer 90 s · Normal 60 s · More 45 s ⚙️.
- **Ends** when S ≤ 55 for 60 s (hysteresis ⚙️), or after 10 min of no valid signal.
- Logged as `high_episode_start` / `high_episode_end` events.

### 5.2 High-stress prompt (Flow 3)
Show when a high episode starts **and**: cooling is off, alerts aren't muted, no prompt in the last 15 min ⚙️ (or since the last "No"), and no cooling ended in the last 10 min.
- Yes → cooling command (5.3). No → 15-min suppression; count Nos per day (3 → "alert less often?").
- In `cooling_mode = auto`: skip the question, start cooling, announce it. Auto-starts limited to 1 per 30 min ⚙️.
- ✅ *Decision 2026-11-16 (team): the conditions above are checked on every valid second while a high episode is on, not only at its start. If stress stays high after a No, after cooling ends, or after a mute, she is asked again once the 15 min cooldown / 10 min post-cooling quiet / mute is over — matching `03` Flow 3 ("no new prompt for 15 minutes") and `12` §6 flow 3, which rank above this document.*
- 🟡 *"Should I alert you less often today?" → Yes uses the Fewer sustain window (90 s) for the rest of that local day (`02` §12). The "Cooling can't start right now" card closes with OK without counting a No.*

### 5.3 Cooling
- Duration = `settings.cooling_minutes` (default 10). One extension of +10 min allowed. Hard cap 20 min continuous, then 5 min rest (firmware enforces with status `3`).
- Disallowed if tarha battery ≤ 10% (status `2`) or disconnected.
- Optional overcool guard: if thermistor present and skin temp < 30.0 °C ⚙️ → firmware stops cooling.
- App shows cooling state **only from `status` notifications**, never optimistically beyond a 2 s "starting…" spinner.
- 🟡 *Phase 2: the one extension re-sends `COOL_ON` with the new remaining duration (capped at 20 min from the session start). The app also stops cooling itself if tarha battery reaches ≤ 10% while on (reason `battery`), in addition to the firmware lockout.*

### 5.4 Help question (Flow 11, entry B)
Ask when: S ≥ 85 for 10 min ⚙️ (≥ 80% valid) **and** in this episode cooling ran or the prompt was shown **and** no help question in the last 60 min ⚙️ **and** alerts not muted.
**Never** sends anything. It only asks.

### 5.5 Muting
Mute 30 min / 1 h / rest of day suppresses prompts and help questions. It does not affect manual actions or battery alerts.

---

## 6. Pattern Detection (Smart Reminder)

Runs nightly (first app run after 00:00 local) and after retention changes.

1. **Usable days** = days within retention with ≥ 120 valid minutes. 🟡 *A valid minute = a `minute_summary` row whose zone isn't `unknown` (≥ 30 valid seconds). Only the first episode start per day counts toward a window. Fade support (step 7) counts usable days with a start within ±30 min of the pattern time.*
2. Require ≥ 4 usable days ⚙️; otherwise no patterns ("I need more days").
3. Candidate windows: every 30-min boundary `t` from 06:00 to 19:30; window `[t, t+60 min)`.
4. A day **matches** `t` if a `high_episode_start` occurred in the window that day.
5. A pattern exists at `t` if matching days ≥ 3 ⚙️. Keep the top 2 non-overlapping windows by matching days.
6. **Pattern time** = median of the matching episode start times, rounded down to 15 min. **Reminder time** = pattern time − 30 min ⚙️.
7. **Fade:** an accepted pattern with < 2 matching days in the current window → `faded`, cancel reminder, show the "gone lately" card once.
8. **Declined** patterns aren't re-offered for 7 days.

Worked example: episodes started at 14:05 Mon, 13:52 Tue, 14:20 Thu, 14:10 Sat; usable days = 6. Window [13:30,14:30) matches 4 days. Median start 14:07 → pattern 14:00 → reminder 13:30. ✓ matches the brief's 2 PM / 1:30 PM example.

---

## 7. Battery Rules

| Source | Threshold | Action |
|---|---|---|
| Tarha | ≤ 20% ⚙️ | One alert per charge cycle (re-arms when > 30%) |
| Tarha | ≤ 10% | Cooling locked; alert |
| Tarha | ≤ 3% | "Turning off" alert |
| Phone | ≤ 15% while monitoring | One alert per day |

---

## 8. Demo Source

Implements `TarhaSource` (`09` §2) with scripted band powers.

**"Story" script (≈ 30 s, used for the MVP video), time-compressed and labeled "Demo — sped up":**
| t (s) | Calm shown | Event |
|---|---|---|
| 0–5 | 70 → 55 | Home, green → yellow |
| 5–9 | 55 → 20 | Red |
| 9 | 20 | Prompt (sustain window shortened to 3 s in demo only) |
| 11 | 20 | Tap Yes → cooling on |
| 11–25 | 20 → 60 | Calm rises (stress 80 → 40) |
| 25–30 | 60 → 80 | "You are calmer now" → green |

Demo-only overrides (sustain windows, time compression) live in `demo/` and **can't** affect the real engine's constants.

🟡 *Phase 3 implementation notes:*
- *The demo emits real 14-byte packets through the real decoder, StressComputer and engine. The scripts state the Calm to be **shown**; the demo source pre-compensates for the 10 s EMA so the smoothed value lands on the script. Scripts are written against the default baseline, and the idle signal before a scenario starts has a spread that makes a real Learn Your Calm run converge to that baseline.*
- *Story: Calm falls 55 → 20 between 5 s and 7 s so that, with 1 Hz ticks and the 3 s demo sustain, the prompt appears at ~10 s (table: 9 s). After Yes, Calm follows the table relative to when cooling started; without Yes it stays at 20.*
- *The 3 s sustain is passed to the engine as an injected `timing` option by the demo runner only; `engine/constants.ts` is unchanged and real sessions never pass it.*
- *Calm day / Bad 2 PM week: real-time calm signal. Bad 2 PM week also generates 7 days of in-memory history (5 days with a ~2 PM episode) that detection turns into a 14:00 pattern with a 13:30 reminder. Low battery (sped up): battery 26% → 1% at 0.5%/s. Loose sensor: 40 s cycle of Good / Adjust / No contact / motion; while fit is bad the signal looks very stressed, and no alert fires.*

---

## 9. Constants Summary (`engine/constants.ts`)

```ts
FIT_GOOD = 70; FIT_ADJUST = 40
EMA_TAU_S = 10; BASELINE_SECONDS = 60; S_MIN_SPREAD = 0.05
STRESS_OFFSET = 30; STRESS_GAIN = 20
ZONE_CALM_MAX_S = 50; ZONE_HIGH_MIN_S = 70; ZONE_VERY_HIGH_MIN_S = 85
SUSTAIN_S = { fewer: 90, normal: 60, more: 45 }; VALID_FRACTION = 0.8
HIGH_END_S = 55; HIGH_END_HOLD_S = 60
PROMPT_COOLDOWN_MIN = 15; POST_COOLING_QUIET_MIN = 10; NO_COUNT_ASK = 3
AUTO_COOL_MIN_GAP_MIN = 30
COOL_MAX_CONTINUOUS_MIN = 20; COOL_REST_MIN = 5
HELP_SUSTAIN_MIN = 10; HELP_COOLDOWN_MIN = 60
PATTERN_MIN_USABLE_DAYS = 4; PATTERN_MIN_MATCH_DAYS = 3; PATTERN_FADE_BELOW = 2
REMINDER_LEAD_MIN = 30; PATTERN_DECLINE_DAYS = 7
BATT_LOW = 20; BATT_LOCK = 10; BATT_OFF = 3; PHONE_BATT_LOW = 15
RETENTION_MAX_DAYS = 7
```

---

*End of BLE Protocol & Core Logic. Next: `08-development-rules.md`.*
