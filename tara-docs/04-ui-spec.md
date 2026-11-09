# TARA — UI Specification

**Version:** 1.0
**Document:** 04 — UI Spec
**Status:** Ready
**Depends on:** 01-product-vision.md, 02-prd.md, 03-user-flows.md

---

## 0. Design Context — Why TARA Doesn't Look Like a Typical App

Nexus-style apps assume a student indoors, reading English, on a new phone. TARA's wearer is outside in 40°C sun, may not read, may have dusty hands, and may glance at the phone for one second while working. Every rule below follows from that.

**Design question for every screen:** *Could she understand this in one glance, in bright sun, without reading?*

---

## 1. Design Philosophy

- **Familiar and warm**, like fabric and earth — not clinical, not "techy".
- **Calm**: soft shapes, slow gentle motion; nothing flashes or alarms unnecessarily.
- **Clear in the sun**: high contrast, big type, thick shapes.
- **Every meaning three ways**: color + icon/face + word (and voice where it matters).

**Inspiration, blended:** the softness of a headscarf (rounded shapes, gentle curves), the clarity of road signs (one symbol, one meaning), and the reassurance of a health app that doesn't feel medical.

---

## 2. Themes

🔁 *Different choice from Nexus (dark-only): TARA defaults to a light, high-contrast "Sun" theme because dark UI is hard to read in direct sunlight and on cheap LCD screens.*

- **Sun (default):** warm off-white background, near-black text, saturated status colors.
- **Night (optional, auto at night if she enables it):** dark warm brown background, cream text — for indoor/evening use.

---

## 3. Color

| Token | Sun theme | Role |
|---|---|---|
| `bg` | `#FBF7F0` (warm off-white) | Background |
| `surface` | `#FFFFFF` | Cards |
| `text` | `#1A1714` | Primary text (contrast ≥ 15:1) |
| `text-muted` | `#5A524A` | Secondary text (≥ 7:1) |
| `sand` | `#E9DCC6` | Tarha-inspired accent, dividers, illustration |
| `calm` | `#1B7F3B` (green) | Calm zone |
| `rising` | `#B87900` (amber, dark enough for text) | Rising zone |
| `high` | `#C62828` (red) | High-stress zone, destructive |
| `cool` | `#1565C0` (blue) | Cooling, primary action |
| `demo` | `#FFD54F` | Demo ribbon only |

Rules:
- **Blue = cooling and the main action.** Red is reserved for High stress and Delete Everything — never for decoration.
- Status colors always come with a face icon and a word (color-blind safe).
- All text/background pairs meet WCAG AA at minimum; key numbers meet AAA.

Night theme tokens mirror these with adjusted lightness; defined in code.

---

## 4. Typography

- **Arabic:** Noto Sans Arabic (or Cairo). **Amharic:** Noto Sans Ethiopic. **English:** Noto Sans. One family keeps glyph height consistent across scripts.
- Sizes (sp): Calm number 72 · Screen title 28 · Body 20 · Button 22 · Small/caption 16 (minimum anywhere).
- Numbers use the user's locale digits where appropriate (Eastern Arabic numerals optional in Arabic — follow phone setting).
- Sentence length: aim ≤ 12 words per sentence; one idea per line.

---

## 5. Layout & Touch

- Minimum touch target **56×56dp**; primary buttons full-width, 64dp tall.
- Primary action at the **bottom**, reachable with a thumb.
- Max two buttons per decision (Yes / No). Yes is filled, No is outlined — same size, so No is never "hidden".
- Full RTL mirroring for Arabic (graphs keep time flowing in the reading direction; verify with Arabic testers 🟡).
- Generous spacing; no screen requires scrolling to reach its main action on a 5.5" phone.

---

## 6. Voice & Sound

- ▶ speaker button top-corner of every screen with a voice line.
- Voice auto-plays on first view if "Speak automatically" is on.
- Recorded by native speakers in Egyptian Arabic and Amharic, warm and calm in tone (like an older sister, not a doctor).
- Sounds: soft chime for reminders; a lower two-tone for High-stress alert; no harsh alarms.

## 7. Haptics (so she needn't look)

| Event | Pattern |
|---|---|
| Rising (only if "More" sensitivity) | short-short |
| High-stress prompt | long-long |
| Cooling started | single short |
| Reminder | short-long |
| Battery low | three short |

---

## 8. Iconography & Illustration

