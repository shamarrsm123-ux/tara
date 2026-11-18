# TARA — Product Requirements Document

**Version:** 1.0
**Document:** 02 — PRD
**Status:** Ready — open items listed in Section 13
**Depends on:** 01-product-vision.md

### Reference Scenario ("Two O'Clock")

Keep this in front of engineering throughout. Every requirement below must support it without friction.

> Amal is 31 and picks tomatoes outside Minya from 7 a.m. Her phone is an old Android with no data plan. On Monday her cousin helps her try TARA: she chooses Arabic, hears the app speak, puts on the tarha with the small sensor behind her ear, and taps **Try to Calm Your Brain**. The app sits with her in the shade for one minute to learn what *calm* looks like for her. Back in the field at 2:10 p.m., her phone buzzes in her pocket: the meter is red. The app asks, out loud, "Your stress is high. Cool around your head now?" She taps the big blue **Yes**. The pads cool; ten minutes later the meter is yellow, then green. On Friday the app tells her: "You often feel stressed around 2 PM. Should I remind you at 1:30 to wear your tarha?" She taps **Yes**. Nothing about her ever leaves her phone. One afternoon her stress stays red even after cooling; the app quietly asks if she wants to message her sister. She taps **No**, and the app doesn't ask again for an hour.

---

## 0. How to Read This Document

This PRD turns the team's brief into requirements specific enough that two engineers would build the same thing. Markers:

- 🟢 **From brief** — taken directly from the team's brief.
- 🔁 **Changed from brief** — the brief said something different; the change and its reason are stated inline. These are proposals the team can reverse.
- 🟡 **Open** — a real decision the team still needs to make (consolidated in Section 13). Build the stated default until it's decided.

---

## 1. Purpose

Defines the functional and behavioral requirements for the TARA prototype: the mobile app, the minimum hardware it talks to, and the demo. It does not define visual design (`04`), local data model (`05`), architecture (`06`), Bluetooth protocol and core algorithms (`07`), or privacy model (`10`).

---

## 2. Product Summary

Three parts:

1. **The tarha** — a normal headscarf with a lentil-sized EEG sensor behind the ear, cooling pads, a small battery, and a Bluetooth Low Energy (BLE) chip. For the prototype, this can be a Tinkercad diagram plus a microcontroller demo (see `13`).
2. **The app** — receives stress-related numbers from the tarha, turns them into a simple Calm meter, triggers cooling, alerts, reminders, and an optional consent-based SOS.
3. **The privacy promise** — no server, no account, no internet, no location tracking, auto-delete within 7 days, one button to delete everything.

---

## 3. Goals and Non-Goals

### 3.1 Goals
- G1: Detect when her stress is high *relative to her own calm baseline* and offer cooling within seconds.
- G2: Make the full experience usable without reading — every key message has an icon, a color, a sound and a voice recording.
- G3: Work entirely offline on a low-end Android phone.
- G4: Learn a daily stress pattern from her last 7 days and remind her ahead of time, only if she agrees.
- G5: Let her ask family for help with one consent step per request, sharing only a general place she picked herself.
- G6: Prove the privacy claims are real: verifiable by a judge (airplane mode works; the app has no internet permission in its release build; Delete Everything leaves nothing behind).

### 3.2 Non-Goals
- NG1: No diagnosis of PMDD or any condition. 🟡 *Revised 2026-11-17 (team decision): the word "PMDD" may appear only in the opt-in PMDD-aware cooling (Settings card and Home cycle card, `03` Flows 19–20). The app never says she has PMDD, and never shows it — or anything about mood or cycle — on the lock screen.*
- NG2: No cloud, accounts, login, sync, analytics, crash-reporting services, or ads.
- NG3: No GPS or location tracking of any kind.
- NG4: No AI chatbot, no "mental health coaching" content.
- NG5: No employer or supervisor dashboard.
- NG6: No social features.

---

## 4. Target Users

### 4.1 Primary
Women aged 18–50 doing outdoor farm work in extreme heat in Egypt and Ethiopia. 🟢 *From brief.*

### 4.2 Personas
**Persona 1 — The Wearer (Amal).** Uses TARA daily. Low-cost Android, intermittent or no mobile data, possibly shared with family. Reads a little or not at all. Wants relief from heat without fuss. Fears: being watched, being judged, the device being "inside her head."

