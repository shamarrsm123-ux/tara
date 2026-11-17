// App container (03 Flows L → 6, Daily mode, Flow 13). Composition root below App.tsx: owns the tarha source, the
// monitoring session and the Store port, so ui/screens only ever see snapshots and callbacks (06 §4). Nothing is
// stored before Screen 5 "Yes" (11 §1); "No" and Delete Everything return to a fresh install.
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { DEMO_TARHA } from '../demo/DemoTarhaSource';
import type { MonitorSession, MonitorSnapshot } from '../engine/session';
import type { EngineAction } from '../engine/types';
import { DEFAULT_BASELINE } from '../signal/stress';
import type { Store } from '../shared/storePort';
import type { FoundTarha } from '../shared/tarhaSource';
import type { Settings } from '../shared/types';
import { playHaptic } from '../ui/haptics';
import { CalibrateScreen } from '../ui/screens/CalibrateScreen';
import { ConnectScreen, type ConnectPhase } from '../ui/screens/ConnectScreen';
import { ExampleScreen } from '../ui/screens/ExampleScreen';
import { isCoolingActive } from '../ui/screens/HomeScreen';
import { LanguageScreen } from '../ui/screens/LanguageScreen';
import { MainShell } from '../ui/screens/MainShell';
import { NoticeScreen } from '../ui/screens/NoticeScreen';
import { SafetyScreen, type SavedSafety } from '../ui/screens/SafetyScreen';
import { SaveScreen } from '../ui/screens/SaveScreen';
import { WelcomeScreen } from '../ui/screens/WelcomeScreen';
import { UiProvider } from '../ui/theme/UiProvider';
import { CALIBRATION_DONE_PAUSE_MS } from '../ui/theme/tokens';
import { translatorFor } from '../ui/i18n';
import { playVoice } from '../ui/voice/player';
import { createDailyRuntime, createDemoRuntime, discardRuntime, type Runtime } from './runtime';
import { canGoBack, reduceTry, type TryState } from './tryNavigation';
import { usePersistence } from './usePersistence';

