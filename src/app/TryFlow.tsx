// App container (03 Flows L → 6, Daily mode, Flow 13). Composition root below App.tsx: owns the tarha source, the
// monitoring session and the Store port, so ui/screens only ever see snapshots and callbacks (06 §4). Nothing is
// stored before Screen 5 "Yes" (11 §1); "No" and Delete Everything return to a fresh install.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, BackHandler, StyleSheet } from 'react-native';
import { DEMO_TARHA } from '../demo/DemoTarhaSource';
import type { MonitorSession, MonitorSnapshot } from '../engine/session';
import type { EngineAction } from '../engine/types';
import { DEFAULT_BASELINE } from '../signal/stress';
import type { Contact, Store } from '../shared/storePort';
import { isTaraError } from '../shared/errors';
import { openComposer } from '../sos/composer';
import { buildHelpMessage, buildTestMessage } from '../sos/message';
import type { HelpTools } from '../ui/screens/HelpFlow';
import type { FamilyTools } from '../ui/screens/FamilySection';
import type { FoundTarha } from '../shared/tarhaSource';
import type { Settings, NotifyKind } from '../shared/types';
import { playHaptic } from '../ui/haptics';
import { CalibrateScreen } from '../ui/screens/CalibrateScreen';
import { ConnectScreen } from '../ui/screens/ConnectScreen';
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
import { playVoice, setAutoSpeak } from '../ui/voice/player';
import { createBluetooth } from '../ble/createTarhaSource';
import { systemClock } from '../shared/clock';
import { createDemoRuntime, createTarhaRuntime, discardRuntime, type Runtime } from './runtime';
import type { DemoScenarioId } from '../demo/scenarios';
import { badTwoPmWeekHistory } from '../demo/history';
import { detectPatterns } from '../patterns/detect';
import { useConnect } from './useConnect';
import { useDailyServices } from './useDailyServices';
import { useAppLock } from './useAppLock';
import { LockScreen } from '../ui/screens/LockScreen';
import { Button } from '../ui/components/Button';
import { Card } from '../ui/components/Surface';
import { AppText } from '../ui/components/AppText';
import { timeOfDayMs, useReminders } from './useReminders';
import { reminderMinuteFor } from '../patterns/plan';
import { PatternCards } from '../ui/components/PatternCards';
import { createNotifier } from '../notify/createNotifier';
import { canGoBack, reduceTry, type TryState } from './tryNavigation';
import { usePersistence } from './usePersistence';
import { useCycle } from './useCycle';
import { CheckInCard, CycleHomeCard } from '../ui/components/CycleCards';

interface TryFlowProps {
  store: Store;
  /** Fresh install → Choose Language; already set up → Daily mode (decided by App.tsx before first render). */
  initial: TryState;
}

const NO_SUBSCRIPTION = () => () => undefined;
const NO_SNAPSHOT = () => null;

function useSnapshot(session: MonitorSession | null): MonitorSnapshot | null {
  return useSyncExternalStore(session?.subscribe ?? NO_SUBSCRIPTION, session?.getSnapshot ?? NO_SNAPSHOT);
}

type Notice = 'deleted' | 'deleteFailed' | null;

