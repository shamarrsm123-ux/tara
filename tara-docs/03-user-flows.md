# TARA — User Flows

**Version:** 1.0
**Document:** 03 — User Flows
**Status:** Ready — reflects every change logged in `02-prd.md` Section 14
**Depends on:** 01-product-vision.md, 02-prd.md

---

## 0. How This Document Relates to the Team's Brief

The brief described 7 screens (0–6). This document keeps all 7, in the same order, with the same purpose and wording (lightly edited for voice), and adds what is needed to make them work for a real woman in a real field: a language step, a calibration step, daily-use flows, and safety/edge flows. Changes are marked 🔁 at point of use.

### 0.1 Structure of the App

Two modes, one app:

- **Try mode (first run):** a guided, linear story — Screens L, 0, 1, 1b, 2, 3, 4, 5, 6. This is also the judge demo. Nothing is written to storage until Screen 5 "Yes".
- **Daily mode (after saving):** three tabs — **Home** · **My Days** · **Safety** (privacy, family, delete, settings).

🟡 *Team decision 2026-11-16 (`04a` D6): the tab bar is also shown in Try mode from Home onward, with Try-mode content (nothing saved). Screens 4–6 of the Try story still follow in order when they are built.*

### 0.2 Defaults Used Where the Brief Was Silent
- Back navigation in Try mode is allowed on every screen except Screen 3's active cooling (where Stop Cooling is the action).
- Every voice line can be replayed with ▶; every prompt can also be answered by the big buttons — no gestures required.
- All timings below are prototype defaults; the authoritative values live in `07-ble-protocol-and-core-logic.md`.

---

## Flow L — Choose Language (first launch only) 🔁 *New*

1. App opens on a full-screen picker: three large cards — **العربية**, **አማርኛ**, **English** — each with a ▶ that plays the language's name.
2. Tapping a card selects it and plays: "TARA will speak to you in this language."
3. **Continue** → Flow 0.
4. Language can be changed later in Safety → Settings. Choice is held in memory only until Screen 5 "Yes" (then stored).

---

## Flow 0 — Welcome: Definition & Trust (Screen 0) 🟢

1. Illustration of a woman wearing a light-colored tarha; a small dot glows behind her ear.
2. Voice + text: "Are you a woman 18 to 50? Do you get tired and stressed in the sun? I'm TARA — a tarha like yours, with a small sensor behind your ear. It senses when you are stressed and cools around your head, so you can calm down and continue your day."
3. Four icon rows:
   - 👩‍🌾 For women 18 to 50 working in the field
   - 👂 A small sensor behind your ear senses when you are stressed
   - ❄️ We cool around your head so your body calms down
   - 🔒 Your stress data stays on your phone. We don't send it to anyone
   *(Icons are custom illustrations, not emoji — see `04`.)*
4. Small line: "TARA is not a doctor and does not diagnose illness."
5. A small expandable "What does the sensor do?" → "It only listens. It does not shock you. It does not go inside your head. It sends a few numbers to your phone — nothing else."
6. One big button: **Try to Calm Your Brain** → Flow 1.
7. No name, age or phone number anywhere on this screen. 🟢

---

## Flow 1 — Wear & Connect (Screen 1)

1. Short looping animation: tarha goes on; sensor pressed gently behind the ear.
2. Voice + text: "Wear the tarha. Put the sensor behind your ear, touching your skin."
3. Button: **Connect**.
4. On tap:
   - Request Bluetooth permission with a TARA explanation screen first: "TARA uses Bluetooth only to talk to your tarha." (On Android 11 and older, the phone also forces a "location" permission for Bluetooth scanning — TARA shows: "Your phone calls this 'location', but TARA only uses it to find your tarha. TARA never reads where you are." See `10` §4.)
   - Scan for tarhas nearby (10 s). If one is found → connect. If several → list with a "blink" button that makes each tarha's LED blink so she can pick hers.
   - If none → "We can't find your tarha. Is it turned on?" + **Try again** + **Use demo instead** (labeled demo mode — see Flow 18).
