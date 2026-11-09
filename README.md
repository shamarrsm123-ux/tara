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
| `npm run android:release` | build + install the **release** variant (no INTERNET) |
| `npm run prebuild` | regenerate `android/` from `app.json` + config plugins (never edit `android/` by hand) |
| `scripts/device/check-release-apk.sh` | release APK + installed app have no INTERNET permission |
| `scripts/device/verify-sqlcipher.sh` | probe DB on the phone is encrypted at the file level |

## Layout (Phase 0)
- `plugins/` — Expo config plugins (release-only INTERNET removal)
- `scripts/privacy/` — CI privacy checks (`12` §4)
- `scripts/device/` — checks you run with a phone attached
- `src/dev/` — debug-only diagnostics (SQLCipher probe)
- `.github/workflows/ci.yml` — CI, including a release APK build + `aapt2` permission check
