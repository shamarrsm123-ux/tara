# TARA — Technical Architecture

**Version:** 1.0
**Document:** 06 — Architecture
**Status:** Locked — engineering constraints, not suggestions
**Depends on:** 01–05

---

## 0. Purpose

Defines how TARA is built. The single most important architectural fact:

> **TARA has no backend.** The system is a tarha (BLE peripheral) and a phone app. All processing, storage and decisions happen on the phone. There is nothing to hack on a server because there is no server.

The primary technical objective: **a small, offline-first, privacy-by-construction mobile app that a team can build for $0, run on a cheap Android phone, and demo convincingly with or without real hardware.**

---

## 1. System Overview

```text
┌──────────────── TARHA (prototype: ESP32) ────────────────┐
│ EEG electrodes (behind ear) → analog front-end → MCU      │
│ MCU computes band powers on-chip (raw EEG never leaves)   │
│ Cooling driver (Peltier/fan; prototype: LED or mini fan)  │
│ Battery gauge · optional thermistor                       │
│ BLE GATT peripheral (bonded, encrypted link)              │
└───────────────────────────┬──────────────────────────────┘
                            │ BLE: ~1 small packet/second
┌───────────────────────────▼──────────────────────────────┐
│ PHONE APP (React Native)                                  │
│  ble/        connection, bonding, reconnect               │
│  signal/     fit check, stress index (in memory)          │
│  engine/     zones, alerts, cooling rules, SOS question   │
│  patterns/   nightly pattern detection                    │
│  store/      encrypted SQLite, retention, wipe            │
│  notify/     local notifications, foreground service      │
│  sos/        contacts, SMS composer                       │
│  ui/         screens, i18n, voice, haptics                │
│  demo/       simulated tarha (same interface as ble/)     │
└───────────────────────────────────────────────────────────┘
        No network. No server. No cloud. No analytics.
```

---

## 2. Technology Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo (development build, not Expo Go)**, TypeScript strict | One codebase, Android + iOS, free; BLE needs native modules so Expo Go is insufficient |
| BLE | `react-native-ble-plx` | Mature, supports Android + iOS |
| Encrypted DB | `expo-sqlite` built with SQLCipher **or** `op-sqlite` with SQLCipher — choose in Phase 0 after verifying the current version's SQLCipher support. 🟡 *Phase 0 candidate: `expo-sqlite` 58 (`useSQLCipher: true`; SQLCipher is vendored in the package). Final once the dev probe + `scripts/device/verify-sqlcipher.sh` pass on a real Android phone.* | Encryption at rest |
| Key storage | `expo-secure-store` | Android Keystore / iOS Keychain |
| Notifications + Android foreground service | **Notifee** (local only) | Local scheduled notifications and a foreground service without Firebase |
| SMS | `expo-sms` | Opens the phone's SMS composer; user presses Send |
| App lock | `expo-local-authentication` | Phone's own PIN/biometric |
| Audio | `expo-audio` (bundled voice files) | Offline voice lines |
| Haptics | `expo-haptics` / Vibration API | Patterned vibration |
| Graphs | `react-native-svg` (or Skia if perf requires) | Lightweight live line graph |
| State | Zustand (UI state) + the engine as plain TS modules | Simple, testable |
| i18n | `i18next` + `react-i18next`, RTL via `I18nManager` | Arabic RTL + Amharic |
| Tests | Jest (unit), React Native Testing Library, Maestro (E2E on device/emulator) | Free |
| Web preview 🟡 | `react-native-web` + `react-dom` (`npx expo start --web`) | **Developer tool only** (approved 2026-11-08): lets the team click through demo-source screens on localhost without an Android SDK. Not a product target, never shipped or hosted; privacy promises are verified on the Android release APK. Native-only features (BLE, SQLCipher, notifications, SMS) are unavailable on web and must not get web fallbacks that weaken a promise. |

🟡 *Phase 0 assumption:* Android application ID / iOS bundle ID is `org.tara.app`.

**Forbidden dependencies:** Firebase (any part), any analytics/crash SDK (Sentry, Amplitude, etc.), `expo-updates` / OTA updates, any HTTP client used at runtime, maps/location SDKs, ad SDKs. (Rationale: each would add network capability or data egress.)

---

## 3. Privacy by Construction (architectural, not just policy)

1. **No network at all in release builds.** The Android release manifest must not contain `android.permission.INTERNET` (use Expo config `android.blockedPermissions`). Debug builds need it for the Metro bundler; release builds must not. CI fails if the release APK lists it (`12` §4).
   - 🟡 *Phase 0 implementation note:* `android.blockedPermissions` writes the removal into the **main** manifest, which also strips INTERNET from debug builds and breaks Metro. TARA instead uses a config plugin (`plugins/withReleaseNoInternet.js`) that writes a **release-source-set** manifest removing INTERNET (and the dev-only `SYSTEM_ALERT_WINDOW`). Same requirement, release-only scope. `blockedPermissions` is still used for permissions no build needs (external storage).
2. **No location reading.** The app never calls a location API. On Android 12+ BLE scanning uses `BLUETOOTH_SCAN` with `neverForLocation`. On Android 8–11 the OS requires `ACCESS_FINE_LOCATION` to scan for BLE devices; TARA requests it only on those versions, explains why, and never calls any location API (`10` §4).
3. **Raw EEG never leaves the tarha.** The tarha computes band powers on-chip; the phone receives only a few numbers per second.
4. **Per-second data never touches disk.** Only per-minute summaries are persisted.
5. **Encryption at rest** with a key in hardware-backed storage; crypto-shred on delete.
6. **Nothing leaves the phone without her tap** — the only outbound channel is the SMS composer, which requires her to press Send in another app.

---

## 4. Module Boundaries

