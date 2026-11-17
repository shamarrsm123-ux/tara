// Flow 1 connection steps (03 Flow 1 step 4, 10 §4): explain → permission → 10 s scan → connect one / choose among
// several (Blink) / none found. With no Bluetooth (web preview) the scan simply finds nothing, so "Use demo instead"
// is offered — the same honest path as a phone with no tarha nearby.
import { useState } from 'react';
import type { Bluetooth } from '../ble/createTarhaSource';
import { SCAN_TIMEOUT_S } from '../engine/constants';
import type { FoundTarha } from '../shared/tarhaSource';
import type { ConnectPhase } from '../ui/screens/ConnectScreen';

const MS_PER_S = 1000;

export interface ConnectFlow {
  phase: ConnectPhase;
  found: readonly FoundTarha[];
  needsLocationText: boolean;
  start(): void;
  allow(): void;
  blink(id: string): void;
  choose(id: string): void;
  setPhase(phase: ConnectPhase): void;
}

/** `connectTo` creates the runtime for the chosen tarha and connects it; it rejects when that fails. */
export function useConnect(bluetooth: Bluetooth | null, connectTo: (tarha: FoundTarha) => Promise<void>): ConnectFlow {
  const [phase, setPhase] = useState<ConnectPhase>('idle');
  const [found, setFound] = useState<readonly FoundTarha[]>([]);

  const choose = (id: string) => {
    const tarha = found.find((f) => f.id === id) ?? { id, name: id };
    setPhase('searching');
    connectTo(tarha).then(
      () => setPhase('connected'),
      () => setPhase('notFound'),
    );
  };

  const scan = async () => {
    if (bluetooth === null) {
      setPhase('notFound');
      return;
    }
    if (!(await bluetooth.requestPermission())) {
      setPhase('denied');
      return;
    }
    const list = await bluetooth.source.scan(SCAN_TIMEOUT_S * MS_PER_S).catch(() => []);
    setFound(list);
    const [only] = list;
    if (list.length === 0 || only === undefined) setPhase('notFound');
    else if (list.length === 1) {
      setPhase('searching');
      connectTo(only).then(
        () => setPhase('connected'),
        () => setPhase('notFound'),
      );
    } else setPhase('choose');
  };

  return {
    phase,
    found,
    needsLocationText: bluetooth?.needsLocationExplanation ?? false,
    start: () => {
      if (bluetooth === null) {
        setPhase('searching');
        void scan();
      } else setPhase('explain');
    },
    allow: () => {
      setPhase('searching');
      void scan();
    },
    blink: (id) => void bluetooth?.source.blink(id).catch(() => undefined),
    choose,
    setPhase,
  };
}
