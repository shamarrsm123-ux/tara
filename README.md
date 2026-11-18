# TARA

Phone app (React Native + Expo, Android first) for the TARA smart cooling headscarf.
The specification in [`tara-docs/`](tara-docs/) is the source of truth;
[`tara-docs/13-implementation-plan.md`](tara-docs/13-implementation-plan.md) sets the build order.

No server, no network, no analytics. Release builds do not request `android.permission.INTERNET`.

## Requirements
- Node 22, JDK 17
- Android Studio (SDK + platform tools + an emulator image), `ANDROID_HOME` set, `adb` on `PATH`
- A real Android phone with USB debugging for BLE and SQLCipher checks

Expo Go does **not** work (native modules). Use the development build.

## Commands
| Command | What it does |
|---|---|
| `npm run check` | typecheck, lint, unit tests + coverage, forbidden-dependency and source privacy scans |
| `npm run android` | build + install the **debug** development build, start Metro |
| `npm start` | start Metro for an already-installed dev build |
| `npx expo start --web` | **dev-only** browser preview on localhost (demo source; no BLE/SQLCipher/SMS) — see `06` §2 |
| `npm run android:release` | build + install the **release** variant (no INTERNET) |
| `npm run prebuild` | regenerate `android/` from `app.json` + config plugins (never edit `android/` by hand) |
| `scripts/device/check-release-apk.sh` | release APK + installed app have no INTERNET permission |
| `scripts/device/verify-sqlcipher.sh` | probe DB on the phone is encrypted at the file level |

## Try it in 2 minutes (no hardware)
1. `npx expo start --web` → open http://localhost:8081 (or install the debug build on an emulator).
2. Choose a language → **Try to Calm Your Brain** → **Connect** → **Use demo instead** → **Next** → **Skip**.
3. Watch the Story: Calm falls into High stress → **Yes — Cool** → the meter climbs back to Calm (labeled *Demo — sped up*).
4. **Continue** → Screen 4 example → Screen 5 save (Yes or No) → Screen 6 privacy → Daily mode with tabs.
5. More demo scenarios: Safety → About → tap the version 5 times (Story, Calm day, Bad 2 PM week, Low battery, Loose sensor).

The web preview keeps saved data in memory only; Bluetooth, SQLCipher, notifications and SMS need the Android build.

## End-to-end tests (Maestro, `12` §6)
With the app installed on an emulator: `maestro test .maestro/` (or one file, e.g. `maestro test .maestro/01-try-save.yaml`).
Flow 3 (15 minutes of fake time) is covered by Jest (`src/app/__tests__/screen3.test.tsx`).

## What is built (phases 0–11)
| Area | Where |
|---|---|
| Signal: packet decode, sensor fit, stress index, calibration | `src/signal/` |
| Engine: episodes, prompts, cooling, help question, battery, mute, minute summaries, My Days history | `src/engine/` |
| Smart patterns and reminder planning | `src/patterns/` |
| Encrypted store (SQLCipher + keystore), retention, Delete Everything | `src/store/` |
| Tarha Bluetooth (scan, Blink, encrypted link, reconnect) | `src/ble/` |
| Notifications + Android monitoring service (Notifee, local only) | `src/notify/` |
| Help request (SMS composer only) | `src/sos/` |
| App Lock (phone's own screen lock) | `src/lock/` |
| Demo tarha, scenarios, firmware simulator | `src/demo/` |
| Screens, components, illustrations, i18n (ar_EG · am_ET · en) | `src/ui/` |
| App shell, navigation, wiring | `src/app/`, `App.tsx` |
| ESP32 tarha firmware + wiring / Tinkercad guide | `firmware/` |
| Judge-facing privacy sheet (P1–P13) | `docs/privacy-sheet.md` |

## Still needs people or hardware
- **Phase 7 hardware acceptance:** ESP32 + an Android phone (`firmware/README.md`).
- **Phase 12:** native-speaker voice recordings, Arabic/Amharic copy and illustration review (all marked 🟡 in the docs).
- **Phases 13–15:** release build on a real low-end phone in airplane mode, adversarial privacy checks on device, consented field testing.
- **Phase 16:** 30-second video, walkthrough, Tinkercad screenshot.

## Layout
- `plugins/` — Expo config plugins (release-only INTERNET removal, Bluetooth location limits, monitoring service)
- `scripts/privacy/` — CI privacy checks (`12` §4)
- `scripts/device/` — checks you run with a phone attached
- `src/dev/` — debug-only diagnostics (SQLCipher probe, component gallery)
- `.maestro/` — end-to-end flows for the emulator
- `.github/workflows/ci.yml` — CI, including a release APK build + `aapt2` permission check
