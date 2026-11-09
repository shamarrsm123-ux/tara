# TARA — Module Contracts

**Version:** 1.0
**Document:** 09 — Module Contracts (the equivalent of Nexus's API contracts)
**Status:** Ready
**Depends on:** 05, 06, 07, 08

---

## 0. Purpose

Nexus's `09` defined HTTP endpoints. TARA's equivalent boundaries are **internal TypeScript interfaces** between modules. This document fixes their shapes so the implementer never invents one. Nothing here adds product behavior.

Conventions: all functions are async unless marked; errors are thrown as typed `TaraError` with a `code` from §9; time comes from an injected `Clock`.

---

## 1. Shared Types

```ts
type Lang = 'ar_EG' | 'am_ET' | 'en';
type Zone = 'calm' | 'rising' | 'high' | 'unknown';
type SourceKind = 'tarha' | 'demo';

interface Clock { nowMs(): number; monotonicMs(): number; }

interface MetricsSample {
  source: SourceKind;          // travels with every sample; demo never persisted
  seq: number;
  theta: number; alpha: number; beta: number;
  fit: number;                 // 0–100
  skinTempC: number | null;
  motion: boolean; saturated: boolean;
  receivedAtMono: number;
}

interface TarhaStatus {
  batteryPct: number;
  cooling: 'off' | 'on' | 'locked_battery' | 'locked_rest' | 'fault';
  coolingRemainingS: number;
  faults: number;
}
```

---

## 2. `TarhaSource` (implemented by `ble/` and `demo/`)

```ts
interface TarhaSource {
  kind: SourceKind;
  scan(timeoutMs: number): Promise<FoundTarha[]>;       // demo returns one fake
  blink(id: string): Promise<void>;
  connect(id: string): Promise<void>;                   // requires bonded, encrypted link
  disconnect(): Promise<void>;
  forget(): Promise<void>;                              // remove bond + paired_tarha row
  onMetrics(cb: (s: MetricsSample) => void): Unsubscribe;
  onStatus(cb: (s: TarhaStatus) => void): Unsubscribe;
  onConnection(cb: (state: 'connected' | 'connecting' | 'disconnected') => void): Unsubscribe;
  coolOn(durationS: number): Promise<void>;             // resolves when tarha ACKs; state confirmed via onStatus
  coolOff(): Promise<void>;
}
```
Rules: `connect` refuses unencrypted links (`BLE_INSECURE_LINK`). `coolOn` with duration > 1200 throws `VALIDATION_ERROR`. Reconnect with backoff 2s → 4s → 8s → … max 60s.

---

## 3. `signal/` (pure, synchronous)

```ts
function decodeMetrics(bytes: Uint8Array, source: SourceKind, mono: number): MetricsSample | PacketError;
function fitLevel(s: MetricsSample): 'good' | 'adjust' | 'none';
function isValid(s: MetricsSample): boolean;

interface Baseline { m: number; s: number; isDefault: boolean; }
class StressComputer {
  constructor(baseline: Baseline, clock: Clock);
  push(sample: MetricsSample): { stress: number | null; calm: number | null; zone: Zone };
}
class Calibrator {
  push(sample: MetricsSample): { progress: number /*0–1*/; paused: boolean };
  result(): Baseline;            // throws CALIBRATION_INCOMPLETE if < 60 valid s
}
```

---

## 4. `engine/` (pure, deterministic state machine)

```ts
type EngineInput =
  | { t: 'tick'; calm: number | null; zone: Zone; valid: boolean }
  | { t: 'status'; status: TarhaStatus; connected: boolean }
  | { t: 'promptAnswer'; yes: boolean }
  | { t: 'helpAnswer'; yes: boolean }
  | { t: 'userCool'; on: boolean } | { t: 'extendCooling' }
  | { t: 'mute'; untilMs: number | null }
  | { t: 'phoneBattery'; pct: number }
  | { t: 'settings'; settings: Settings };

type EngineAction =
  | { a: 'showPrompt' } | { a: 'hidePrompt' }
  | { a: 'coolOn'; durationS: number; reason: 'manual' | 'prompt' | 'auto' }
  | { a: 'coolOff'; reason: 'user' | 'timer' | 'rest' }
  | { a: 'askHelp' }
  | { a: 'askAlertLess' }
  | { a: 'notify'; kind: NotifyKind }
  | { a: 'logEvent'; type: EventType; source?: string }
  | { a: 'speak'; line: VoiceLineId }
  | { a: 'haptic'; pattern: HapticPattern };

interface Engine {
  step(input: EngineInput, nowMono: number): EngineAction[];
  snapshot(): EngineState;      // for UI selectors, read-only
}
```
**The engine is the only producer of prompts, help questions and automatic cooling.** UI may only dispatch inputs. Every rule in `07` §5 and every transition in `11` §2–3 is implemented here.

🟡 *Phase 2 additions: `coolOff.reason` also allows `'battery'`; `NotifyKind` adds `'batteryOff'` (≤ 3% alert, `07` §7). `createEngine(clock, settings)` uses `nowMono` for every timer and the clock's wall time only to bucket per-day counters (3 No's/day, phone-battery alert/day). `mute.untilMs` is on the same monotonic timeline as `nowMono`. `snapshot()` returns `EngineSnapshot` (episode, prompt/help visibility, cooling display, block reason, extend availability, mute, connection, battery).*

