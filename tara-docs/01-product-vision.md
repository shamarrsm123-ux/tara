# TARA — Product Vision

**Version:** 1.0
**Document:** 01 — Product Vision
**Status:** Ready — foundational, canonical
**Depends on:** None — root document. Every later document (`02`–`13`) traces back to this one.
**Research basis:** the team's "Scientific Research" notes (hypothalamus & thermoregulation, head-cooling + cognition, in-ear EEG stress classification, HRV alternatives). Claims in this set are deliberately limited to what those sources support.

---

## Executive Summary

TARA is a smart cooling headscarf (tarha) and a companion **mobile app** for women aged 18–50 who do long shifts of outdoor farm work in extreme heat — around 40°C (104°F) — in Egypt and Ethiopia.

A small sensor, about the size of a lentil, sits on the thin, hairless skin behind the ear, held in place by the scarf. It listens to brain activity associated with stress. When her stress rises past her own personal level, cooling pads around her head switch on and her phone tells her, by sound, vibration and a simple screen, to take a cool break. Over a week, the app learns when her stress tends to rise (for example, around 2 p.m. every day) and reminds her 30 minutes beforehand to put the tarha on early.

The research question behind TARA is whether extreme heat worsens symptoms of PMDD (premenstrual dysphoric disorder). The product question is simpler: **can a familiar garment help a woman in the heat stay cool, calm and in control, without asking her to give up her privacy?**

---

## The Core Observation

Women farm workers in hot regions work for hours in direct sun, often without breaks they control, shade, or tools designed for them. Heat makes people physically uncomfortable and tired, and heat stress affects how people think and feel. Most "smart" health products are built for office workers with fast internet, new phones and high literacy — and most of them send intimate data to a company's servers.

TARA starts from the opposite direction: an object she already wears, an app that works with no internet, and data that never leaves her phone.

---

## Vision Statement

A tarha that keeps her head cool, notices when she's overwhelmed, and keeps her mind's data hers.

## Mission

Help women who work in extreme heat stay cooler, calmer and safer through a familiar garment — with mental privacy built in from the first line of code.

---

## Product Philosophy

Every feature must pass one question:

> **Does this help her stay cool and safe, without asking her to trust us with her mind?**

If a feature needs the cloud, an account, her exact location, or her reading ability to work, it does not belong in TARA as currently designed.

---

## The Five Principles

1. **Her body, her data.** Brain data is processed on her phone, stored encrypted, and deleted automatically within 7 days. There is no TARA server. Nothing is uploaded, ever.
2. **She decides.** Cooling she can stop with one tap. Reminders she agrees to. Help requests she approves every single time. Nothing about her is sent anywhere without her pressing a button.
3. **Works in the field.** No internet. Old Android phones. Bright sun. Busy hands. Low or no literacy. Every screen has a picture, a color, a sound and a voice.
4. **Familiar, not medical.** It's a tarha, not a device. It never diagnoses, never mentions PMDD to her, never claims to treat anything.
5. **Honest science.** TARA measures a *relative* stress signal compared with her own calm baseline. It is a research prototype, not a clinically proven product.

---

## What TARA Is NOT

- **TARA is not a medical device.** It doesn't diagnose PMDD, anxiety or any condition, and it doesn't replace a doctor.
- **TARA is not a tracker.** It never asks for location permission (see `10-privacy-security-model.md` for the one Android exception and how it's handled). It never tracks where she goes.
- **TARA is not a cloud service.** No accounts, no login, no sync, no analytics, no ads.
- **TARA is not a mind reader.** It reads one relative signal — "more stressed than her normal" — not thoughts, feelings or intentions.
- **TARA is not a surveillance tool for employers or family.** Nobody can see her data except on her own phone, and she can lock the app.

---

## The Core Loop

```
Wear tarha → Sensor reads stress → Stress rises above HER normal → Cooling + gentle alert → She calms → Day continues
```

And a slower, learning loop on top:

```
7 days of patterns → "You often feel stressed around 2 PM" → She agrees → Reminder at 1:30 PM → She wears TARA early
```

---

## Who TARA Is For

- Women aged 18 to 50.
- Working outdoors in agriculture in Egypt and Ethiopia, often in 35–45°C heat.
- Likely using a shared or low-cost Android phone, often without mobile data.
- Speaking Egyptian Arabic or Amharic; may have limited reading ability.
- Hands often busy or dirty; phone often in a pocket or bag.

---

## How We Describe TARA (to judges and partners)

> TARA is a wearable thermal-comfort and BrainTech research concept. It combines a light-coloured, breathable tarha and cooling pads with an EEG sensor behind the ear, and a phone app that processes all brain data locally to protect mental privacy.

**Research objective:** investigate whether an accessible cooling wearable can improve thermal comfort and help maintain calm in hot conditions, while collecting stress-related physiological data under the wearer's control.

**Required honesty statements** (must appear in the demo and pitch materials):
- "All EEG data is processed locally on the phone to protect mental privacy."
- "SOS shares a general place only, with opt-in consent, and she approves each time."
- "TARA is a research prototype. It does not diagnose or treat PMDD or any medical condition."

---

## Success Metric

The primary measure of TARA as a prototype is not downloads. It is:

> **Cool breaks taken when she needed them** — a high-stress moment that was followed by cooling or a break, with her stress returning toward her own normal.

Supporting measures: comfort ratings in testing, false-alert rate, how often she stops cooling early (a sign the alert was wrong), and whether a demo can run end-to-end with the phone in airplane mode.

---

## Long-Term Identity

TARA should become the example people point to when they ask: *"Can neurotechnology help people without taking their privacy?"* The answer TARA gives is yes — by keeping the brain's data in the hands of the person whose brain it is.

---

*End of Product Vision. Next document: `02-prd.md`.*
