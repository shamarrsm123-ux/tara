# TARA — Visual Design Reference

**Version:** 2.0
**Document:** 04a — Visual Design (supersedes the *visual* parts of `04` §2–3, §9; all behavior, copy, accessibility and safety rules in `04` still apply)
**Status:** Team decision 2026-11-16 (v2 the same day: closer match to the fitness-app reference — white screens, coral, ring meter, line chart, tab bar)
**Depends on:** 04

---

## 0. Intent

TARA should look like a section of a modern, friendly fitness app: **white screens, softly tinted peach / apricot / lemon cards, one coral accent, thin outlined round buttons and chips, a thick ring meter with a dashed inner circle, a smooth line chart with a soft gradient, and a bottom tab bar with a raised round centre button.** The reference is a community fitness-app design (orange-coral on white). We match its *visual language*, not its content or imagery.

The rules from `04` §0–1 still win when they conflict with "looking like the reference": she must understand it in one glance, in bright sun, without reading; every meaning is color + icon/face + word.

## 1. Decisions (2026-11-16)

| # | Decision | Replaces |
|---|---|---|
| D1 | Calm meter = **thick round ring** (round cap) with a thin dashed inner circle; **the filled arc uses the zone color** (green / amber / red), track light grey; face + number + zone word inside | `04` §9.1 ring; v1 segmented arc |
| D2 | **Coral is the action color** (buttons, selection, brand, centre button); **blue only where cooling is happening** (cooling tag, countdown ring, snowflake, cooling band, centre button while cooling) | `04` §3 "Blue = cooling and the main action" |
| D3 | English uses **Plus Jakarta Sans** (SemiBold for headings, Bold only for the Calm number); Arabic and Amharic keep **Noto Sans Arabic / Ethiopic** | `04` §4 Noto everywhere (for Latin only) |
| D4 | Decision cards use a small white **tag** (dot + word) instead of a colored top band | `04` §9.4 band |
| D5 | Live graph = **smooth coral line with a soft gradient fill** (one point per 10 s), dashed guides at the High (30) and Calm (50) thresholds, grey dots where no valid signal, blue band under cooling, latest point ringed in its **zone color** | `04` §9.2 line on colored bands; v1 bars |
| D6 | 🟡 **Bottom tab bar** Home · My Days · Safety (icon + label) with a **raised round coral Cool button** in the centre (label "Cool", accessible name "Cool Around My Head"). It replaces the big Cool pill on Home. While cooling it turns blue and reads "On"; Stop stays on the cooling card. Shown from Home onward **also in Try mode** (team decision 2026-11-16; `03` §0 lists tabs for Daily mode) with Try-mode content: My Days = date strip + today's in-memory graph + "nothing is saved yet" note; Safety = header + retention + No internet rows. Delete Everything, Family, Place and Lock join Safety in Phase 6. | `04` §10 Home "blue Cool Around My Head" button |
| D7 | 🟡 Demo ribbon = **yellow banner** across the top + yellow **"DEMO" badge** in the top-right corner (instead of a diagonal corner ribbon). Still always visible, never dismissible, never dimmed by overlays. | `04` §9.6 diagonal corner ribbon |

## 2. Color tokens (Sun)

| Token | Value | Use |
|---|---|---|
| `bg` / `surface` | `#FFFFFF` | Screen background; white cards (very soft shadow) |
| `tintPeach` / `tintApricot` / `tintLemon` | `#FDF2EE` / `#FEF5EC` / `#FBFAEC` | Flat tinted cards and tiles |
| `chip` | `#F4F4F6` | Chips and inactive pills |
| `line` / `sand` | `#ECECEF` | Hairline borders of outlined buttons, chips, dividers |
| `text` | `#1C1C1E` | Primary text |
| `textMuted` | `#52525B` | Secondary text (≥ 7:1 on white, `04` §3) |
| `accent` | `#EF6A4A` | Coral: primary buttons, selection, brand, centre button (white bold text ≥ 20sp on it) |
| `accentSoft` | `#FDECE7` | Soft coral icon squares |
| `ink` | `#1C1C1E` | Dark pills; `onInk` `#FFFFFF` |
| `calm` / `rising` / `high` | `#1B7F3B` / `#B87900` / `#C62828` | Zones — unchanged from `04` §3 |
| `cool` | `#1565C0` | Cooling only |
| `demo` | `#FFD54F` | Demo banner and badge only |
| `track` | `#F0F0F2` | Empty part of the ring |

Night mirrors these (near-black surfaces, the same hues lightened for contrast); values live in `src/ui/theme/tokens.ts` and are contrast-tested. Red stays reserved for High stress and Delete Everything; coral is visibly orange-red, and High is never shown by color alone (face + word).

## 3. Shape, depth, type

- **Radius:** cards 24, tiles 20, tags 10, buttons fully round (pill), round icon buttons 56 × 56 with a 1px hairline (no shadow).
- **Depth:** white cards and the tab bar get one very soft shadow (`#1C1C1E` 6 %, blur 24, y 8); tinted cards are flat; the primary coral button and centre button get a soft coral glow.
- **Spacing:** 24 screen padding, 16–24 between blocks.
- **Type:** headings and labels SemiBold, body Regular, the Calm number Bold. Sizes from `04` §4 are minimums.

## 4. Components

- **Primary button:** coral pill, 64 tall, white SemiBold label, trailing "→" for "go on" actions, coral glow. Secondary: white pill with hairline border. Destructive: red pill (Delete Everything only).
- **Header:** thin outlined round back button (leading), centred title, outlined round ▶ voice button (trailing). Home uses a greeting row instead: brand avatar or back · "Hello · TARA" + today's date · round connection indicator.
- **Calm meter (D1):** 260 ring, stroke 22, dashed inner circle in the zone color. Not connected / poor fit: empty ring, "—", status word.
- **"Right now" tiles:** three tinted tiles (peach / apricot / lemon) — icon, bold value, muted label (tarha · battery · cooling).
- **Live graph (D5):** section title, chart, start/end time labels.
- **Decision card (D4):** white card, tag on top, question, ▶, coral Yes pill, outlined No pill — same size.
- **Cooling card:** white card, blue "Cooling" tag, blue countdown ring, shade + water icons, +10 min (outlined blue), Stop (outlined).
- **Tab bar (D6):** white, rounded top corners, soft upward shadow; active tab coral, inactive grey.
- **Learn Your Calm:** the same ring filling in coral as progress, breathing circle inside.

## 5. What does not change

Screen order, copy, voice, haptics, RTL, 56dp targets, 130% font scale, the demo label (always visible), and every rule in `04` §5–7, §11–13.