---

## 5. `patterns/` (pure)

```ts
interface PatternResult {
  usableDays: number;
  patterns: Array<{ patternMin: number; reminderMin: number; matchingDays: number }>;
  needMoreDays: boolean;
}
function detectPatterns(events: EventRow[], minutes: MinuteRow[], todayLocal: Date): PatternResult;
```
Implements `07` §6 exactly, including the worked example as a unit test.

---

## 6. `store/` (the only module touching disk)

```ts
interface Store {
  isSetUp(): Promise<boolean>;
  createFromTrySession(input: { lang: Lang; baseline: Baseline; prefs: Partial<Settings> }): Promise<void>; // creates key + DB
  getProfile(): Promise<Profile>; setDisplayName(n: string | null): Promise<void>; setAgeGroup(g: AgeGroup | null): Promise<void>;
  getSettings(): Promise<Settings>; updateSettings(p: Partial<Settings>): Promise<void>;  // retention > 7 → VALIDATION_ERROR
  getBaseline(): Promise<Baseline>; replaceBaseline(b: Baseline): Promise<void>;
  appendMinute(row: MinuteRow): Promise<void>;            // rejects source === 'demo'
  appendEvent(e: EventRow): Promise<void>;                // rejects source === 'demo'
  queryMinutes(fromMs: number, toMs: number): Promise<MinuteRow[]>;
  queryEvents(fromMs: number, toMs: number): Promise<EventRow[]>;
  getPatterns(): Promise<PatternRow[]>; savePatterns(p: PatternRow[]): Promise<void>;
  listContacts(): Promise<Contact[]>; addContact(c: NewContact): Promise<Contact>; removeContact(id: number): Promise<void>; // >3 → CONTACT_LIMIT
  setPairedTarha(t: PairedTarha | null): Promise<void>;
  runRetention(): Promise<{ deletedRows: number }>;
  wipeEverything(): Promise<void>;                        // ordering in 05 §4; idempotent
}
```
All writes go through one serialized queue. `wipeEverything` sets a global `wiping` flag that makes every other write reject with `WIPING`.

---

## 7. `notify/`

```ts
interface Notifier {
  startMonitoringService(): Promise<void>;   // Android foreground service, discreet text
  stopMonitoringService(): Promise<void>;
  show(kind: NotifyKind): Promise<void>;     // text always from discreet lock-screen set
  scheduleDailyReminder(minuteOfDay: number): Promise<string>;  // returns OS id
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
}
type NotifyKind = 'coolBreak' | 'reminder' | 'batteryLow' | 'batteryLock' | 'phoneBatteryLow' | 'helpQuestion';
```
Lock-screen text for every kind is neutral (e.g., `helpQuestion` → "TARA: please open the app").

---

## 8. `sos/`

```ts
interface Sos {
  buildMessage(input: { name: string | null; place: PlaceLabel | null; lang: Lang }): string;
  openComposer(contact: Contact, message: string): Promise<'opened' | 'unavailable'>; // expo-sms; never sends itself
}
type PlaceLabel = 'in_field' | 'at_home' | 'at_market' | 'on_road';
```
`openComposer` must never be invoked except as the direct result of her tapping **Send** on the preview screen (enforced by the UI flow and by a test that the engine never emits it).

---

## 9. Error Codes

```text
BLE_UNAVAILABLE        BLE_PERMISSION_DENIED   BLE_NOT_FOUND
BLE_INSECURE_LINK      BLE_DISCONNECTED        BLE_PROTOCOL_VERSION
PACKET_INVALID         CALIBRATION_INCOMPLETE  COOLING_LOCKED_BATTERY
COOLING_LOCKED_REST    STORE_LOCKED            STORE_CORRUPT
WIPING                 CONTACT_LIMIT           VALIDATION_ERROR
SMS_UNAVAILABLE        APP_LOCK_UNAVAILABLE
```
Each maps to a voiced, plain-language message in all three languages. Raw error text is never shown to her.

---

## 10. Explicitly Not Interfaces

No `fetch` wrapper, no HTTP client, no `uploadX`, no `syncX`, no `getLocation`, no generic `updateRow(table, …)`, no method that sends SMS without the composer, no method that writes demo samples.

---

*End of Module Contracts. Next: `10-privacy-security-model.md`.*