interface TryFlowProps {
  store: Store;
  /** Fresh install → Choose Language; already set up → Daily mode (decided by App.tsx before first render). */
  initial: TryState;
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

type Notice = 'deleted' | 'deleteFailed' | null;

export function TryFlow({ store, initial }: TryFlowProps) {
  const [state, dispatch] = useReducer(reduceTry, initial);
  const [connectPhase, setConnectPhase] = useState<ConnectPhase>('idle');
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [hasStoryAction, setHasStoryAction] = useState(false);
  const hasStartedScenario = useRef(false);
  const lang = state.lang ?? 'en';
  const isSetUp = state.lifecycle === 'setUp';
  const isRealTarha = runtime !== null && runtime.demo === null;
  const snapshot = useSnapshot(runtime?.session ?? null);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // Events are stored only after saving and only from a real tarha (10 P13).
  const isPersistingRef = useRef(false);
  useEffect(() => {
    isPersistingRef.current = isSetUp && isRealTarha;
  }, [isSetUp, isRealTarha]);
  usePersistence(store, runtime?.session ?? null, isSetUp && isRealTarha);

  const onAction = useCallback(
    (action: EngineAction) => {
      if (action.a === 'speak') playVoice(lang, action.line);
      if (action.a === 'haptic') playHaptic(action.pattern);
      if (action.a === 'logEvent' && isPersistingRef.current) {
        void store.appendEvent({ ts: Date.now(), type: action.type, source: action.source ?? null, origin: 'tarha' }).catch(() => undefined);
      }
    },
    [lang, store],
  );
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // 03 §0.2: no back while cooling is active on Screen 3 — Stop Cooling is the action.
      const isCooling = state.screen === 'home' && snapshotRef.current !== null && isCoolingActive(snapshotRef.current);
      if (!canGoBack(state) || isCooling) return isCooling || state.screen === 'daily';
      dispatch({ type: 'back' });
      return true;
    });
    return () => sub.remove();
  }, [state]);

  // The previous runtime is always torn down when it is replaced or the app closes.
  useEffect(() => () => void discardRuntime(runtime), [runtime]);

  // Daily mode after a relaunch: monitor with the saved baseline (no tarha until BLE, Phase 7).
  useEffect(() => {
    if (state.screen !== 'daily' || runtime !== null) return undefined;
    let isCurrent = true;
    store
      .getBaseline()
      .catch(() => DEFAULT_BASELINE)
      .then((baseline) => {
        if (isCurrent) setRuntime(createDailyRuntime(baseline, (a) => onActionRef.current(a)));
      });
    return () => {
      isCurrent = false;
    };
  }, [state.screen, runtime, store]);

  // Settings are read from the store once she has saved.
  useEffect(() => {
    if (!isSetUp || settings !== null) return;
    void store.getSettings().then(setSettings, () => undefined);
  }, [isSetUp, settings, store]);

  useEffect(() => {
    if (state.screen === 'calibrate') runtime?.session.startCalibration();
  }, [state.screen, runtime]);

  const isCalibrated = state.screen === 'calibrate' && snapshot?.calibration?.isDone === true;
  useEffect(() => {
    if (!isCalibrated) return undefined;
    const id = setTimeout(() => dispatch({ type: 'calibrated' }), CALIBRATION_DONE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [isCalibrated]);

  // The demo's scripted part (Story) begins on Home (07 §8).
  useEffect(() => {
    if (state.screen === 'home' && runtime?.demo != null && !hasStartedScenario.current) {
      hasStartedScenario.current = true;
      runtime.demo.startScenario();
    }
  }, [state.screen, runtime]);

  const connect = async () => {
    setConnectPhase('searching');
    const found = await scanForTarha();
    setConnectPhase(found.length > 0 ? 'connected' : 'notFound');
  };

  const startDemo = async () => {
    const next = createDemoRuntime(DEFAULT_BASELINE, (a) => onActionRef.current(a));
    setRuntime(next);
    await next.session.connect(DEMO_TARHA.id);
    setConnectPhase('connected');
    dispatch({ type: 'connected', isDemo: true });
  };

  /** Back to a fresh install: memory cleared, tarha disconnected and forgotten (03 Flow 5 "No", 11 §1). */
  const resetToFresh = () => {
    void discardRuntime(runtime);
    setRuntime(null);
    setSettings(null);
    setConnectPhase('idle');
    setHasStoryAction(false);
    hasStartedScenario.current = false;
    dispatch({ type: 'reset' });
  };

  /** Flow 13 step 3, in 05 §4 order: stop cooling, forget the tarha (🟡 reminders: none exist before Phase 8), then the store wipe. */
  const deleteEverything = async () => {
    runtime?.session.dispatch({ t: 'userCool', on: false });
    await discardRuntime(runtime);
    try {
      await store.wipeEverything();
      setNotice('deleted');
    } catch {
      setNotice('deleteFailed');
    }
  };

  const saved: SavedSafety | null =
    isSetUp && settings !== null
      ? {
          settings,
          onSettings: (patch) => void store.updateSettings(patch).then(() => store.getSettings().then(setSettings), () => undefined),
          onDeleteEverything: () => void deleteEverything(),
        }
      : null;

  const back = () => dispatch({ type: 'back' });
  const demo = runtime?.demo != null ? { isSpedUp: runtime.demo.scenario.isSpedUp } : null;
  const isStoryReady = state.lifecycle === 'trying' && hasStoryAction && snapshot !== null && !snapshot.engine.isPromptShowing;
  const t = translatorFor(lang);

  if (notice !== null) {
    return (
      <UiProvider lang={lang} theme="sun" style={styles.fill}>
        {notice === 'deleted' ? (
          <NoticeScreen
            testID="screen-deleted"
            message={t('deleteAll.done')}
            voiceLine="deletedAll"
            onOk={() => {
              setNotice(null);
              resetToFresh();
            }}
          />
        ) : (
          <NoticeScreen testID="screen-delete-failed" message={t('deleteAll.failed')} voiceLine="deleteHold" onOk={() => setNotice(null)} />
        )}
      </UiProvider>
    );
  }

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
      {(state.screen === 'home' || state.screen === 'daily') && snapshot !== null && runtime !== null && (
        <MainShell
          snapshot={snapshot}
          demo={demo}
          saved={saved}
          onCool={(on) => {
            if (on) setHasStoryAction(true);
            runtime.session.dispatch({ t: 'userCool', on });
          }}
          onExtend={() => runtime.session.dispatch({ t: 'extendCooling' })}
          onPromptAnswer={(yes) => {
            setHasStoryAction(true);
            runtime.session.dispatch({ t: 'promptAnswer', yes });
          }}
          onPromptDismiss={() => runtime.session.dispatch({ t: 'promptDismiss' })}
          onAlertLess={(yes) => runtime.session.dispatch({ t: 'alertLessAnswer', yes })}
          onBack={state.screen === 'home' ? back : undefined}
          onContinue={isStoryReady ? () => dispatch({ type: 'continueStory' }) : undefined}
        />
      )}
      {state.screen === 'example' && snapshot !== null && (
        <ExampleScreen
          snapshot={snapshot}
          demo={demo}
          answer={state.patternOffers}
          onAnswer={(yes) => dispatch({ type: 'answerExample', yes })}
          onNext={() => dispatch({ type: 'exampleDone' })}
          onBack={back}
        />
      )}
      {state.screen === 'save' && (
        <SaveScreen
          demo={demo}
          onSave={() =>
            store.createFromTrySession({
              lang,
              baseline: snapshotRef.current?.baseline ?? DEFAULT_BASELINE,
              prefs: { patternOffers: state.patternOffers ?? true },
            })
          }
          onNothingSaved={resetToFresh}
          onName={(name) => store.setDisplayName(name)}
          onAge={(group) => store.setAgeGroup(group)}
          onDone={() => dispatch({ type: 'saved' })}
          onBack={back}
        />
      )}
      {state.screen === 'privacy' && <SafetyScreen demo={demo} saved={saved} onDone={() => dispatch({ type: 'privacyDone' })} />}
    </UiProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
