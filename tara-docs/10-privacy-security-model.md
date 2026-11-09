# TARA — Privacy & Security Model

**Version:** 1.0
**Document:** 10 — Privacy & Security Model (mental privacy)
**Status:** Ready — shares top authority with the PRD (`08` §3.1)
**Depends on:** 02, 05, 06, 07, 09

---

## 0. Purpose

Brain data is among the most intimate data a person has. TARA's approach is not "protect the data we collect" but **"design so there is almost nothing to protect, and what exists stays in her hands."** This document lists every privacy promise, the threat it addresses, and exactly where it's enforced.

**One-sentence statements for the prototype and judges:**
- "All EEG data is processed locally on the phone to protect mental privacy."
- "SOS shares a general place only with opt-in consent, and she approves each time."

---

## 1. Data Minimization Ladder

| Stage | What exists | Lifetime |
|---|---|---|
| Electrode signal | Raw EEG | Inside the tarha's chip only, milliseconds |
| Over Bluetooth | 3 band powers + fit + temp + flags, 1/s | Encrypted BLE link; not stored by the tarha |
| Phone memory | Per-second stress & Calm | ~10 min ring buffer, RAM only |
| Phone disk (encrypted) | 1 summary per minute + events | ≤ 7 days (she can choose 1 or 3) |
| Anywhere else | Nothing | — |

---

## 2. Privacy Promises → Enforcement

| # | Promise | Enforcement |
|---|---|---|
| P1 | Brain data never leaves the phone | No INTERNET permission in release APK; no network libraries; CI checks manifest and dependency list |
| P2 | Processed on the phone only | Engine is local TS; no remote model |
| P3 | Encrypted | SQLCipher DB; key in Keystore/Keychain; `secure_delete` on |
| P4 | Auto-delete ≤ 7 days | Retention job (start, hourly, midnight); DB CHECK `retention_days <= 7`; tests with fake clock |
| P5 | Delete Everything | Key deletion (crypto-shred) → file deletion → verification |
| P6 | Nothing saved during Try unless she says Yes | Store not created until `createFromTrySession` |
| P7 | No location tracking | No location API calls (lint rule bans imports); Android ≤11 permission handled per §4 |
| P8 | Help request only with her approval, every time | Only outbound path is the SMS composer, opened from a preview she taps; engine can only *ask* |
| P9 | General place only | Place is one of 4 fixed labels she chooses per message; no coordinates exist in the app |
| P10 | No identity required | No login, no phone number of hers, no exact age; name optional |
| P11 | Others holding her phone can't see her data (if she wants) | Optional App Lock using phone authentication |
| P12 | Lock screen doesn't reveal stress | Neutral notification texts for every kind |
| P13 | Demo never mixes with real data | `source` tag on samples; store rejects demo writes |

---

## 3. Threat Model

| Threat | Example | Mitigation |
|---|---|---|
| **Server breach** | Company DB leaked | No server exists (P1) |
| **Shared phone** | Husband/brother opens TARA | App Lock (P11), discreet notifications (P12), minimal stored data |
| **Lost/stolen phone** | Phone stolen in market | Encrypted DB with hardware-backed key; data ≤ 7 days; App Lock |
| **Coercion** | Employer demands to "see her stress" | No export feature; no dashboard; nothing older than 7 days; she can Delete Everything in 3 s; product copy never frames data as for anyone else |
| **BLE eavesdropping** | Someone nearby sniffs packets | Bonded, encrypted BLE link; payload carries no raw EEG anyway |
| **Spoofed tarha** | Fake device feeds false stress | Phone connects only to its bonded device; protocol validation + CRC; firmware version check. 🟡 Just-Works pairing isn't MITM-proof (see `07` §2.2) |
| **Malicious app on phone** | Another app reads files | App-private storage + encryption; no exported content providers; no data in shared storage or clipboard |
| **OS cloud backup** 🟡 | Android Auto Backup copies app data to the user's cloud account (done by the OS, so the missing INTERNET permission doesn't stop it) | `android:allowBackup="false"`; external-storage permissions blocked in all builds. *Phase 0 assumption — needed for P1 to be true.* |
| **SMS misuse** | Someone triggers SOS to scare family | Requires unlocked app + explicit multi-step flow + she presses Send in SMS app |
| **Inference from notifications** | Repeated "stress" notifications seen by others | Neutral copy |
| **Supply-chain / SDK leakage** | A library phones home | Forbidden-dependency list (`06` §2); no INTERNET permission means even a bad SDK can't connect |
| **Over-claiming** | Judges/users think TARA diagnoses | Disclaimers; banned words list (`04` §12) |

---

## 4. The Android Location-Permission Exception (disclosed, not hidden)

- **Android 12+:** TARA requests `BLUETOOTH_SCAN` (with `neverForLocation`) and `BLUETOOTH_CONNECT`. **No location permission.**
- **Android 8–11:** the operating system requires `ACCESS_FINE_LOCATION` to scan for any Bluetooth device. TARA requests it only on these versions, shows a plain-language explanation first ("Your phone calls this 'location', but TARA only uses it to find your tarha. TARA never reads where you are."), and **never calls a location API**. A lint rule and a code search in CI enforce the "never calls" part.
- **iOS:** Bluetooth permission only.

---

## 5. Consent Design Principles

1. **Ask at the moment it matters**, not in a wall of text at install.
2. **Equal-weight choices:** Yes and No buttons are the same size.
3. **Every optional thing has Skip.**
4. **Reversible:** every opt-in (family, place, reminders, lock, auto-cool) can be turned off in Safety.
5. **Per-instance consent for outbound data:** each help message is approved individually, with the exact text shown.
6. **Spoken consent:** consent questions are voiced, so non-readers consent knowingly.

---

## 6. Research Ethics (for user testing)

TARA's research question involves PMDD — reproductive and mental-health information. For any testing with real participants:
- Use a written + spoken consent process in the participant's language, approved by a supervisor/ethics contact.
- Testing data stays on the test phone, follows the same 7-day rule, and is not exported by the app. Any research data collection (e.g., comfort surveys) happens on paper or a separate, consented instrument.
- No cycle data is collected by the app in this version (`02` §13).

---

## 7. Verification

Each promise P1–P13 has at least one automated or scripted check in `12` §4 and §6. A promise without a passing check is treated as false, and the matching UI sentence must not ship.

---

*End of Privacy & Security Model. Next: `11-state-and-invariants.md`.*
