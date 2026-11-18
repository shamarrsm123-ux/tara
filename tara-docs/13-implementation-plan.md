# TARA — Implementation Plan

**Version:** 1.0
**Document:** 13 — Implementation Plan
**Status:** Ready — canonical build order
**Depends on:** All prior documents (01–12). Introduces no new decisions.

---

## 0. How to Use This Document

The last document before code. Each phase has an objective, work, tests and acceptance criteria, and leaves the repo runnable. **If a phase surfaces a conflict with an earlier document, stop and flag it** (`08` §3). Authority order: `02` = `10` > `03` > `05`/`07`/`11` > `06`/`09` > implementation.

**Per-feature micro-loop:** read PRD → flow → data model → core logic → write engine/store code with tests → wire UI → voice + i18n + RTL → airplane-mode check → acceptance criteria. Never build screens on fake logic and "connect it later": the demo source *is* the real interface.

**Fast path for the competition demo:** Phases 0–5 + 7 + the Story scenario produce the 30-second MVP video. Everything after makes it a real app.

---

## Phase 0 — Repo Audit & Environment
- Inspect any existing repo; assume nothing is correct.
- Create Expo (TypeScript, strict) project with a **development build** (BLE needs native modules; Expo Go won't work).
- Choose and verify the SQLCipher-capable SQLite library on a real Android device (`06` §2).
- Configure release build to block `android.permission.INTERNET`; confirm a release APK runs.
- CI on GitHub Actions: typecheck, lint, unit tests, manifest + dependency privacy checks (`12` §4).

**Acceptance:** dev build runs on a real Android phone; release APK has no INTERNET permission; CI green.

🟡 *Approved change (2026-11-08): the team has no Android phone yet and no local Android SDK. Phase 0 is accepted when GitHub Actions builds the release APK, `aapt2` confirms no INTERNET permission, and all other CI checks are green. Running the dev build on a real phone and the on-device SQLCipher probe (`scripts/device/verify-sqlcipher.sh`) move to the start of Phase 7, which needs a phone for BLE anyway. Until then `expo-sqlite` + SQLCipher stays the provisional choice (`06` §2).*

## Phase 1 — Foundations
- Folder structure per `06` §1/§4; `engine/constants.ts` from `07` §9.
- i18n (Arabic, Amharic, English), RTL switching, fonts (Noto Arabic/Ethiopic/Sans).
- Design tokens & core components from `04`: Calm Meter, Live Graph, Decision Card, Fit Chip, Hold-to-Confirm, Demo Ribbon.
- Voice player with placeholder audio; haptics helper.
- Lint rules: ban location modules, network APIs, hardcoded UI strings.

**Acceptance:** a component gallery screen renders every component in all three languages, Sun & Night themes, at 130% font scale.

## Phase 2 — Signal & Engine (pure logic first)
- `signal/`: packet decode, fit, EMA, calibrator, stress mapping (`07` §2–4).
- `engine/`: episodes, prompt, cooling, help question, mute, battery rules (`07` §5, §7; `11` §3–5).
- `patterns/`: detection (`07` §6).

**Tests:** all of `12` §2. **Acceptance:** 100% of the listed unit cases pass with a fake clock; no React imports in these modules.

## Phase 3 — Demo Source
- `demo/` implementing `TarhaSource` with scenarios: Story, Calm day, Bad 2 PM week, Low battery, Loose sensor (`03` Flow 18, `07` §8).
- Demo ribbon always visible while active.

**Acceptance:** every scenario drives the engine end-to-end in memory; nothing is persisted.

## Phase 4 — Try Flow (Screens L, 0, 1, 1b, 2)
- Language, Welcome, Connect (demo first), Learn Your Calm, Home with live meter + graph + Cool button.
- Lifecycle state `fresh/trying` (`11` §1): nothing on disk.

**Acceptance:** a tester can go from install to a moving Calm meter in under 2 minutes, in Arabic, without reading English.

## Phase 5 — Action & Cooling (Screen 3) — **the MVP**
- Prompt card, Yes/No, cooling card with countdown and Stop, cooling state from status, post-cooling quiet, "alert less often?".
- Record the **30-second MVP video** with the Story scenario (labeled "Demo — sped up").

**Acceptance:** `12` §6 flow 3 passes; video shows Calm 20% → 60% → 80% with the prompt and cooling.

## Phase 6 — Store, Save & Privacy Screens (Screens 4 example, 5, 6)
- `store/`: key creation, SQLCipher DB, migrations, minute aggregator, events, retention job, `wipeEverything` (`05`).
- Screen 4 example, Screen 5 (save, name, age range), Screen 6 (retention shorter-only, No-internet status, Delete Everything, family/place/lock opt-ins).

**Tests:** `12` §3 and the wipe / Try-No / encryption checks in §4.
**Acceptance:** choosing No leaves no files; choosing Yes creates an encrypted DB; Delete Everything returns to a fresh install state.

🟡 *Phase 6 notes: the store is tested against real SQLite (`node:sqlite`) through one contract suite shared with the web preview's memory-only store; SQLCipher encryption, keystore removal and the app-data-directory check are device checks (12 §4) run with Phase 7's phone. Minute summaries and events are written only after saving and only from a real tarha; until BLE exists, Daily mode after a relaunch shows "Tarha not connected".*

## Phase 7 — Hardware Prototype & BLE
- **Tinkercad diagram:** Arduino Uno + potentiometer (sensor stand-in) + blue LED/mini fan via transistor (cooling) + battery; annotate "BLE module (ESP32 in real build)" and the sensor position behind the ear.
- **ESP32 firmware:** GATT service per `07` §2; potentiometer → simulated band powers (Option A) or EXG front end (Option B); cooling driver with firmware limits; battery %; bonding.
- **App `ble/`:** scan, blink-to-identify, bond, encrypted-link check, reconnect backoff, permissions per Android version with explanations (`10` §4).
- Optional: tarha mock-up (scarf + 3D-printed or fabric pouch behind the ear; an old earbud shell is fine as a *shape* model only — `06` §7).

**Tests:** `12` §5. **Acceptance:** turning the knob drives a real prompt; Yes lights the LED within 1 s; firmware stops cooling at its own limit with the app killed.

🟡 *Phase 7 notes (2026-11-17): app `ble/` (scan, Blink, encrypted-link check, decode, reconnect backoff 2 → 60 s, Android-version permissions with TARA's explanation first) is tested against the firmware simulator; firmware (`firmware/`, ESP32 + NimBLE) shares one protocol header whose packets CI checks byte-for-byte against the app and builds with PlatformIO. The Tinkercad diagram is described step by step in `firmware/README.md` for the team to draw. Hardware acceptance (knob → prompt, LED within 1 s, firmware stop with the app killed) waits for the ESP32 + an Android phone. The release manifest requests only BLUETOOTH_SCAN (neverForLocation) + BLUETOOTH_CONNECT, and ACCESS_FINE_LOCATION capped at Android 11 (`plugins/withLegacyBleLocationOnly.js`).*

## Phase 8 — Daily Mode
- Tabs: Home · My Days · Safety. Android foreground service; discreet notifications; mute; disconnect handling; phone battery warning.

**Acceptance:** 8-hour soak (demo source) with screen off keeps monitoring; notifications neutral on lock screen.

🟡 *Phase 8 notes (2026-11-17): Daily mode = tabs + the Notifee foreground service ("TARA is with you", type connectedDevice) started after saving; lock-screen notifications use only the neutral set and are shown only while the app is in the background (in the app she sees the full card); Mute 30 min / 1 h / rest of today on Home; phone battery via `expo-battery`; My Days reads stored minutes (7 day bars, tap a day, retention footer). The 8-hour acceptance runs as an accelerated soak in Jest; the screen-off soak on a phone joins Phase 13. Delete Everything now cancels all notifications before the wipe (05 §4 step 1).*

## Phase 9 — Smart Reminders (Screen 4, real)
- Nightly detection, offer card, schedule/cancel daily reminder, fade handling, decline suppression.

**Acceptance:** `12` §6 flow 4; shortening retention to 1 day cancels the reminder and shows "I need more days".

🟡 *Phase 9 notes (2026-11-17): the pattern run (`patterns/plan.ts`) happens when Daily mode opens, every hour, and right after retention changes, using events/minutes converted to local time with the phone's own offset. Flow 8's reminder card appears on Home between the reminder time and the pattern time (rather than only when the notification is tapped); "Okay" and "Not today" both hide it for today. New patterns are offered only if she said Yes on Screen 4.*

## Phase 10 — Family & Help Request
- Contacts (max 3, manual or picker), test message, place labels, help flow with preview and SMS composer, engine-initiated question with 60-min cooldown.

**Acceptance:** `12` §6 flow 5; SMS composer is opened only from the preview Send handler; message text exactly matches the preview.

🟡 *Phase 10 notes (2026-11-17): contacts are typed in (name + number starting with +); the phone's contact picker is left out so TARA never requests a contacts permission. Help is on Home once she has saved (header button) and also opens when the engine asks (Flow 11 B, Yes/No reported to the engine). "Add family" from the help flow opens the Safety tab. The composer (`expo-sms`) is opened only by the preview's Send button and the family test message; the only record kept is a `help_opened_sms` event (time only), and never from demo data. Screen 6 now shows the 100%-optional Family card.*

## Phase 11 — Battery Alerts, App Lock, Settings
- Battery thresholds (`07` §7), App Lock with phone authentication, all Settings items (`03` Flow 16), recalibration.

**Acceptance:** each setting change is reflected in engine behavior immediately and survives restart.

🟡 *Phase 11 notes (2026-11-17): Settings live in the Safety tab (language, speak automatically, cooling ask/auto, cooling length, alert sensitivity, Learn my calm again, reminders with Turn off, About & privacy); each change is saved and sent to the engine at once. App Lock (`expo-local-authentication`) uses the phone's own screen lock, shows a lock screen with nothing of hers behind it, and locks again when she leaves the app; with no screen lock it explains and offers phone settings. Battery and phone-battery alerts also appear as in-app cards with the full Flow 12 wording (the lock-screen text stays neutral). "Speak automatically" off silences voice lines that screens play by themselves; the ▶ button always plays.*

## Phase 12 — Voice & Localization Completion
- Record final voice lines with native speakers (Egyptian Arabic, Amharic); review illustrations and copy with community members; RTL review.

**Acceptance:** `12` §2.4 passes with no placeholders; native-speaker sign-off.

## Phase 13 — Full Integration
Run all `12` §6 E2E flows on a release build, in airplane mode, on a real low-end Android phone.

## Phase 14 — Privacy & Security Hardening
Run every check in `12` §4 as an adversary would: inspect the APK, pull files, try SMS paths, try unencrypted BLE, check notification text on a locked phone.

**Acceptance:** every promise P1–P13 in `10` §2 has a passing check. Any failing promise blocks release or its UI sentence is removed.

## Phase 15 — Performance & Field Testing
`12` §7 measurements; consented usability sessions per `12` §8 and `10` §6; tune ⚙️ constants based on results (record every change in `07`).

## Phase 16 — Demo & Submission Readiness
- Release APK built from a clean checkout.
- 30-second MVP video, a 2-minute walkthrough, Tinkercad diagram, ESP32 live demo, and a one-page "How TARA protects mental privacy" sheet listing P1–P13 with how judges can verify them (airplane mode, APK permissions, Delete Everything).
- Pitch materials include the required honesty statements (`01`).

**Acceptance:** a judge can install the APK, enable airplane mode, run the Story demo, and Delete Everything — and every claim on screen is true.

---

## 17. Git Discipline
Small coherent commits per phase; descriptive messages; never commit secrets, signing keys, test-participant data, or recorded audio of participants.

## 18. Definition of Done
As `12` §9. A feature is not done because the screen renders — it's done when the logic is tested, the privacy promise it touches is verified, it works offline on a cheap phone, and she can understand it without reading.

---

*End of the TARA documentation set: Vision & PRD (`01`–`02`) → Flows & UI (`03`–`04`) → Data & Architecture (`05`–`06`) → Protocol & Logic (`07`) → Rules (`08`) → Contracts, Privacy, State, Testing (`09`–`12`) → this plan (`13`) → code.*