export function TryFlow({ store, initial }: TryFlowProps) {
  const [state, dispatch] = useReducer(reduceTry, initial);
  const [bluetooth] = useState(() => createBluetooth(systemClock));
  const notifier = useMemo(() => createNotifier((key) => translatorFor(state.lang ?? 'en')(`notify.${key}`)), [state.lang]);
  const notifierRef = useRef(notifier);
  const pairedRef = useRef<FoundTarha | null>(null);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [batteryAlert, setBatteryAlert] = useState<NotifyKind | null>(null);
  /** Flow 18 in Daily mode: the pattern a demo week shows (in memory only), or null. */
  const [demoOfferSlot, setDemoOfferSlot] = useState<number | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
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
  const isDaily = isSetUp && state.screen === 'daily';
  const appLock = useAppLock(store, settings, setSettings, translatorFor(lang)('lock.prompt'));
  const history = useDailyServices(store, notifier, runtime?.session ?? null, isDaily);
  const reminders = useReminders(store, notifier, isDaily, snapshot?.nowMs ?? 0);
  const cycle = useCycle(store, settings, runtime?.session ?? null, isDaily, snapshot?.nowMs ?? 0);
  useEffect(() => {
    notifierRef.current = isDaily ? notifier : null;
  }, [notifier, isDaily]);

  const onAction = useCallback(
    (action: EngineAction) => {
      if (action.a === 'speak') playVoice(lang, action.line);
      if (action.a === 'haptic') playHaptic(action.pattern);
      // 03 Flow 12: battery alerts are also shown in the app with their full wording.
      if (action.a === 'notify' && action.kind !== 'coolBreak' && action.kind !== 'helpQuestion' && action.kind !== 'reminder') setBatteryAlert(action.kind);
      // Lock-screen notification only when she isn't looking at the app; the full card is in the app (02 §8.13).
      if (action.a === 'notify' && AppState.currentState !== 'active') void notifierRef.current?.show(action.kind).catch(() => undefined);
      if (action.a === 'logEvent' && isPersistingRef.current) {
        void store
          .appendEvent({
            ts: Date.now(),
            type: action.type,
            source: action.source ?? null,
            origin: 'tarha',
          })
          .catch(() => undefined);
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

  // Daily mode after a relaunch: monitor with the saved baseline and keep reconnecting to her tarha (03 Flow 7).
  useEffect(() => {
    if (state.screen !== 'daily' || runtime !== null) return undefined;
    let isCurrent = true;
    void Promise.all([store.getBaseline().catch(() => DEFAULT_BASELINE), store.getPairedTarha().catch(() => null)]).then(([baseline, paired]) => {
      if (!isCurrent) return;
      const source = bluetooth !== null && paired !== null ? bluetooth.source : undefined;
      setRuntime(createTarhaRuntime(baseline, (a) => onActionRef.current(a), source));
      if (source !== undefined && paired !== null) bluetooth?.source.keepConnecting(paired.deviceId);
    });
    return () => {
      isCurrent = false;
    };
  }, [state.screen, runtime, store, bluetooth]);

  // Settings are read from the store once she has saved.
  useEffect(() => {
    if (!isSetUp || settings !== null) return;
    void store.getSettings().then(setSettings, () => undefined);
    void store.listContacts().then(setContacts, () => undefined);
    void store.getProfile().then(
      (p) => setProfileName(p.displayName),
      () => undefined,
    );
  }, [isSetUp, settings, store]);

  useEffect(() => {
    if (state.screen === 'calibrate' || state.screen === 'recalibrate') runtime?.session.startCalibration();
  }, [state.screen, runtime]);

  // Saved settings drive the engine and automatic speech immediately (03 Flow 16, 13 Phase 11).
  useEffect(() => {
    if (settings === null) return;
    setAutoSpeak(settings.speakAutomatically);
    runtime?.session.dispatch({ t: 'settings', settings });
  }, [settings, runtime]);

  // "Learn my calm again": the new baseline replaces the old one in the store (05 §2.3).
  const isRecalibrated = state.screen === 'recalibrate' && snapshot?.calibration?.isDone === true;
  useEffect(() => {
    if (!isRecalibrated || snapshotRef.current === null) return undefined;
    void store.replaceBaseline(snapshotRef.current.baseline).catch(() => undefined);
    const id = setTimeout(() => dispatch({ type: 'recalibrated' }), CALIBRATION_DONE_PAUSE_MS);
    return () => clearTimeout(id);
  }, [isRecalibrated, store]);

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

  const connectFlow = useConnect(bluetooth, async (tarha) => {
    if (bluetooth === null) throw new Error('no bluetooth');
    const next = createTarhaRuntime(DEFAULT_BASELINE, (a) => onActionRef.current(a), bluetooth.source);
    setRuntime(next);
    try {
      await next.session.connect(tarha.id);
    } catch (error) {
      setRuntime(null);
      throw error;
    }
    pairedRef.current = tarha;
    dispatch({ type: 'connected', isDemo: false });
  });

  const startDemo = async () => {
    const next = createDemoRuntime(DEFAULT_BASELINE, (a) => onActionRef.current(a));
    setRuntime(next);
    await next.session.connect(DEMO_TARHA.id);
    connectFlow.setPhase('connected');
    dispatch({ type: 'connected', isDemo: true });
  };

  /** Back to a fresh install: memory cleared, tarha disconnected and forgotten (03 Flow 5 "No", 11 §1). */
  const resetToFresh = () => {
    void discardRuntime(runtime);
    setRuntime(null);
    setSettings(null);
    connectFlow.setPhase('idle');
    pairedRef.current = null;
    setHasStoryAction(false);
    hasStartedScenario.current = false;
    dispatch({ type: 'reset' });
  };

  /** Flow 13 step 3, in 05 §4 order: stop cooling, forget the tarha, cancel every notification and reminder, then the store wipe. */
  /** Flow 18 from About: run a demo scenario in place of her tarha — labeled DEMO, never stored or mixed. */
  const startDemoScenario = async (id: DemoScenarioId) => {
    void discardRuntime(runtime);
    const next = createDemoRuntime(snapshotRef.current?.baseline ?? DEFAULT_BASELINE, (a) => onActionRef.current(a), id);
    setRuntime(next);
    await next.session.connect(DEMO_TARHA.id);
    next.demo?.startScenario();
    const week = id === 'badTwoPmWeek' ? badTwoPmWeekHistory(new Date()) : null;
    setDemoOfferSlot(week === null ? null : (detectPatterns(week.events, week.minutes, new Date()).patterns[0]?.patternMin ?? null));
  };
  /** Exiting demo wipes it: the demo runtime is dropped and her real tarha source comes back (Daily effect). */
  const exitDemo = () => {
    void discardRuntime(runtime);
    setRuntime(null);
    setDemoOfferSlot(null);
  };
  const isDemoActive = runtime?.demo != null;

  const deleteEverything = async () => {
    runtime?.session.dispatch({ t: 'userCool', on: false });
    await discardRuntime(runtime);
    await notifier?.cancelAll().catch(() => undefined);
    try {
      await store.wipeEverything();
      setNotice('deleted');
    } catch {
      setNotice('deleteFailed');
    }
  };

  const tr = translatorFor(lang);
  const refreshContacts = () => void store.listContacts().then(setContacts, () => undefined);
  const family: FamilyTools = {
    contacts,
    onAdd: async (name, phone) => {
      try {
        await store.addContact({ name, phoneE164: phone });
        refreshContacts();
        return 'ok';
      } catch (error) {
        return isTaraError(error, 'CONTACT_LIMIT') ? 'limit' : 'invalid';
      }
    },
    onRemove: (id) => void store.removeContact(id).then(refreshContacts, () => undefined),
    // 03 Flow 10 step 4: opens the SMS app; she presses Send.
    onTest: (c) => void openComposer(c.phoneE164, buildTestMessage(tr, profileName)),
  };
  const help: HelpTools | null =
    isSetUp && settings !== null
      ? {
          contacts,
          placeLabels: settings.placeLabelsEnabled ? settings.enabledPlaceLabels : [],
          buildMessage: (place) => buildHelpMessage(tr, profileName, place),
          openComposer: async (c, message) => {
            const result = await openComposer(c.phoneE164, message);
            // 03 Flow 11 step 6: only "help request opened" + time — no number, no place. Never from demo data.
            if (result === 'opened' && runtime !== null && runtime.demo === null) {
              void store
                .appendEvent({
                  ts: Date.now(),
                  type: 'help_opened_sms',
                  source: null,
                  origin: 'tarha',
                })
                .catch(() => undefined);
            }
            return result;
          },
          onAddFamily: () => undefined,
        }
      : null;

  const saved: SavedSafety | null =
    isSetUp && settings !== null
      ? {
          family,
          settings,
          onSettings: (patch) =>
            void store.updateSettings(patch).then(
              async () => {
                setSettings(await store.getSettings());
                if (patch.retentionDays !== undefined) reminders.refresh(); // 05 §3: patterns recomputed after retention changes
              },
              () => undefined,
            ),
          onDeleteEverything: () => void deleteEverything(),
          lock: appLock.tools ?? undefined,
          settingsTools: {
            lang,
            onLanguage: (l) =>
              void store.setLanguage(l).then(
                () => dispatch({ type: 'chooseLanguage', lang: l }),
                () => undefined,
              ),
            onRecalibrate: () => dispatch({ type: 'recalibrate' }),
            reminders: reminders.accepted.map((p) => ({
              slotStartMin: p.slotStartMin,
              reminderAtMs: timeOfDayMs(reminderMinuteFor(p.slotStartMin), snapshot?.nowMs ?? 0),
            })),
            onReminderOff: reminders.turnOff,
            demo: { isActive: isDemoActive, onStart: (id) => void startDemoScenario(id), onExit: exitDemo },
            cycle: { status: cycle.status, onCorrect: cycle.correctPhase, onForget: cycle.forget },
          },
        }
      : null;

  const back = () => dispatch({ type: 'back' });
  const demo = runtime?.demo != null ? { isSpedUp: runtime.demo.scenario.isSpedUp } : null;
  const isStoryReady = state.lifecycle === 'trying' && hasStoryAction && snapshot !== null && !snapshot.engine.isPromptShowing;
  const t = translatorFor(lang);

  // App Lock: nothing of hers is drawn until she unlocks; before settings load, draw nothing at all (no flash).
  if (isSetUp && settings === null && notice === null) return null;
  if (appLock.isLocked && notice === null) {
    return (
      <UiProvider lang={lang} theme="sun" style={styles.fill}>
        <LockScreen onUnlock={appLock.unlock} />
      </UiProvider>
    );
  }

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
        <LanguageScreen
          selected={state.lang}
          onSelect={(l) => dispatch({ type: 'chooseLanguage', lang: l })}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      )}
      {state.screen === 'welcome' && <WelcomeScreen onTry={() => dispatch({ type: 'tryToCalm' })} onBack={back} />}
      {state.screen === 'connect' && (
        <ConnectScreen
          phase={connectFlow.phase}
          snapshot={snapshot}
          isDemo={state.isDemo}
          found={connectFlow.found}
          needsLocationText={connectFlow.needsLocationText}
          onConnect={connectFlow.start}
          onAllow={connectFlow.allow}
          onBlink={connectFlow.blink}
          onChoose={connectFlow.choose}
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
          onMute={(untilMono) => runtime.session.dispatch({ t: 'mute', untilMs: untilMono })}
          history={isDemoActive || history === null ? null : { ...history, cycle: cycle.isOn ? { phaseOn: cycle.phaseOn, checkIns: cycle.checkIns } : null }}
          help={help}
          onHelpAnswer={(yes) => runtime.session.dispatch({ t: 'helpAnswer', yes })}
          homeBanner={
            isDaily ? (
              <>
                {batteryAlert !== null && (
                  <Card tint="apricot" testID="battery-alert">
                    <AppText variant="body" isBold>
                      {t(BATTERY_TEXT[batteryAlert] ?? 'battery.low')}
                    </AppText>
                    <Button label={t('common.ok')} variant="outlined" tone="neutral" onPress={() => setBatteryAlert(null)} testID="battery-alert-ok" />
                  </Card>
                )}
                {cycle.status !== null && <CycleHomeCard status={cycle.status} onLogDay1={cycle.logDay1} />}
                {cycle.isCheckInDue && <CheckInCard onSave={cycle.saveCheckIn} onLater={cycle.postponeCheckIn} />}
                <PatternCards
                  offerSlot={isDemoActive ? demoOfferSlot : reminders.offerSlot}
                  dueSlot={isDemoActive ? null : reminders.dueSlot}
                  fadedSlot={isDemoActive ? null : reminders.fadedSlot}
                  needMoreDays={!isDemoActive && reminders.needMoreDays}
                  timeOf={(m) => timeOfDayMs(m, snapshot.nowMs)}
                  reminderOf={reminderMinuteFor}
                  onAccept={isDemoActive ? () => setDemoOfferSlot(null) : reminders.accept}
                  onDecline={isDemoActive ? () => setDemoOfferSlot(null) : reminders.decline}
                  onDismissDue={reminders.dismissDue}
                  onDismissFaded={reminders.dismissFaded}
                />
              </>
            ) : undefined
          }
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
          onSave={async () => {
            await store.createFromTrySession({
              lang,
              baseline: snapshotRef.current?.baseline ?? DEFAULT_BASELINE,
              prefs: { patternOffers: state.patternOffers ?? true },
            });
            const paired = pairedRef.current;
            // A real tarha is remembered so Daily mode reconnects to it; the demo tarha never is.
            if (paired !== null && runtime?.demo === null)
              await store.setPairedTarha({
                deviceId: paired.id,
                name: paired.name,
                firmware: '',
                pairedAt: Date.now(),
              });
          }}
          onNothingSaved={resetToFresh}
          onName={(name) => store.setDisplayName(name)}
          onAge={(group) => store.setAgeGroup(group)}
          onDone={() => dispatch({ type: 'saved' })}
          onBack={back}
        />
      )}
      {state.screen === 'privacy' && <SafetyScreen demo={demo} saved={saved} onDone={() => dispatch({ type: 'privacyDone' })} />}
      {state.screen === 'recalibrate' && <CalibrateScreen snapshot={snapshot} isDemo={state.isDemo} onSkip={back} onBack={back} />}
    </UiProvider>
  );
}

const BATTERY_TEXT: Partial<Record<NotifyKind, 'battery.low' | 'battery.lock' | 'battery.off' | 'battery.phoneLow'>> = {
  batteryLow: 'battery.low',
  batteryLock: 'battery.lock',
  batteryOff: 'battery.off',
  phoneBatteryLow: 'battery.phoneLow',
};

const styles = StyleSheet.create({ fill: { flex: 1 } });
