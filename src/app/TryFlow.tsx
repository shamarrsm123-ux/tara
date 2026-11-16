// Try flow container (03 Flows L, 0, 1, 1b, 2). Composition root: owns the tarha source and the monitoring
// session, so ui/screens only ever see snapshots and callbacks (06 §4). Lifecycle is `fresh`/`trying`:
// everything here lives in memory and disappears when the app closes (11 §1, §8.1).
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { DEMO_TARHA, DemoTarhaSource } from '../demo/DemoTarhaSource';
import { createMonitorSession, type MonitorSession, type MonitorSnapshot } from '../engine/session';
import type { EngineAction } from '../engine/types';
import { DEFAULT_BASELINE } from '../signal/stress';
import { systemClock } from '../shared/clock';
import type { FoundTarha } from '../shared/tarhaSource';
import { playHaptic } from '../ui/haptics';
import { CalibrateScreen } from '../ui/screens/CalibrateScreen';
import { ConnectScreen, type ConnectPhase } from '../ui/screens/ConnectScreen';
import { HomeScreen, isCoolingActive } from '../ui/screens/HomeScreen';
import { LanguageScreen } from '../ui/screens/LanguageScreen';
import { WelcomeScreen } from '../ui/screens/WelcomeScreen';
import { UiProvider } from '../ui/theme/UiProvider';
import { CALIBRATION_DONE_PAUSE_MS } from '../ui/theme/tokens';
import { playVoice } from '../ui/voice/player';
import { canGoBack, INITIAL_TRY, reduceTry } from './tryNavigation';

interface Runtime {
  source: DemoTarhaSource;
  session: MonitorSession;
}

/** Real tarha scan. This build has no BLE module yet (Phase 7), so no tarha is ever found and Flow 1
 *  offers "Use demo instead" — the honest path on a phone, an emulator or the web preview. */
async function scanForTarha(): Promise<FoundTarha[]> {
  return [];
}

const NO_SUBSCRIPTION = () => () => undefined;
const NO_SNAPSHOT = () => null;

function useSnapshot(session: MonitorSession | null): MonitorSnapshot | null {
  return useSyncExternalStore(session?.subscribe ?? NO_SUBSCRIPTION, session?.getSnapshot ?? NO_SNAPSHOT);
}

export function TryFlow() {
  const [state, dispatch] = useReducer(reduceTry, INITIAL_TRY);
  const [connectPhase, setConnectPhase] = useState<ConnectPhase>('idle');
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const hasStartedScenario = useRef(false);
  const lang = state.lang ?? 'en';
  const snapshot = useSnapshot(runtime?.session ?? null);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const onAction = useCallback(
    (action: EngineAction) => {
      if (action.a === 'speak') playVoice(lang, action.line);
      if (action.a === 'haptic') playHaptic(action.pattern);
    },
    [lang],
  );
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // 03 §0.2: no back while cooling is active on Screen 3 — Stop Cooling is the action.
      const isCooling = state.screen === 'home' && snapshotRef.current !== null && isCoolingActive(snapshotRef.current);
      if (!canGoBack(state) || isCooling) return isCooling;
      dispatch({ type: 'back' });
      return true;
    });
    return () => sub.remove();
  }, [state]);

  useEffect(
    () => () => {
      runtime?.session.dispose();
      void runtime?.source.disconnect();
    },
    [runtime],
  );

  // Learn Your Calm starts when its screen appears.
  useEffect(() => {
    if (state.screen === 'calibrate') runtime?.session.startCalibration();
  }, [state.screen, runtime]);

  // "Thank you. Now I know your calm." → Home.
  const isCalibrated = state.screen === 'calibrate' && snapshot?.calibration?.isDone === true;
  useEffect(() => {
    if (!isCalibrated) return undefined;
    const id = setTimeout(() => dispatch({ type: 'calibrated' }), CALIBRATION_DONE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [isCalibrated]);

  // The demo's scripted part (Story) begins on Home (07 §8).
  useEffect(() => {
    if (state.screen === 'home' && runtime !== null && !hasStartedScenario.current) {
      hasStartedScenario.current = true;
      runtime.source.startScenario();
    }
  }, [state.screen, runtime]);

  const connect = async () => {
    setConnectPhase('searching');
    const found = await scanForTarha();
    setConnectPhase(found.length > 0 ? 'connected' : 'notFound');
  };

  const startDemo = async () => {
    const source = new DemoTarhaSource({ clock: systemClock, scenario: 'story' });
    const session = createMonitorSession({
      source,
      clock: systemClock,
      baseline: DEFAULT_BASELINE,
      timing: { sustainS: source.scenario.sustainOverrideS },
      onAction: (a) => onActionRef.current(a),
    });
    setRuntime({ source, session });
    await session.connect(DEMO_TARHA.id);
    setConnectPhase('connected');
    dispatch({ type: 'connected', isDemo: true });
  };

  const back = () => dispatch({ type: 'back' });
  const homeDemo = state.isDemo ? { isSpedUp: runtime?.source.scenario.isSpedUp ?? false } : null;

  return (
    <UiProvider lang={lang} theme="sun" style={styles.fill}>
      {state.screen === 'language' && (
        <LanguageScreen selected={state.lang} onSelect={(l) => dispatch({ type: 'chooseLanguage', lang: l })} onContinue={() => dispatch({ type: 'continue' })} />
      )}
      {state.screen === 'welcome' && <WelcomeScreen onTry={() => dispatch({ type: 'tryToCalm' })} onBack={back} />}
      {state.screen === 'connect' && (
        <ConnectScreen
          phase={connectPhase}
          snapshot={snapshot}
          isDemo={state.isDemo}
          onConnect={() => void connect()}
          onUseDemo={() => void startDemo()}
          onNext={() => dispatch({ type: 'next' })}
          onBack={back}
        />
      )}
      {state.screen === 'calibrate' && (
        <CalibrateScreen
          snapshot={snapshot}
          isDemo={state.isDemo}
          onSkip={() => {
            runtime?.session.replaceBaseline(DEFAULT_BASELINE);
            dispatch({ type: 'skipCalibration' });
          }}
          onBack={back}
        />
      )}
      {state.screen === 'home' && snapshot !== null && runtime !== null && (
        <HomeScreen
          snapshot={snapshot}
          demo={homeDemo}
          onCool={(on) => runtime.session.dispatch({ t: 'userCool', on })}
          onExtend={() => runtime.session.dispatch({ t: 'extendCooling' })}
          onPromptAnswer={(yes) => runtime.session.dispatch({ t: 'promptAnswer', yes })}
          onPromptDismiss={() => runtime.session.dispatch({ t: 'promptDismiss' })}
          onAlertLess={(yes) => runtime.session.dispatch({ t: 'alertLessAnswer', yes })}
          onBack={back}
        />
      )}
    </UiProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