5. Once connected:
   - The graph starts moving live.
   - **Sensor fit** chip: 🟢 Good / 🟡 Adjust / 🔴 No contact. If not Good for 5 s: voice "Move the sensor so it touches your skin." 🔁 *New*
6. When fit is Good for 5 continuous seconds, **Next** becomes active → Flow 1b.

---

## Flow 1b — Learn Your Calm (Calibration) 🔁 *New*

1. Voice + text: "Sit in the shade. Breathe slowly. I'm learning what calm looks like for you."
2. A circle fills over **60 seconds**; a soft voice counts breaths (in 4, out 6).
3. If sensor fit drops below Good during calibration, the circle pauses and the fit message plays. Calibration resumes when fit returns; it needs 60 seconds of *good* signal in total.
4. On completion: "Thank you. Now I know your calm." → Flow 2.
5. **Skip** (small link): uses a default baseline, shows a gentle "Learn your calm" card on Home later.

---

## Flow 2 — Home (Screen 2) 🟢

1. Top: tarha status (connected icon, tarha battery %, cooling off/on).
2. Center: **Calm meter** — big number, colored ring, face icon, zone word. Example in the Try story: **Calm 20% — red — High stress**.
   - 🔁 *Changed from "Brain Energy 20% red" — same meaning, clearer name, one direction (higher = calmer).*
3. Below: moving graph, last 10 minutes, with green/yellow/red background bands.
4. Big button: **Cool Around My Head** (blue).
5. Small **Help** button (bottom corner) → Flow 11. 🔁 *New*
6. In the Try story, the demo or real signal drifts into the red zone so Flow 3 appears naturally. In daily use, Flow 3 appears whenever the trigger in `07` fires.

---

## Flow 3 — Action: High Stress (Screen 3) 🟢 — **the MVP / 30-second video**

Trigger: stress in High zone (Calm ≤ 30) sustained for 60 seconds with good sensor fit, and no prompt in the last 15 minutes, and cooling not already on.

1. Phone vibrates (long-long pattern) and the voice plays, even if the screen is off (notification + sound).
2. Full-screen card, red top band:
   "Your stress is high. Should we cool around your head now?"
   **[Yes — Cool]** (big, blue) **[No]** (outlined)
3. **If Yes:**
   - App sends the cooling command; the tarha confirms; the cooling icon animates.
   - Card changes to: "Cooling is on. Take a break: find shade and drink water." + countdown (default 10:00) + **Stop Cooling**.
   - Graph keeps updating live. In the Try story / video, Calm rises **20% → 60%** (stress 80% → 40%), shown with the label "Demo — sped up" when using demo data.
   - When Calm returns to the Calm zone, voice: "You are calmer now." Cooling continues until the timer ends unless she stops it.
4. **If No:** card closes; no new prompt for 15 minutes. After 3 No's in one day, ask once: "Should I alert you less often today?" [Yes] [No].
5. **If she doesn't respond within 60 s:** card stays; notification stays; nothing else happens (unless she chose "Cool automatically" — see Flow 9.4).
6. **If cooling isn't possible** (tarha battery ≤ 10%, or disconnected): the card says "Cooling can't start right now. Please find shade and drink water." with the reason icon.

---

## Flow 4 — Smart Pattern (Screen 4) 🟢

**In the Try story:**
1. After the cooling scene, a card labeled **"Example"**: a simple week strip with a red dot near 2 PM on most days.
2. Voice + text: "TARA can learn your days. For example, if you get stressed every day at 2 PM, I can remind you at 1:30 PM to wear your tarha. Would you like that when I find a pattern?" **[Yes] [No]** — this stores her *preference* (in memory until Screen 5).
3. Then: **Calm 80% — green — "Your brain is calm."**

**In daily use** (when the pattern engine finds a real pattern — `07` §6):
1. Card on Home + optional notification: "You often feel stressed around 2 PM. Do you want me to remind you at 1:30 PM to wear your tarha?" **[Yes] [No]**
2. Yes → a daily reminder at 1:30 PM (Flow 8). No → this pattern isn't offered again for 7 days.
3. If the pattern fades (fewer than 2 matching days in the last 7), the reminder pauses and Home shows: "Your 2 PM stress is gone lately, so I stopped the reminder." 🔁 *New — reminders shouldn't outlive the data that justified them.*

