# TARA — State Machines & Invariants

**Version:** 1.0
**Document:** 11 — State & Invariants
**Status:** Ready
**Depends on:** 03, 05, 07, 09, 10

---

## 0. Purpose

Assembles the behavior spread across `03` and `07` into formal state machines an implementer can code directly, and lists the invariants that must hold at all times. Invents nothing.

---

## 1. App Lifecycle

States: `fresh` → `trying` → (`setUp` | `fresh`) ; `setUp` → `wiping` → `fresh`

| From | To | Trigger | Effects |
|---|---|---|---|
| `fresh` | `trying` | Language chosen | In-memory session only; store not created |
| `trying` | `setUp` | Screen 5 "Yes" | Key + encrypted DB created; baseline, language, prefs written |
| `trying` | `fresh` | Screen 5 "No", or app killed before Yes | Memory cleared; tarha unpaired |
| `setUp` | `wiping` | Delete Everything confirmed | Writes blocked (`WIPING`) |
| `wiping` | `fresh` | Wipe complete | Key, DB, prefs, schedules, bond all gone |

Invalid: `trying → wiping` (nothing to wipe; just reset), any persistence while `fresh`/`trying`.

---

## 2. Connection

`disconnected` → `scanning` → `connecting` → `connected` → `disconnected`

- While not `connected`: Calm shown as "—", engine receives `valid:false`, no alerts generated, cooling buttons disabled with reason.
- On `connected`: 5 s of Good fit required before Calm displays again.

---

## 3. Stress Episode & Prompt (engine)

**Episode states:** `none` → `pending` (S ≥ 70, counting sustain window) → `high` → `none`

| From | To | Condition |
|---|---|---|
| `none` | `pending` | Valid S ≥ 70 |
| `pending` | `none` | S < 70 before window W completes |
| `pending` | `high` | W elapsed with ≥ 80% valid seconds ≥ 70 → log `high_episode_start` |
| `high` | `none` | S ≤ 55 for 60 s, or 10 min no valid signal → log `high_episode_end` |

**Prompt states:** `idle` → `showing` → (`answeredYes` | `answeredNo`) → `cooldown` → `idle`

| From | To | Condition / Effect |
|---|---|---|
| `idle` | `showing` | Episode → `high` AND cooling off AND not muted AND no prompt-cooldown AND not in post-cooling quiet |
| `idle` | `showing` | ✅ *(2026-11-16)* Episode still `high` when the cooldown / quiet / mute ends — see `07` §5.2 |
| `showing` | `answeredYes` | Yes → emit `coolOn(reason: prompt)` |
| `showing` | `answeredNo` | No → noCount++ ; if noCount == 3 → `askAlertLess` |
| `answeredYes/No` | `cooldown` | Immediately |
| `cooldown` | `idle` | 15 min elapsed (and, if cooling ran, 10 min after it ended) |

In `auto` mode: `idle → cooldown` directly with `coolOn(reason: auto)`, gated by the 30-min auto gap.

---

## 4. Cooling (mirrors tarha `status`)

`off` → `starting` → `on` → `off`; plus `locked_battery`, `locked_rest`, `fault`.

| From | To | Trigger |
|---|---|---|
| `off` | `starting` | `coolOn` sent |
| `starting` | `on` | Status notification `cooling=1` (≤ 2 s) |
| `starting` | `off` | No confirmation in 2 s → show "Couldn't start cooling" |
| `on` | `off` | User stop, timer end, disconnect |
| `on` | `locked_rest` | 20 min continuous reached (firmware) |
| any | `locked_battery` | Battery ≤ 10% |
| `locked_rest` | `off` | 5 min elapsed |

The app **never** displays `on` without a status confirmation.

---

## 5. Help Question

`idle` → `asking` → (`declined` → `cooldown`) | (`choosingContact` → `choosingPlace` → `preview` → `composerOpened`) → `cooldown` → `idle`

- Entry from engine (`askHelp`) or manual Help button.
- `cooldown` = 60 min for engine-initiated questions; manual Help is never blocked.
- Nothing outbound happens before `composerOpened`, and the composer itself requires her Send.

---

## 6. Pattern Lifecycle

`(none)` → `offered` → `accepted` | `declined`; `accepted` → `faded`; `declined` → (re-offer after 7 days) `offered`

| From | To | Effect |
|---|---|---|
| — | `offered` | Detection finds pattern; card shown once |
| `offered` | `accepted` | Schedule daily reminder at pattern − 30 min |
| `offered` | `declined` | `declined_until = now + 7 days` |
| `accepted` | `faded` | < 2 matching days in window → cancel reminder; show "gone lately" card once |
| `accepted` | (deleted) | Retention shortened so pattern unsupported → same as `faded` |

---

## 7. Data Retention

For every row in `minute_summary` and `event`: `ts ≥ now − retention_days`. Rows outside are deleted at the next retention run (start / hourly / midnight / setting change). Maximum lag: 1 hour while app is running; at next launch otherwise.

---

## 8. Invariants (must always hold)

1. **No persistence before consent:** while lifecycle ∈ {`fresh`, `trying`}, the encrypted DB and key do not exist.
2. **No demo data on disk:** no persisted row originates from a `demo` sample.
3. **Retention ceiling:** `settings.retention_days ≤ 7`, and no time-series row is older than `retention_days` + 1 hour (app running).
4. **No raw or per-second brain data on disk**, ever.
5. **No outbound data without a user Send:** the only outbound channel is the SMS composer, reachable only from the help preview.
6. **No location read:** zero calls to any location API in the codebase.
7. **Cooling bounded:** cooling never runs > 20 min continuous, never when battery ≤ 10% (enforced by app and firmware).
8. **One prompt at a time:** at most one High-stress prompt visible; at most one help question visible.
9. **No alerts from invalid signal:** prompts and help questions are only generated from valid (Good-fit) data.
10. **Calm direction:** every user-visible number is Calm (higher = calmer); stress index is never displayed.
11. **Wipe completeness:** after `wiping → fresh`, the app data directory contains no files created by the app and the keystore holds no TARA key.

---

*End of State & Invariants. Next: `12-testing-verification.md`.*
