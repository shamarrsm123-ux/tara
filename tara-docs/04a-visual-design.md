# TARA — Visual Design Reference

**Version:** 1.0
**Document:** 04a — Visual Design (supersedes the *visual* parts of `04` §2–3, §9; all behavior, copy, accessibility and safety rules in `04` still apply)
**Status:** Team decision 2026-11-16
**Depends on:** 04

---

## 0. Intent

TARA should look like it belongs inside a modern, warm, premium mobile app: clean neutral near-white surfaces (no beige — 2026-11-16 revision), big rounded white cards, one confident orange accent, near-black pills and panels, and a **segmented arc meter**. The references are contemporary fitness / nutrition apps (orange + charcoal on neutral light grey). We match their *visual language*, not their content or imagery.

The rules from `04` §0–1 still win when they conflict with "looking like the reference": she must understand it in one glance, in bright sun, without reading; every meaning is color + icon/face + word.

## 1. Decisions (2026-11-16)

| # | Decision | Replaces |
|---|---|---|
| D1 | Calm meter = segmented arc of rounded blocks; **filled segments use the zone color** (green / amber / red), empty segments warm grey | `04` §9.1 ring |
| D2 | **Orange is the action color** (buttons, selection, brand); **blue only where cooling is happening** (cooling card tag, snowflake, cooling band) | `04` §3 "Blue = cooling and the main action" |
| D3 | English uses **Plus Jakarta Sans**; Arabic and Amharic keep **Noto Sans Arabic / Ethiopic** | `04` §4 Noto everywhere (for Latin only) |
| D4 | Decision cards use a colored **tag pill** (dot + word) instead of a colored top band | `04` §9.4 band |
| D5 | Live graph = **rounded bars** (one per 10 s), colored by zone, grey dots where no valid signal, blue band under cooling | `04` §9.2 single line on colored bands |

## 2. Color tokens (Sun)

| Token | Value | Use |
|---|---|---|
| `bg` | `#F5F5F7` | Screen background (neutral near-white) |
| `surface` | `#FFFFFF` | Cards, round icon buttons |
| `chip` | `#EFEFF2` | Chips and inactive pills |
| `text` | `#111114` | Primary text |
| `textMuted` | `#52525B` | Secondary text |
| `accent` | `#E96B10` | Primary buttons, selection, brand (white bold text ≥ 20sp on it) |
| `accentSoft` | `#FFEEE2` | Soft orange chips |
| `ink` | `#18181B` | Dark pills, stat panel, bottom bar; `onInk` `#FFFFFF` |
| `calm` / `rising` / `high` | `#1B7F3B` / `#B87900` / `#C62828` | Zones — unchanged from `04` §3 |
| `cool` | `#1565C0` | Cooling only |
| `demo` | `#FFD54F` | Demo ribbon only |
| `track` | `#E5E5EA` | Empty meter segments, graph track |

Night mirrors these (dark warm surfaces, same accent and zone hues lightened for contrast); values live in `src/ui/theme/tokens.ts` and are contrast-tested. Red stays reserved for High stress and Delete Everything.

## 3. Shape, depth, type

- **Radius:** cards 28, buttons & chips fully round (pill), round icon buttons 56 × 56.
- **Depth:** one soft shadow (`#000` 6–8 %, blur 18, y 6); no borders on cards.
- **Spacing:** 24 screen padding, 16 between blocks, 12 inside chips.
- **Type:** big, bold numbers (the meter number is the hero). Sizes from `04` §4 are minimums; headlines 30–34 bold, card titles 22 bold.

## 4. Components

- **Primary button:** orange pill, 64 tall, white bold label; dark round "→" badge at the leading edge (the "Start Ride" pattern). Secondary: white pill, or `ink` pill. Destructive: red pill (Delete Everything only).
- **Round icon button:** white circle with shadow (back, ▶ voice).
- **Chips / tags:** pill, `chip` background, dot + word for status (Good / Adjust / No contact; High stress; Cooling).
- **Calm meter (D1):** 11 rounded blocks on a ~220° arc; filled count = Calm %; inside: zone face, big number + %, zone word in zone color. Not connected: all blocks empty, "—", status word.
- **Stat panel:** `ink` rounded panel with 3 columns — icon, bold value, small muted label (tarha · battery · cooling).
- **Live graph (D5):** white card, title, rounded bars, time labels at the ends.
- **Decision card (D4):** white card, tag pill on top, question, ▶, orange Yes pill, outlined No pill — same size.
- **Cooling card:** white card, blue "Cooling" tag, countdown ring in blue, shade + water icons, Stop (outlined pill), +10 min (outlined).
- **Learn Your Calm:** the same segmented arc filling in orange as progress, breathing circle inside.

## 5. What does not change

Screen order, copy, voice, haptics, RTL, 56dp targets, 130% font scale, the demo ribbon (always visible), and every rule in `04` §5–7, §11–13.
