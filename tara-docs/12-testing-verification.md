# TARA — Testing & Verification Strategy

**Version:** 1.0
**Document:** 12 — Testing & Verification
**Status:** Ready
**Depends on:** 06, 07, 08, 09, 10, 11

---

## 0. Governing Principle

A failing test means the implementation drifted from the spec — never update a test to match what got built. For TARA, add a second rule: **a privacy sentence without a passing check doesn't ship** (`10` §7).

---

## 1. Test Pyramid

- **Unit** — `signal/`, `engine/`, `patterns/` with fake clock (fast, many).
- **Integration** — `store/` against a real SQLCipher DB on emulator/device; `ble/` against the demo source and a firmware simulator.
- **Privacy & security** — manifest/dependency checks, wipe verification, retention, lint rules.
- **Hardware-in-the-loop** — app + ESP32 prototype.
- **End-to-end** — Maestro flows on an Android emulator and one real low-end phone.
- **Field / usability** — sessions with representative users (consented), in the target languages.

---

## 2. Unit Tests

### 2.1 Signal
- Packet decode: valid packet; wrong length; bad CRC; unsupported version; saturation flag → invalid.
- Fit levels at boundaries 39/40/69/70.
- Stress mapping: at baseline → S = 30 (Calm 70); z = 2 → S = 70; clamps at 0 and 100.
- EMA: step response reaches ~63% at 10 s; resets after 30 s invalid.
- Calibration: pauses on poor fit; needs 60 *valid* seconds; MAD floor applied.

### 2.2 Engine (fake clock)
- Episode starts only after W (45/60/90 s by sensitivity) with ≥ 80% valid.
- Hysteresis: S oscillating 68–72 doesn't flap; episode ends only after S ≤ 55 for 60 s.
- Prompt suppressed while cooling on, while muted, within 15 min of a No, within 10 min after cooling.
- Third No in a day → `askAlertLess` exactly once.
- Auto mode: cooling starts without prompt; second auto-start within 30 min blocked.
- Cooling: default 10 min; one extension; never > 20 min continuous; locked at battery ≤ 10%.
- Help question: requires 10 min at S ≥ 85 + prior cooling/prompt in episode; 60-min cooldown after an engine-initiated question; never emitted from invalid signal.
- Engine never emits anything that sends SMS (structural test over action types).

### 2.3 Patterns
- The worked example from `07` §6 → pattern 14:00, reminder 13:30.
- < 4 usable days → `needMoreDays`.
- 2 matching days → no pattern; 3 → pattern.
- Fade when matches drop below 2; decline suppresses for 7 days.

### 2.4 i18n
- Every key exists in `ar_EG`, `am_ET`, `en`; every voice line ID has an audio asset (placeholder allowed only in debug).
- Banned words (`04` §12) absent from all user-facing strings.

---

## 3. Integration Tests

- Store creation only via `createFromTrySession`; before that, DB file and key absent.
- `updateSettings({ retention_days: 14 })` → `VALIDATION_ERROR`; DB CHECK also rejects direct insert.
- Retention: insert rows at −8 d, −6 d; run with 7 → −8 d gone; switch to 1 → −6 d gone immediately; patterns recomputed and unsupported reminders cancelled.
- `appendMinute`/`appendEvent` with `source: 'demo'` → rejected.
- Contacts: 4th add → `CONTACT_LIMIT`; E.164 validation.
- BLE (demo + firmware simulator): disconnect mid-cooling → UI shows not connected, no stale Calm; reconnect backoff; status-driven cooling display.

---

## 4. Privacy & Security Tests