---

🟡 *Phase 6: in the Try story, Home shows a **Continue** button once she has answered the High-stress prompt (Yes or No) or started cooling; it leads to Screen 4. After Yes/No on Screen 4 the live Calm meter is shown, with "Your brain is calm." when the zone is Calm.*

## Flow 5 — Save This Experience? + Age Check (Screen 5) 🟢

1. "Do you want to save this experience?" **[Yes] [No]**
2. **No:** "Okay. Nothing was saved." All Try-session data in memory is wiped; the tarha is unpaired; next launch starts at Flow L. 🔁 *New — enforced.*
3. **Yes:**
   - Encryption key is created and stored in the phone's secure keystore; the encrypted database is created; the Try session's baseline, language and preferences are written. (Try-session stress readings are **not** kept — only the baseline.)
   - "What should TARA call you? You can skip." — optional text field (first name or nickname). **[Save] [Skip]**
   - "Which group are you in? You can skip." **[18–25] [26–35] [36–50] [Skip]** — never "How old are you exactly?" 🟢
4. → Flow 6.

---

## Flow 6 — Privacy & Safety (Screen 6) 🟢

1. Header (voice): "All your stress data was processed on your phone only."
2. Status rows:
   - 🔒 **Delete my data after: 7 days** — tap to make shorter (1 or 3 days). Never longer. 🔁
   - 📵 **No internet used ✓** — status, not a switch. Tap for: "TARA doesn't use the internet. It works in airplane mode." 🔁
   - ⚠️ **Delete Everything** (red) — hold 3 seconds → Flow 13.
3. Optional — **Family for emergencies:** "Do you want to add a family member for emergencies? 100% optional." [Yes] [No] → Yes opens Flow 10.
4. Optional — **General place:** "Do you want to be able to tell your family a general place, like 'In the field'? We will NOT send your exact location, and we will NEVER send by ourselves. We will ask you every time." [Yes] [No]. Yes → she picks which labels to offer (In the field / At home / At the market / On the road) — no GPS involved.
5. Optional — **Lock TARA:** "Lock TARA so only you can open it?" [Yes] [No]. 🔁 *New*
6. **Done** → Daily mode, Home tab.

🟡 *Phase 6: Family (step 3) and Lock (step 5) cards are added with Flow 10 (Phase 10) and App Lock (Phase 11), so no Yes on this screen promises a feature the build doesn't have. General place Yes pre-selects all four labels; she un-ticks the ones she won't use. Retention offers only shorter choices than the current one.*

---

## Flow 7 — Daily Use: Background Monitoring

1. When she opens TARA or the tarha is turned on nearby, the app reconnects to the remembered tarha automatically.
2. Android: a persistent, discreet notification "TARA is with you" keeps monitoring running with the screen off (foreground service). iOS: background BLE mode; behavior may be limited (`06` §7).
3. The Calm meter is computed every second; one summary value per minute is written to encrypted storage.
4. Alerts run per Flow 3; battery per Flow 12; disconnection per Flow 15.
5. She can **mute alerts** for 30 min / 1 hour / rest of day from Home (cooling button stays usable).

---

## Flow 8 — Predictive Reminder

1. At the reminder time (e.g., 1:30 PM), a notification with sound + vibration: lock screen shows "TARA: time to put on your tarha."
2. Opening it shows: "You often feel stressed around 2 PM. Put on your tarha now so it can help early." **[Okay] [Not today]**
3. "Not today" skips only today's reminder.
4. Reminders can be changed or turned off from Home → pattern card, or Safety → Reminders.

---

## Flow 9 — Cooling Controls

1. **Manual start:** Home → **Cool Around My Head** → cooling starts immediately (no confirm — she asked).
2. **Stop:** **Stop Cooling** at any time; one tap; always works, even if the app is mid-alert.
3. **Session limits:** default 10 minutes; she can extend once by 10 minutes; hard maximum 20 minutes per session, then a 5-minute rest (protects skin and battery). See `07` §5.
4. **Cool automatically (setting, off by default):** when Flow 3's trigger fires, cooling starts at once and the card shows "Cooling started because your stress is high" + **Stop Cooling**. 🟡 *Default is an open team decision (`02` §13).*

