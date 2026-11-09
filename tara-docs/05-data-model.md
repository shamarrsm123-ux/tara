# TARA — On-Device Data Model

**Version:** 1.0
**Document:** 05 — Data Model (local, encrypted)
**Status:** Ready
**Depends on:** 02-prd.md, 03-user-flows.md

---

## 0. The Big Difference From a Normal App

There is **no server database**. Every table below lives in one encrypted SQLite database on her phone. The data model is designed around three rules:

1. **Store as little as possible.** Raw EEG never reaches the phone (the tarha sends band powers only — see `07`), and the per-second values the phone computes are **never written to disk**. Only one summary row per minute is stored.
2. **Everything expires.** Every time-series row is deleted when it's older than her retention setting (7 days max).
3. **Everything is deletable at once.** Deleting the encryption key makes the whole database unreadable instantly (crypto-shredding), then the files are removed.

---

## 1. Storage Layers

| Layer | What | Where |
|---|---|---|
| Memory only | Per-second band powers, stress index, fit quality, the whole Try session, demo data | RAM, discarded |
| Secure keystore | Database encryption key (256-bit random) | Android Keystore / iOS Keychain via `expo-secure-store` |
| Encrypted DB | Everything in Section 2 | SQLite + SQLCipher, app-private storage |
| Plain preferences | **Nothing personal.** Only `has_completed_setup` (boolean) and `language` so the app can render the lock/launch screen before decrypting | App-private key-value store |

🟡 *If even the language preference is considered sensitive in the team's threat model, it can move into the encrypted DB at the cost of showing the lock screen in the phone's default language.*

---

## 2. Tables

All timestamps are stored as **local time** epoch milliseconds plus the UTC offset at write time (patterns are about her day, not UTC). IDs are integer autoincrement — there is no other system to collide with.

### 2.1 `profile` (single row)
| Field | Type | Notes |
|---|---|---|
| `id` | int | Always 1 |
| `display_name` | text, nullable | Optional, max 30 chars |
| `age_group` | enum nullable | `18_25` / `26_35` / `36_50` / null (skipped) |
| `language` | enum | `ar_EG` / `am_ET` / `en` |
| `created_at` | int | |

No exact age, no phone number of her own, no email, no device ID.

### 2.2 `settings` (single row)
| Field | Type | Default |
|---|---|---|
| `retention_days` | int ∈ {1,3,7} | 7 — **CHECK (retention_days <= 7)** |
| `speak_automatically` | bool | true |
| `cooling_mode` | enum `ask` / `auto` | `ask` (🟡) |
| `cooling_minutes` | int ∈ {5,10,15} | 10 |
| `alert_sensitivity` | enum `fewer`/`normal`/`more` | `normal` |
| `place_labels_enabled` | bool | false |
| `enabled_place_labels` | text (JSON array of fixed enum keys) | `[]` |
| `app_lock` | bool | false |
| `theme` | enum `sun`/`night`/`auto` | `sun` |

### 2.3 `baseline`
| Field | Type | Notes |
|---|---|---|
| `id` | int | |
| `created_at` | int | |
| `ratio_median` | real | Median of the stress ratio during 60 s calibration |
| `ratio_spread` | real | Robust spread (MAD × 1.4826), floored to avoid divide-by-small |
| `is_default` | bool | true if she skipped calibration |
| `active` | bool | Exactly one active row |

Old baselines are deleted when replaced (keep only active). Baseline is a calibration constant, not a time series; it is deleted by Delete Everything and replaced by Recalibrate. 🟡 *Note: the baseline does not auto-expire with the 7-day window, because without it monitoring can't work. It contains two numbers. This is disclosed in About.*

### 2.4 `minute_summary` — the only brain-derived time series
| Field | Type | Notes |
|---|---|---|
| `ts_minute` | int, PK | Start of the minute (local) |
| `stress_mean` | int 0–100 | Mean stress index over valid seconds |
| `stress_max` | int 0–100 | |
| `valid_seconds` | int 0–60 | Seconds with Good fit |
| `zone` | enum `calm`/`rising`/`high`/`unknown` | `unknown` if valid_seconds < 30 |
| `cooling_on` | bool | Cooling active for ≥ 30 s of the minute |