Modules talk through typed interfaces (`09-module-contracts.md`). Rules:

- `ui/` never talks to `ble/` or `store/` directly — only through `engine/` and selectors.
- `engine/` is **pure, deterministic TypeScript** given inputs + a clock. No React, no I/O. This makes the most important logic unit-testable with simulated time.
- `ble/` and `demo/` implement the **same `TarhaSource` interface**, so every feature works identically on demo data — and demo data can't accidentally be written as real data (the source type travels with every sample).
- `store/` is the only module that touches SQLite or the keystore.

---

## 5. Data Pipeline

```text
BLE packet (1 Hz)
  → ble/ decode + validate (length, version, CRC)
  → signal/ fit gate (contact quality) → if not Good: emit {valid:false}
  → signal/ stress index vs baseline (0–100), EMA smoothing
  → engine/ zone + hysteresis + timers → actions (prompt, cooling cmd, SOS question)
  → ui/ live meter & graph (memory ring buffer, 10 min)
  → minute aggregator → store/ minute_summary (1 row/min)
```

Algorithms and constants: `07-ble-protocol-and-core-logic.md`.

---

## 6. Runtime & Scheduling

- **Foreground (app open):** full pipeline.
- **Android background:** a Notifee foreground service keeps BLE + engine alive with a discreet persistent notification "TARA is with you". This is how Android permits continuous BLE work.
- **iOS background:** `bluetooth-central` background mode; iOS may throttle. 🟡 *iOS is secondary for the prototype; document observed behavior rather than promising parity.*
- **Scheduled local notifications** (reminders) are set with the OS scheduler via Notifee triggers, so they fire even if the app is killed.
- **Retention & pattern jobs:** run on app start, hourly while running, and on the first run after local midnight. No server cron needed.

---

## 7. Hardware Prototype Architecture (for the demo)

| Part | Prototype choice | Note |
|---|---|---|
| MCU + BLE | ESP32 / ESP32-C3 dev board | Cheap, BLE 4.2/5, Arduino IDE |
| EEG front end | **Option A (demo):** potentiometer as a "stress knob" → simulated band powers. **Option B (real signal):** low-cost EXG front-end board (e.g., a single-channel bio-amplifier designed for EEG/EXG) with behind-the-ear electrodes | Option A lets judges turn a knob and watch the app react live |
| Cooling | LED (blue) or 5V mini fan via MOSFET; real product: Peltier module + heat spreader, or fan + gel insert | Peltier is power-hungry; note as product risk |
| Battery | Li-ion cell + gauge (or USB power + simulated %) | |
| Temperature (optional) | NTC thermistor | Supports the heat half of the research question |

**Tinkercad:** Tinkercad Circuits has no BLE module; draw the circuit with an Arduino Uno + potentiometer (sensor stand-in) + LED (cooling) + battery, and annotate the BLE link. Build the real demo on ESP32.

🔁 **On the "old Bluetooth earbud" idea:** consumer earbuds stream audio over Bluetooth Classic and have no accessible EEG electrodes or programmable firmware, so they can't produce stress data. They're useful only as a **form-factor mock-up** (showing where the sensor would sit). The ESP32 demo is what actually proves the system works.

---

## 8. Concurrency & Correctness Hotspots

Even without a server, a few things can race:

1. **Cooling command vs. battery cutoff vs. disconnect** — cooling state is owned by the tarha; the app's displayed state is reconciled from the tarha's status notifications, never assumed after a write.
2. **Delete Everything vs. background writes** — wipe acquires a global "wiping" flag; the aggregator, retention job and notification scheduler check it and abort; wipe waits for in-flight DB transactions, then deletes the key.
3. **Pattern recompute vs. retention change** — both run through a single serialized job queue in `store/`.
4. **Duplicate prompts** — the engine's prompt state machine (`11` §3) is the only place a prompt can be created; the UI cannot create one.

---

## 9. Error Handling & Logging

- Errors are typed (`BleError`, `StoreError`, `ValidationError`, …) with machine codes (`09` §9).
- **Logging is local-only and content-free:** ring buffer of the last 200 log lines in memory, never containing stress values, names, numbers or messages. A developer "copy logs" button exists only in debug builds.
- No crash reporting service. If a crash happens during field testing, the team asks the tester to describe it.

---

## 10. Performance Budget

- Engine step ≤ 2 ms per sample on a low-end Android.
- UI updates ≤ 1 Hz for the meter; graph redraw ≤ 1 Hz.
- DB writes: 1 per minute + events; batch inside a transaction.
- Cold start to Home ≤ 3 s on a 2 GB RAM phone.
- APK size target ≤ 40 MB (voice files compressed, Opus/AAC mono).

---

## 11. Cost

Expo, React Native, ESP32 toolchain, GitHub, GitHub Actions: free. Device testing on team phones + Android emulator. Hardware demo: an ESP32 board, a potentiometer, an LED/fan — a few dollars. No hosting, no database service, no domain. **Running cost: $0.**

---

## 12. Scaling Path

There is no server to scale; "scale" for TARA means **more phones, more languages, more hardware variants**:
- More languages → add i18n bundles + recorded voice files.
- Real hardware revisions → BLE protocol versioning (`07` §2.6).
- Research use → a *separate*, explicitly consented export feature designed with an ethics board — never retrofitted into the core.

---

## 13. Absolute Anti-Patterns

Any server or cloud function · any network call · any analytics/crash SDK · storing per-second or raw EEG · reading GPS · sending SMS without the user pressing Send · stress logic in UI components · demo and real data in the same tables · plaintext personal data outside the encrypted DB · OTA code updates · "temporary" debug endpoints · disabling encryption to debug "just for now".

---

*End of Architecture. Next: `07-ble-protocol-and-core-logic.md`.*