- Custom illustrations of a woman in a light tarha; skin tones and tarha styles representative of rural Egypt and Ethiopia. Respectful, not exoticized; reviewed by people from the communities 🟡.
- Face icons for zones: calm (soft smile), rising (neutral), high (worried brow) — simple line faces, not emoji.
- Icon set: tarha, ear+dot (sensor), snowflake/wave (cooling), shield (privacy), phone-no-signal (offline), family (contacts), help (hand), battery, sun/shade, water cup.

---

## 9. Key Components

### 9.1 Calm Meter
- Thick circular ring (stroke ~18dp) filled to the Calm %, colored by zone; face icon inside above the big number; zone word below.
- Animates smoothly (≤ 1 change/second; easing 400ms) — never jittery.
- Disconnected / poor fit: grey ring, "—" instead of number, status word ("Not connected" / "Adjust sensor").

### 9.2 Live Graph
- Last 10 minutes on Home; whole day on My Days.
- Background horizontal bands in pale green / pale amber / pale red; a single thick line.
- Blue shaded band where cooling was on.
- No axes text beyond a few time labels; no gridlines.

### 9.3 Sensor Fit Chip
Pill at top of Home/Connect: green dot "Good", amber "Adjust", red "No contact".

### 9.4 Decision Card (Screens 3, 4, 5, 6, Help)
Full-width card, question in 24sp, illustration, ▶, two buttons. Colored top band matching context (red for high stress, blue for cooling, sand for neutral).

### 9.5 Hold-to-Confirm Button
Used only for Delete Everything. A ring fills over 3 seconds with voice countdown; release early cancels. Prevents accidental taps with dusty or busy hands.

### 9.6 Demo Ribbon
Yellow diagonal ribbon top-right + bar under status bar: "DEMO — not real brain data". Cannot be hidden while demo is active.

---

## 10. Screen Specs (aligned to `03`)

**L — Language:** three stacked cards (64dp tall), native script large, ▶ on each. Continue at bottom.

**0 — Welcome:** top half illustration with glowing sensor dot; title; 4 icon rows; small disclaimer line; full-width blue **Try to Calm Your Brain**.

**1 — Connect:** looping fit animation (top); instruction text; **Connect** button; after connection the animation is replaced by the live graph + fit chip; **Next** enabled at Good fit.

**1b — Learn Your Calm:** large breathing circle (expands on inhale 4s, contracts on exhale 6s) with progress ring around it; ▶; small Skip link.

**2 — Home:** top bar (tarha connection + battery + cooling icon); Calm meter (center, ~45% of screen height); graph; blue **Cool Around My Head**; small Help and Mute icons. Bottom tabs: Home · My Days · Safety (icon + label, 64dp).

**3 — Action:** full-screen decision card with red band. After Yes: transforms in place to a blue "Cooling is on" card with countdown ring, shade + water mini-illustrations, Stop Cooling (outlined).

**4 — Smart:** week strip (7 small columns, dot at the pattern time); question; Yes/No; then calm confirmation with green meter.

**5 — Save:** decision card; on Yes, a single text field (large) + Skip; then age range as four large chips in a 2×2 grid (18–25, 26–35, 36–50, Skip).

**6 — Privacy & Safety:** shield header with the "processed on your phone only" sentence; list rows with icons and status values; red Delete Everything at the bottom of the privacy group; then Family, Place, Lock as optional cards with Yes/No.

**My Days:** today's graph; 7 day-bars underneath; footer about retention.

**Help:** decision card → contact chooser (large name chips) → place chooser (chips) → message preview in a speech-bubble → **Open messages to send**.

---

## 11. Motion

- Motion rewards and reassures; it never delays. Transitions ≤ 300ms.
- Cooling start: a gentle blue "breeze" ripple around the tarha icon (1s, once).
- Returning to Calm zone: ring color crossfades to green + soft chime. No confetti — this is relief, not celebration. 🔁 *Deliberately unlike Nexus's confetti moment.*
- Respect the phone's "reduce motion" setting.

---

## 12. Copy Rules

- Speak to her as "you"; TARA speaks as "I".
- Never: "abnormal", "disorder", "PMDD", "symptoms", "diagnosis", "brain scan", "mind reading".
- Prefer: "stress", "calm", "cool break", "your tarha", "your phone".
- Every privacy statement must be literally true of the build (checked in `12` §4).
- Lock-screen texts are always neutral (`02` §8.13).

---

## 13. Platform

React Native mobile app (Android first, iOS second) — see `06`. Portrait only. Supports Android font scaling up to 130% without layout break.

---

*End of UI Spec. Next: `05-data-model.md`.*