≈ 1,440 rows/day max → ~10k rows for 7 days → well under 1 MB.

### 2.5 `event`
One row per meaningful thing that happened (used for My Days markers and pattern learning).
| Field | Type | Notes |
|---|---|---|
| `id` | int | |
| `ts` | int | |
| `type` | enum | `high_episode_start`, `high_episode_end`, `prompt_shown`, `prompt_yes`, `prompt_no`, `cooling_start`, `cooling_stop`, `reminder_fired`, `help_question_shown`, `help_opened_sms`, `battery_low`, `disconnect`, `reconnect` |
| `source` | enum nullable | `manual` / `auto` / `prompt` (for cooling) |

`help_opened_sms` stores **no** contact and **no** place — only that it happened.

### 2.6 `pattern`
| Field | Type | Notes |
|---|---|---|
| `id` | int | |
| `slot_start_min` | int | Minute-of-day of the 30-min slot (e.g., 840 = 14:00) |
| `matching_days` | int | Days (of last N) with a high episode starting in slot |
| `detected_at` | int | |
| `status` | enum | `offered`, `accepted`, `declined`, `faded` |
| `declined_until` | int nullable | Don't re-offer before this time |
| `reminder_notification_id` | text nullable | OS scheduled notification ID |

Patterns are **derived** from `event` rows inside the retention window and are recomputed nightly; when the underlying data expires, a pattern without support moves to `faded` and its reminder is cancelled (see `11` §6).

### 2.7 `family_contact`
| Field | Type | Notes |
|---|---|---|
| `id` | int | Max 3 rows (enforced in code + trigger) |
| `name` | text | Max 30 chars |
| `phone_e164` | text | Validated E.164 |
| `created_at` | int | |

Contacts do **not** expire with the 7-day window (they're her settings, not brain data); they are removed by her or by Delete Everything.

### 2.8 `paired_tarha` (single row)
| Field | Type | Notes |
|---|---|---|
| `device_id` | text | BLE identifier (OS-provided) |
| `name` | text | e.g., "TARA-3F2A" |
| `firmware` | text | |
| `paired_at` | int | |

### 2.9 Not stored, ever
Raw EEG · per-second values · GPS/location · her phone number · contact list beyond chosen entries · SMS content or delivery status · advertising IDs · crash logs with content · anything from the Try session except the baseline (and only if she saves).

---

## 3. Retention Job

Runs: on app start, on every hour while running, and right after `retention_days` changes.

```sql
DELETE FROM minute_summary WHERE ts_minute < :cutoff;
DELETE FROM event          WHERE ts        < :cutoff;
-- then recompute patterns; mark unsupported ones 'faded'; cancel their reminders
```
`cutoff = now − retention_days × 24h`. After large deletes, run `PRAGMA incremental_vacuum` (or periodic `VACUUM`) so deleted pages don't linger in the file. SQLCipher's `secure_delete` pragma ON so freed pages are zeroed.

---

## 4. Delete Everything (ordering matters)

1. Stop cooling, disconnect & forget tarha, cancel all scheduled notifications.
2. **Delete the encryption key** from the keystore (instant crypto-shred).
3. Close and delete the DB file and its `-wal`/`-shm`/journal files.
4. Clear the plain preferences store.
5. Delete any cached audio/temp files written by the app (voice files are bundled assets, not written).
6. Verify: app data directory contains only bundled/read-only content. (Tested in `12` §4.)

---

## 5. Migrations

Schema version stored in `PRAGMA user_version`. Migrations are ordered, idempotent, and committed with the code. A failed migration must never leave a half-migrated DB: run inside a transaction; on failure, keep the old DB and show "Please update TARA" rather than losing data silently.

---

## 6. Relationships

```text
profile (1)        settings (1)        baseline (1 active)       paired_tarha (0..1)
minute_summary (≤ retention window)  ──┐
event (≤ retention window)  ───────────┴──► pattern (derived, recomputed nightly)
family_contact (0..3)
```

No foreign keys across time-series tables are needed; patterns are recomputed, not referenced.

---

*End of Data Model. Next: `06-architecture.md`.*
