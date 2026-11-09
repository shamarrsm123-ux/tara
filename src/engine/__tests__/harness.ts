// Test rig: drives the engine with a fake clock, one tick per second (12 §2.2).
import { createEngine, type Engine } from '../engine';
import type { EngineAction, EngineInput } from '../types';
import { DEFAULT_SETTINGS, type Settings, type TarhaCooling, type Zone } from '../../shared/types';
import { zoneForStress } from '../../signal/stress';

export const SEC = 1000;
export const MIN = 60 * SEC;
const WALL_START = Date.UTC(2026, 10, 9, 8, 0);
const DAY_MS = 24 * 60 * MIN;

export const CALM_HIGH = 20; // S = 80
export const CALM_VERY_HIGH = 10; // S = 90
export const CALM_OK = 60; // S = 40

export const zoneOf = (calm: number): Zone => zoneForStress(100 - calm);

export class Rig {
  mono = 0;
  wallDays = 0;
  readonly engine: Engine;
  readonly log: EngineAction[] = [];

  constructor(settings: Partial<Settings> = {}) {
    this.engine = createEngine(
      { nowMs: () => WALL_START + this.wallDays * DAY_MS + this.mono, monotonicMs: () => this.mono },
      { ...DEFAULT_SETTINGS, ...settings },
    );
  }

  send(input: EngineInput): EngineAction[] {
    const actions = this.engine.step(input, this.mono);
    this.log.push(...actions);
    return actions;
  }

  status(cooling: TarhaCooling = 'off', batteryPct = 80, connected = true): EngineAction[] {
    return this.send({ t: 'status', status: { batteryPct, cooling, coolingRemainingS: 0, faults: 0 }, connected });
  }

  /** Sends `seconds` ticks, one per second, starting at the current time. */
  ticks(seconds: number, calm: number | null | ((i: number) => number | null)): EngineAction[] {
    const out: EngineAction[] = [];
    for (let i = 0; i < seconds; i += 1) {
      const c = typeof calm === 'function' ? calm(i) : calm;
      out.push(...this.send(c === null ? { t: 'tick', calm: null, zone: 'unknown', valid: false } : { t: 'tick', calm: c, zone: zoneOf(c), valid: true }));
      this.mono += SEC;
    }
    return out;
  }

  advance(ms: number): void {
    this.mono += ms;
  }

  /** Puts the engine into a confirmed cooling session. */
  coolingOn(): EngineAction[] {
    const asked = this.send({ t: 'userCool', on: true });
    return [...asked, ...this.status('on')];
  }
}

export const has = (actions: readonly EngineAction[], kind: EngineAction['a']) => actions.some((a) => a.a === kind);
export const count = (actions: readonly EngineAction[], kind: EngineAction['a']) => actions.filter((a) => a.a === kind).length;
export const events = (actions: readonly EngineAction[]) => actions.flatMap((a) => (a.a === 'logEvent' ? [a.type] : []));