| Check | Method | Promise |
|---|---|---|
| Release APK has no `INTERNET` permission | CI: build release, `aapt dump permissions` | P1 |
| No forbidden dependencies | CI: scan lockfile for Firebase/analytics/crash/OTA/HTTP libs | P1 |
| No network calls | Release app on device in airplane mode passes full E2E; plus static grep for `fetch`/`XMLHttpRequest`/`WebSocket` in app code | P1 |
| No location API usage | Lint rule + grep for location modules | P7 |
| Android 12+ requests no location permission | E2E on API 33 emulator | P7 |
| DB encrypted | Pull DB file from debug device; open with plain SQLite → fails | P3 |
| Delete Everything complete | After wipe: list app data dir (no app-created files), keystore has no TARA alias, no scheduled notifications, BLE bond removed | P5 |
| Try "No" leaves nothing | Complete Try, choose No; same checks as wipe | P6 |
| Lock-screen texts neutral | Snapshot all `NotifyKind` texts in all languages against banned words | P12 |
| App Lock | With lock on, cold start requires authentication; notification tap requires authentication | P11 |
| SMS only via composer | Instrument `expo-sms` mock: called only from preview screen's Send handler | P8 |
| Insecure BLE link refused | Firmware simulator offers unencrypted characteristic → `BLE_INSECURE_LINK` | §3 BLE |

---

## 5. Hardware-in-the-Loop (ESP32 prototype)

- Turn the "stress knob" up → app reaches High → prompt within W + 5 s.
- Tap Yes → LED/fan turns on within 1 s; status confirms.
- Firmware stops cooling at 20 min even if the app is killed.
- Battery simulated to 10% → cooling locks in firmware and app shows the right message.
- Loosen electrode (or set fit low) → no alerts.
- Pair two boards → blink-to-identify chooses the right one; after bonding, app ignores the other.

---

## 6. End-to-End Tests (Maestro)

1. **First run → Save** (rebuilt 2026-11-17): Language → Meet TARA (3 pages) → Connect (demo) → skip calibration → Keep TARA Yes → name skip → age 26–35 → PMDD-aware cooling (3 days ago, 28 days) → reminders Yes → family skip → Daily Home with the tip and the cycle card.
2. **First run → Not now:** same until Keep TARA → Not now → "Nothing was saved." → Try home with the Keep card → relaunch lands on Language.
3. **30-second demo:** Meet TARA → See a 30-second demo → prompt → Yes → cooling → Calm returns → Continue → Meet TARA.
3. **Daily alert:** setUp app, demo "Story" → prompt → No → no prompt for 15 min (fake time) → prompt again.
4. **Reminder:** demo "Bad 2 PM week" → pattern card → Yes → reminder scheduled for 13:30.
5. **Help:** add contact → demo very-high → help question → Yes → place "In the field" → preview text exact → composer opened with exact text.
6. **Battery:** demo low battery → messages at 20% and 10%; cool button disabled at 10%.
7. **Delete Everything:** hold 3 s → back to Language; checks from §4.
8. **RTL & Amharic:** run flow 1 in Arabic and Amharic; screenshots reviewed by a native speaker.
9. **Airplane mode:** flows 1–7 in airplane mode on a release build.

---

## 7. Performance

- Engine step ≤ 2 ms on a 2 GB RAM Android (benchmark 10,000 samples).
- 8-hour soak with demo source: memory stable, no UI jank, DB size < 2 MB.
- Battery drain of foreground monitoring measured over 1 hour on a real low-end phone (target ≤ ~5%/h).

---

## 8. Usability & Field Validation (with consent)

- 5+ participants per language where possible; tasks: start Try, understand the meter, answer the prompt, find Delete Everything, add a family contact.
- Measure: task success without help; comprehension of "Calm" meter (ask "what does green mean?"); whether they believe data leaves the phone (it must be "no").
- Comfort rating (pictorial 1–5) of the tarha with sensor and cooling.

---

## 9. Definition of Done (per feature)

1. Unit tests pass for any engine/signal/pattern logic it touches.
2. Integration tests pass, including negative cases.
3. Any privacy promise it touches has a passing check (§4).
4. Works in airplane mode on a release build.
5. Strings and voice lines exist in all three languages; RTL verified.
6. Exercised in at least one E2E flow.
7. No performance regression.

---

*End of Testing & Verification. Next: `13-implementation-plan.md`.*
