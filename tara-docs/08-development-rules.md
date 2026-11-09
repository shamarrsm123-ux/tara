# TARA — Development Rules & Engineering Governance

**Version:** 1.0
**Document:** 08 — Development Rules
**Status:** Ready — governs how any implementer behaves while building TARA
**Depends on:** 01–07

---

## 0. What This Document Is

Documents `01`–`07` define what TARA is and how it's built. This one defines **how the implementer must behave**. The failure mode it prevents: AI-assisted development adding complexity, quietly inventing behavior, and — the one that matters most for TARA — **quietly weakening a privacy promise because it made something easier to build.**

---

## 1. Prime Directive: The Privacy Promises Are Product Requirements

Every privacy sentence shown to the user is a **testable requirement**, not marketing copy:

| Promise | Enforced by |
|---|---|
| "Your stress data stays on your phone" | No network permission in release; no network code; CI check (`12` §4) |
| "Processed on your phone only" | Engine runs locally; no remote inference |
| "Deleted after 7 days" | Retention job + DB CHECK constraint + tests |
| "We will never send by ourselves" | Only outbound path is the SMS composer |
| "We will NOT send your exact location" | No location API calls anywhere; lint rule |
| "Delete Everything" | Crypto-shred + file deletion + verification test |

If an implementation change would make any of these sentences false, **stop and flag it.** Never edit the sentence to match the code.

---

## 2. Cost = $0

No paid service, ever, for the prototype. Expo/React Native, ESP32/Arduino tooling, GitHub, GitHub Actions, and the Android emulator are sufficient. There is no hosting, database service, or auth provider to pay for because there is no backend.

---

## 3. Never Silently Change a Product Decision

> If an implementation decision conflicts with a product document, STOP and flag the conflict. Don't reinterpret, simplify, or override.

> If a detail is genuinely unspecified, make the smallest reasonable assumption, write it down in the relevant doc as 🟡, and move on. Never introduce new user-facing behavior because it's convenient.

### 3.1 Authority Hierarchy
1. `02-prd.md` (incl. its decision log) and `10-privacy-security-model.md` — **privacy has equal top authority with the PRD**.
2. `03-user-flows.md`
3. `05-data-model.md`, `07-ble-protocol-and-core-logic.md`, `11-state-and-invariants.md`
4. `06-architecture.md`, `09-module-contracts.md`
5. Implementation details.

Same-level conflict → stop and ask the team.

---

## 4. No Speculative Features

Do not add, however small or well-meant: accounts or login · cloud backup or sync · analytics, telemetry, crash reporting · GPS or maps · AI chat or "insights" text · gamification, streaks, badges · social or sharing features · cycle tracking (deferred, needs ethics plan) · HRV or watch integration (deferred) · data export · employer/NGO dashboards · a server "just for updates".

If it's not in `01`–`07`, it isn't built.

---

## 5. No AI Code Smell

- **No stress logic in components.** Thresholds, timers and decisions live in `engine/` only.
- **No magic numbers.** Every constant from `07` §9 lives in `engine/constants.ts`.
- **No silent catches.** Every caught error is typed and either handled visibly or logged (content-free).
- **No logging of content.** Never log stress values, names, phone numbers, messages, or band powers — not even in debug, unless behind an explicit debug-only flag that release builds strip.
- **No mock data in real paths.** Demo data only through `demo/`, tagged by source, never persisted.
- **No giant files.** One responsibility per module; files over ~300 lines need a reason.
- **No "temporary" network code** for debugging. Use the in-memory log viewer in debug builds.
- **No hardcoded strings in UI.** Every user-facing string goes through i18n with Arabic, Amharic and English entries (missing translation = failing test).

---

## 6. Threat Model Awareness

Every feature must be considered against `10` §3: shared phone, lost/stolen phone, coercive partner or employer, nearby BLE eavesdropper or spoofed tarha, malicious app on the same phone, judges inspecting the APK. Mitigations are server-free and on-device.

---

## 7. Safety-Critical Logic Is Tested Before UI

The following must have passing unit tests **before** any screen depends on them: stress index mapping, zone hysteresis, prompt cooldowns, cooling limits, help-question conditions, pattern detection, retention cutoff, Delete Everything ordering. The engine is pure TypeScript with an injectable clock — there is no excuse for untested timing logic.

---

## 8. Hardware Is the Last Line of Safety

Cooling limits (max duration, battery lockout, overcool cutoff) are enforced in firmware as well as in the app. App logic must never be the only thing preventing the tarha from cooling indefinitely.

---

## 9. Explain Before Changing Architecture

Before changing the database library, encryption approach, BLE library, notification/foreground-service approach, or adding any native module: explain the decision, alternatives, privacy impact, cost and why it fits. Routine components don't need this.

---

## 10. Accessibility Is Not Polish

A screen isn't done without: voice line recorded or placeholder file wired, RTL verified, 56dp targets, color + icon + word for status, and a check at 130% font scale. These are acceptance criteria, not a later pass.

---

## 11. Prefer Deletion Over Addition

Before adding a table, setting, screen or state, ask: *can an existing one do this?* TARA's best decisions were deletions: no server, no account, no GPS, no offline toggle (because there's nothing to toggle). Keep going in that direction.

---

## 12. Honesty in Demos

- Demo data is always labeled on screen.
- Time-compressed demos say "sped up".
- Never present the demo stress curve as a real measurement.
- Pitch claims about accuracy must cite the source study and its conditions (see `01`).

---

*End of Development Rules. Next: `09-module-contracts.md`.*