---

## Flow 10 — Add / Manage Family Contacts

1. Safety → **Family** → **Add**.
2. Two ways: type a name + phone number, or pick from phone contacts (the phone's picker; TARA only receives the one contact she taps).
3. Up to **3** contacts. Each shows name + last 3 digits of the number.
4. Optional: **Send a test message** — opens the SMS app with "This is a test from TARA. [Name] added you as an emergency contact." She presses Send.
5. Remove a contact: tap → **Remove** → confirm.

---

## Flow 11 — Help Request (SOS)

Two entry points:

**A. Manual:** Home → **Help**.
**B. Asked by TARA:** stress very high (Calm ≤ 15) for 10 minutes **despite** cooling or a break, and no help question in the last 60 minutes.

Steps (same for both):
1. "Do you want to send a help request to your family?" **[Yes] [No]** 🟢
   - No → close. Entry B won't ask again for 60 minutes.
   - No contacts saved → "You haven't added family yet." **[Add family]** **[Not now]**.
2. Yes → **Who?** (skipped if only one contact).
3. → **Say a place?** (only if she enabled place labels): [In the field] [At home] [At the market] [On the road] [Don't say a place].
4. → **Preview:** the exact message, e.g.:
   > "Amal needs help. Place: In the field. — sent from TARA"
   (If no name saved: "Your family member needs help…")
5. **Send** → the phone's SMS app opens with message and number filled in. **She presses Send in the SMS app.** TARA cannot send it for her. 🔁
6. Back in TARA: "Did your message send?" [Yes] [No, try again]. TARA records only "help request opened" with a timestamp (no number, no place) for her own history.

**Sentence for judges:** "SOS shares a general place only with opt-in consent, and she approves each time. TARA never uses GPS."

---

## Flow 12 — Battery Alerts

| Condition | What she sees / hears | Effect |
|---|---|---|
| Tarha ≤ 20% | "Battery low. Cooling will stop soon. Please find shade." 🟢 | One-time alert per charge cycle |
| Tarha ≤ 10% | "Battery very low. Cooling is off. Find shade and drink water." | Cooling disabled; monitoring continues |
| Tarha ≤ 3% | "Your tarha is turning off. Charge it tonight." | Tarha shuts down sensor |
| Phone ≤ 15% while monitoring | "Your phone battery is low. TARA may stop watching soon." | Informational |

---

## Flow 13 — Delete Everything

1. Safety → red **Delete Everything** → explanation: "This deletes all your stress data, your name, your family numbers and your settings from this phone. It cannot be undone."
2. **Hold for 3 seconds** (a ring fills; voice counts down). If App Lock is on, phone unlock is required first.
3. App: stops cooling, disconnects and forgets the tarha, cancels all reminders, deletes the encryption key (making any leftover bytes unreadable), deletes the database and all files, clears preferences.
4. Confirmation: "Everything is deleted." → app returns to Flow L as if newly installed.

---

## Flow 14 — My Days (History)

1. **Today:** Calm graph from midnight, blue bands where cooling was on, small bell where alerts fired.
2. **Last 7 days:** one horizontal bar per day showing time in green/yellow/red. Tap a day → that day's graph.
3. Footer: "TARA keeps only the last 7 days." (or the shorter period she chose).
4. Nothing older exists to show.

---

## Flow 15 — Disconnection & Sensor Problems

1. Tarha out of range / off → Home: "Tarha not connected — reconnecting…" (grey meter, no number). Auto-retry with backoff. No alerts from stale data.
2. Reconnected → meter resumes after 5 s of good fit.
3. Sensor fit poor for > 30 s → one gentle voice nudge; then a quiet chip until fixed. No stress alerts while fit is not Good.

---

## Flow 16 — Settings (inside Safety tab)

Language · Speak automatically (on/off) · Cooling: Ask me first / Cool automatically · Cooling length (5/10/15 min) · Alert sensitivity (Fewer / Normal / More — adjusts sustain window) · Recalibrate (Learn your calm) · Reminders · Place labels · App Lock · About & privacy (plain-language explanation + "TARA is a research prototype").

---

## Flow 17 — App Lock

1. If on, opening TARA shows the phone's own unlock (PIN/pattern/fingerprint).
2. Notifications still appear but stay discreet; opening them requires unlock.
3. If the phone has no screen lock set, TARA explains it can't lock without one and offers to open phone settings.

---

## Flow 18 — Demo Mode (judges, testing, no hardware)

1. Entered from Flow 1's "Use demo instead", or a hidden 5-tap on the version number in About.
2. A yellow ribbon on every screen: **"DEMO — not real brain data."**
3. Demo scenarios: **Story** (the 30-second MVP: calm → red → cooling → green, sped up), **Calm day**, **Bad 2 PM week** (pre-fills 7 days so Flow 4 can show a real pattern card), **Low battery**, **Loose sensor**.
4. Demo data is held in memory only and is never mixed with real data. Exiting demo wipes it.

---

## Flow 19 — PMDD-Aware Cooling (opt-in, decision 2026-11-17)

1. Settings → **PMDD-aware cooling**: "Many women feel heat and stress more in the days before their period, especially with PMDD. If you log day 1 of your period, TARA follows your cycle and offers cooling sooner on those days. Only the dates are kept — the last 6 — encrypted on this phone." On / Off (default Off).
2. On: she sets her usual cycle length (21–45 days, default 28). Once real day-1 dates exist, TARA shows "From your dates, your cycle is about N days."
3. Home shows a cycle card: before any date, "Tap the day your period starts, so TARA can follow your cycle." Buttons: **My period started today** · **It started earlier** (Yesterday … 7 days ago).
4. With a date: the phase name (menstrual / follicular / ovulatory / early luteal / late luteal), "Day N of about L", and what TARA does today — late luteal and first menstrual days: "PMDD-aware cooling is on: TARA offers cooling sooner today."; early luteal: "Your body runs a little warmer in this phase, so TARA offers cooling a little sooner."; otherwise "Cooling works as usual today." (`07` §10).
5. The day before the late luteal phase: "Your late luteal days start tomorrow. TARA will offer cooling sooner for about a week." Past the expected day 1: "Your period is later than expected. Tap the button when it starts."
6. Settings → "Not right? I am in my…" + the five phases: today becomes the first day of that phase. **Forget my cycle dates** removes them. Turning it Off keeps the dates; Delete Everything removes them.
7. Nothing about the cycle is ever in a notification. Not available in Try mode (nothing is saved there).

## Flow 20 — Daily Check-in (with PMDD-aware cooling)

1. From 6 PM, once a day, Home shows **"How was today?"** with ▶ voice.
2. Three questions, three answers each (Not at all / A little / A lot): **Low or sad** · **Irritable or tense** · **Body: tired, pain or heavy**.
3. **Save** (enabled once all three are answered) → "Thank you. Saved for today." **Later** hides it until tomorrow. Answering again the same day replaces the answers.
4. My Days shows, for the chosen day, its phase and the three answers. Check-ins follow the same auto-delete as minute data.

---

## 19. Consolidated Edge Cases

- **She says No to Save, then reopens TARA:** starts fresh at Flow L; no trace remains.
- **Two tarhas nearby (e.g., two women working together):** pairing uses the blink-to-identify step; after pairing, TARA only ever connects to its bonded tarha.
- **Phone reboots mid-shift:** Android restarts monitoring when the app is opened; a persistent notification reminds her if the tarha is on but the app isn't watching.
- **Calibration done while stressed:** if the first week's median stress is extremely low or high, Home suggests "Want to learn your calm again?" once.
- **Auto-delete shortened from 7 to 1 day:** data older than 1 day is deleted immediately; pattern detection then has too little data and says so: "I need more days to learn your pattern."
- **Help question appears while she's already cooling:** allowed — very high stress despite cooling is exactly the case.
- **SMS app missing (rare tablets):** "This phone can't send text messages." No fallback that uses the internet.

---

## 20. Open Items
See `02-prd.md` §13. Nothing in this document adds new open items.

---

*End of User Flows. Next: `04-ui-spec.md`.*