**Persona 2 — The Helper (Amal's cousin, or an NGO field worker).** Helps her set it up the first time. Literate, more comfortable with phones. Must not need to see Amal's data to help.

**Persona 3 — The Family Contact (Amal's sister).** Never installs the app. Only ever receives an SMS Amal herself chose to send.

**Persona 4 — The Judge / Researcher.** Watches the demo. Needs to see the loop work, and needs to *verify* the privacy claims rather than take them on trust.

---

## 5. Terminology

| Term | Definition |
|---|---|
| **Tarha** | The headscarf with the sensor, cooling pads, battery and BLE chip. |
| **Sensor** | The lentil-sized EEG electrode set behind the ear. It only listens: it does not shock, stimulate, or go inside anything. |
| **Stress index** | Internal number 0–100 computed on the phone, relative to her baseline. Higher = more stressed. Never shown raw. |
| **Calm level** | The user-facing number: `100 − stress index`. Higher = calmer. Shown with a color and a face. 🔁 *Renamed from "Brain Energy" — see 8.3.* |
| **Calm zones** | **Calm** (green, Calm ≥ 50), **Rising** (yellow, 31–49), **High stress** (red, ≤ 30). Exact thresholds in `07`. |
| **Baseline** | Her personal calm reference, recorded during a 60-second calibration in the shade. |
| **Cool break** | A cooling session (pads on) plus the suggestion to rest in shade and drink water. |
| **Pattern** | A repeated time of day when her stress rose on at least 3 of the last 7 days. |
| **Reminder** | A daily notification 30 minutes before a Pattern, which she agreed to. |
| **Help request (SOS)** | An SMS she approves and sends to a family contact, with an optional general place. |
| **Place label** | A general place she chooses at send time ("In the field", "At home", "At the market", or none). Never GPS. |
| **Try session** | The first-run experience. Nothing from it is saved unless she says so at the end. |
| **Demo source** | A simulated sensor used when no tarha is available. Always labeled on screen as "Demo". |

---

## 6. Core Flows (summary — full detail in `03-user-flows.md`)

### 6.1 First Run ("Try") — 7 screens, no login
Language → Welcome (Screen 0) → Wear & Connect (1) → Learn Your Calm (1b, new) → Home (2) → High-Stress Action (3) → Smart Pattern (4) → Save? (5) → Privacy & Safety (6).

### 6.2 Daily Use
Open app or keep it in pocket → app reconnects to tarha automatically → background monitoring → alerts / cooling / reminders / battery warnings → optional help request.

### 6.3 Control
At any time: stop cooling, mute alerts for a while, change reminder, manage family contacts, lock the app, shorten auto-delete, Delete Everything.

---

## 7. Roles and Permissions

There is exactly one role: **the wearer**, on her own phone. There are no other users of the app. 🔁 *New: the brief didn't address shared phones; this PRD adds an optional App Lock (8.12) because phones in the target setting are often shared with family.*

| Action | Wearer | Anyone else holding her phone | Family contact |
|---|---|---|---|
| See Calm meter / history | ✅ | Only if App Lock is off | ❌ |
| Start/stop cooling | ✅ | Only if App Lock is off | ❌ |
| Send help request | ✅ (approves each time) | Only if App Lock is off | ❌ |
| Receive help request | — | — | ✅ via SMS only |
| Delete Everything | ✅ (requires App Lock if on) | ❌ if App Lock on | ❌ |

---

## 8. Functional Requirements

### 8.1 Language & Voice
- First screen of first run: language picker with **Arabic (Egyptian)**, **Amharic (አማርኛ)**, **English**. Each option plays its own name aloud when tapped. 🔁 *New — the brief starts at Welcome, but Amal can't read a Welcome screen in the wrong language.*
- Every key screen and alert has a recorded voice line (not text-to-speech, which is poor for Amharic) and a ▶ speaker button. "Speak automatically" is ON by default.
- Full right-to-left layout for Arabic.

### 8.2 Welcome (Screen 0) — no login, no personal data 🟢
- Image of the tarha with the sensor position highlighted.
- Text (voiced): "Are you a woman 18 to 50? Do you get tired and stressed in the sun? I'm TARA — a tarha like yours, with a small sensor behind your ear. It senses when you're stressed and cools around your head, so you can calm down and continue your day."
- 4 points, each with an icon: 🔁 *brief said "3 points" but listed 4; all 4 kept.*
  - For women 18 to 50 working in the field.
  - A small sensor behind your ear senses when you're stressed.
  - We cool around your head so your body calms down.
  - Your stress data stays on your phone. We don't send it to anyone.
- One small line: "TARA is not a doctor and does not diagnose illness." 🔁 *New — required honesty statement.*
- One big button: **Try to Calm Your Brain**.
- Must NOT ask for name, age or phone number. 🟢

### 8.3 Calm Meter
- 🔁 *Changed from brief:* the brief uses "Brain Energy 20% red" (stressed) and "Brain Energy 80% green" (calm), but Screen 3 describes the graph going "80% → 40%" (a stress number). Two numbers moving in opposite directions will confuse wearers and judges. **One user-facing number: Calm level, where higher is better.** "Brain Energy" was also renamed because low *energy* means tiredness, not stress. The Screen 3 example becomes **Calm 20% → 60%**. 🟡 *Team may keep the "Brain Energy" name as long as it stays one direction.*
- Displayed as: big number + color + face icon (😟 / 😐 / 🙂 style, custom-drawn, not emoji) + zone word ("High stress" / "Rising" / "Calm"). Never color alone.

### 8.4 Connect & Sensor Fit (Screen 1)
- Animated fit guide: "Wear the tarha. The sensor goes behind your ear, touching your skin."
- **Connect** button scans for the tarha over BLE, pairs, and remembers it.
- Live graph starts moving as soon as data arrives (never a static image). 🟢
- 🔁 *New:* **Sensor fit indicator** (Good / Adjust / No contact). If contact is poor, the app says "Move the sensor so it touches your skin" and **does not compute stress** — preventing false alarms from a loose sensor.

### 8.5 Learn Your Calm (Screen 1b) 🔁 *New*
- 60-second calibration: "Sit in the shade. Breathe slowly. I'm learning what calm looks like for you." A circle fills; voice counts gently.
- Reason: a fixed "beta waves = stress" threshold would be wrong for most people. TARA compares her to **her own** calm. This makes alerts more trustworthy and the science more honest.
- Recalibrate anytime from Settings. If skipped, a population default is used and a "Learn your calm" card stays on Home.

### 8.6 Home (Screen 2) 🟢
- Calm meter, moving graph (last 10 minutes), tarha battery, cooling state.
- Big button: **Cool Around My Head**. When cooling: **Stop Cooling** + remaining time.
- Small **Help** button (opens 8.10). 🔁 *New — the brief only triggers SOS from very high stress; she must also be able to ask for help herself.*

### 8.7 High-Stress Action (Screen 3) 🟢 with additions
- Trigger: stress sustained in the High zone (see `07` for timing).
- Phone vibrates (distinct pattern) and plays a voice line, so she doesn't need to look.
- Prompt: "Your stress is high. Should we cool around your head now?" **[Yes]** **[No]**
- On Yes: cooling starts, a "Take a break: shade + water" card shows, graph updates live.
- On No: dismissed; no re-prompt for 15 minutes.
- 🟡 *Open — automatic cooling:* the concept says cooling "turns on automatically"; Screen 3 asks first. **Default: Ask me first.** Settings offers **Cool automatically** (cooling starts at once, with a "Stop" button and voice notice). Reason for the default: consent-first matches the product's philosophy; the setting exists because hands are often busy.
- **MVP / 30-second video:** this screen, with the demo source showing Calm going 20% → 60% (sped up and labeled "Demo — sped up").

### 8.8 Smart Pattern (Screen 4) 🟢
- During the Try session, shown using a clearly labeled sample week ("This is an example").
- In daily use, offered only when a real Pattern exists: "You often feel stressed around 2 PM. Do you want me to remind you at 1:30 PM to wear your tarha?" **[Yes] [No]**
- Shows "Calm 80% — green — Your brain is calm" after the cooling demo completes.
- Reminder text on lock screen is discreet (see 8.13).

### 8.9 Save? (Screen 5) — age check at the end 🟢
- "Do you want to save this experience?" **[Yes] [No]**
- No → everything from the Try session is erased from memory; the app returns to Welcome next time. Nothing was ever written to storage. 🔁 *New detail: "nothing is saved until you say so" is now an enforced rule (`11`).*
- Yes → optional name ("What should TARA call you? You can skip."), then age group: "Which group are you in? You can skip." **[18–25] [26–35] [36–50] [Skip]**. Never an exact age. 🟢

### 8.10 Privacy & Safety (Screen 6) 🟢 with changes
- "All your stress data was processed on your phone only."
- **Delete my data after: 7 days** — 🔁 *Changed:* not an on/off switch. She can make it **shorter (1 or 3 days), never longer.** Turning it "off" would contradict the promise.
- **No internet used ✓** — 🔁 *Changed:* shown as a status, not an "Offline mode" switch. The app has no internet code and (in release builds) no internet permission, so there is nothing to turn on. A switch would imply the app could go online.
- Red **Delete Everything** (hold for 3 seconds to confirm).
- Optional: "Do you want to add a family member for emergencies? 100% optional." **[Yes] [No]**
- Optional: "Do you want to be able to tell your family a general place, like 'In the field'? We will NOT send your exact location, and we will NEVER send by ourselves. We will ask you every time." **[Yes] [No]**

### 8.11 Help Request (SOS)
- Two entry points: manual **Help** button; or an automatic *question* after very high stress continues despite cooling (see `07`).
- Always asks first: "Do you want to send a help request to your family?" **[Yes] [No]** 🟢
- If Yes: she picks the contact (if more than one) and the place label for *this* message (or "Don't say a place"), sees the exact message, then the phone's own SMS app opens with it ready; **she presses Send.** 🔁 *New detail: using the phone's SMS app means it works with no internet, and the app physically can't send anything without her.*
- If No: no further help prompts for 60 minutes.
- No family contact saved → the question offers "Add a family member" instead.

### 8.12 App Lock 🔁 *New, optional*
- Off by default; offered on Screen 6 ("Lock TARA so only you can open it?").
- Uses the phone's own screen lock (PIN/pattern/fingerprint). TARA never stores a password.

### 8.13 Notifications & Discretion 🔁 *New*
- Lock-screen notification text is neutral by default: "TARA: time for a cool break." Never "High stress detected" on the lock screen, never anything about mood or cycle.
- Full text appears only inside the app.

### 8.14 Battery Alerts 🟢 extended
- Tarha battery ≤ 20%: "Battery low. Cooling will stop soon. Please find shade."
- Tarha battery ≤ 10%: cooling disabled to protect the sensor; "Battery very low. Cooling is off. Find shade and drink water."
- Phone battery ≤ 15% while monitoring: "Your phone battery is low. TARA may stop watching soon." 🔁 *New — if the phone dies, nothing works.*

### 8.15 My Days (History)
- Today's Calm graph, with cooling sessions marked as blue bands.
- Last 7 days as simple colored bars (time in red/yellow/green). Nothing older exists.

### 8.16 Disconnection
- If the tarha disconnects, Home shows "Tarha not connected — reconnecting…" and the app retries automatically. No stress alerts are produced from stale data.

---

## 9. Non-Functional Requirements
- **NFR1 Offline:** 100% of features work in airplane mode (except SMS sending, which needs cell signal, not internet).
- **NFR2 Low-end devices:** runs smoothly on Android 8+ with 2 GB RAM. iOS supported second.
- **NFR3 Latency:** alert within 90 seconds of stress first entering the High zone (including the sustain window); cooling command reaches the tarha within 1 second of tapping Yes.
- **NFR4 Battery:** monitoring should cost the phone no more than ~5% battery per hour in the field.
- **NFR5 Sunlight legibility:** default theme readable in direct sun (see `04`).
- **NFR6 Accessibility:** touch targets ≥ 56dp; never color-only meaning; voice on every key screen.
- **NFR7 Privacy:** see `10`. No network permission in release build; encrypted storage; 7-day maximum retention.

---

## 10. MVP Scope (Prototype)

### 10.1 Must Have
Language + voice · Welcome · Connect with fit indicator · Learn Your Calm · Home with live Calm meter + graph · High-stress prompt + cooling · Pattern detection + reminder · Save? with optional name + age range · Privacy & Safety screen with Delete Everything · Help request via SMS with consent · Battery alerts · Demo source with visible label · Encrypted local storage + auto-delete · PMDD-aware cooling (opt-in) with the daily check-in (added 2026-11-17, `03` Flows 19–20).

### 10.2 Explicitly Deferred
- HRV sensor support · Skin/ambient temperature sensor in the tarha (🟡) · Export data for research (would need its own consent design) · iOS background monitoring parity · Wear OS / smartwatch.

### 10.3 Permanently Excluded
Cloud sync · accounts · GPS · employer dashboards · ads · diagnosis.

---

## 11. Success Metrics (Prototype)
- **Primary:** cool breaks taken after a High-stress alert, followed by Calm returning toward baseline.
- Demo: full 30-second MVP runs in airplane mode on a low-end Android phone.
- False-alert proxy: % of alerts where she taps No or stops cooling within 1 minute.
- Comfort rating (1–5, pictorial) after test sessions.
- Privacy verification: Delete Everything leaves zero app files; release APK requests no INTERNET permission.

---

## 12. Edge Cases
- **Sensor loose mid-day** → stress paused, "Adjust sensor" shown, no alerts.
- **She taps No to cooling repeatedly** → after 3 No's in a day, the app asks once: "Should I alert you less often today?" (raises sustain window). Never nags.
- **Phone shared** → App Lock + discreet notifications.
- **Clock changes / timezone** → patterns use local time of day; a big clock jump triggers re-evaluation, not a false reminder.
- **No family contact and very high stress** → only the "take a break" card + option to add a contact. Never sends anything.
- **Under 18 or over 50** → the age question has no option for them; Welcome states the intended age range. TARA doesn't verify age (no ID, by design).

---

## 13. Open Questions (team decision needed)
1. 🟡 **Auto-cool default** — "Ask me first" (current default) vs "Cool automatically".
2. 🟡 **Name** — "Calm level" vs keeping "Brain Energy" (one direction only).
3. ✅ **Cycle marker** — decided 2026-11-17: built as opt-in **PMDD-aware cooling**. She logs day 1 of her period (or corrects her phase); the app follows menstrual / follicular / ovulatory / early & late luteal phases and offers cooling sooner in the late luteal and first menstrual days (`07` §10). Only the latest 6 day-1 dates are kept (`05` §2.9); a 3-question evening check-in is kept ≤ 7 days like minute data (`05` §2.10). 🟡 A consent and research-ethics plan is still required before field sessions use it (`10` §6).
4. 🟡 **Temperature sensor** — a cheap skin/ambient thermistor in the tarha would add the *heat* half of the research question. Recommended for the hardware diagram; app support is small (`07` reserves the field).
5. 🟡 **Ethiopia language set** — Amharic only, or also Afaan Oromo / Tigrinya?

---

## 14. Decision Log

| # | Decision | Source |
|---|---|---|
| 1 | Women 18–50, outdoor farm work, Egypt & Ethiopia | Brief |
| 2 | No login; Welcome shows no personal fields | Brief |
| 3 | Sensor behind the ear, listen-only, BLE to phone | Brief |
| 4 | All EEG processed on-device, encrypted, auto-delete 7 days, offline | Brief |
| 5 | Delete Everything button | Brief |
| 6 | Predictive reminder 30 min before learned stress time | Brief |
| 7 | SOS opt-in, asked every time, general place only | Brief |
| 8 | Battery low → "find shade" | Brief |
| 9 | Age asked only as optional range, at the end | Brief |
| 10 | Language picker + voice before Welcome | Changed — accessibility |
| 11 | Personal calibration ("Learn Your Calm") | Changed — accuracy & honesty |
| 12 | Sensor fit indicator; no stress computed on poor contact | Changed — false-alarm prevention |
| 13 | One metric, Calm level, higher = better | Changed — consistency |
| 14 | Auto-delete can be shortened, never extended | Changed — promise integrity |
| 15 | "No internet used" status instead of Offline toggle | Changed — honesty |
| 16 | SOS via phone's SMS app; she presses Send | Changed — offline + enforced consent |
| 17 | Manual Help button | Changed — safety |
| 18 | Optional App Lock; discreet notifications | Changed — shared phones |
| 19 | Try session saves nothing unless she says Yes | Changed — privacy |
| 20 | Phone battery warning | Changed — reliability |

---

*End of PRD. Next document: `03-user-flows.md`.*
