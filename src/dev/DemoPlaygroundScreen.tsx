// Phase 3 developer playground (debug builds only): runs a demo scenario through the real pipeline —
// DemoTarhaSource → signal/ → engine/ — and shows it with the Phase 1 components. Not a product screen
// (those start in Phase 4). Nothing is stored: the session lives in memory and is disposed on exit.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEMO_TARHA, DemoTarhaSource } from '../demo/DemoTarhaSource';
import { DEMO_SCENARIO_IDS, type DemoScenarioId } from '../demo/scenarios';
import { createMonitorSession, GRAPH_WINDOW_MS, type MonitorSession } from '../engine/session';
import type { EngineAction } from '../engine/types';
import { DEFAULT_BASELINE } from '../signal/stress';
import { Button } from '../ui/components/Button';
import { CalmMeter, type MeterStatus } from '../ui/components/CalmMeter';
import { DecisionCard } from '../ui/components/DecisionCard';
import { DemoRibbon } from '../ui/components/DemoRibbon';
import { FitChip } from '../ui/components/FitChip';
import { LiveGraph } from '../ui/components/LiveGraph';
import { playHaptic } from '../ui/haptics';
import { useUi } from '../ui/theme/UiProvider';
import { SPACE } from '../ui/theme/tokens';
import { playVoice } from '../ui/voice/player';

const systemClock = { nowMs: () => Date.now(), monotonicMs: () => performance.now() };

interface Running {
  scenario: DemoScenarioId;
  source: DemoTarhaSource;
  session: MonitorSession;
}

function useRunningSession(scenario: DemoScenarioId | null, onAction: (a: EngineAction) => void): Running | null {
  const running = useMemo<Running | null>(() => {
    if (scenario === null) return null;
    const source = new DemoTarhaSource({ clock: systemClock, scenario });
    const session = createMonitorSession({
      source,
      clock: systemClock,
      baseline: DEFAULT_BASELINE,
      timing: { sustainS: source.scenario.sustainOverrideS },
      onAction,
    });
    return { scenario, source, session };
    // onAction is stable for the screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  useEffect(() => {
    if (running === null) return undefined;
    running.session
      .connect(DEMO_TARHA.id)
      .then(() => running.source.startScenario())
      .catch((error: unknown) => console.warn('demo connect failed', error instanceof Error ? error.name : 'unknown'));
    return () => {
      running.session.dispose();
      void running.source.disconnect();
    };
  }, [running]);

  return running;
}

function Live({ running }: { running: Running }) {
  const { t } = useUi();
  const snap = useSyncExternalStore(running.session.subscribe, running.session.getSnapshot);
  const status: MeterStatus = snap.connection !== 'connected' ? 'notConnected' : snap.calm === null ? 'adjustSensor' : 'live';
  const isCooling = snap.engine.cooling === 'on' || snap.engine.cooling === 'starting';

  return (
    <View style={styles.live}>
      <DemoRibbon isSpedUp={running.source.scenario.isSpedUp} />
      <View style={styles.body}>
        {snap.fit !== null && <FitChip fit={snap.fit} />}
        <View style={styles.center}>
          <CalmMeter calm={snap.calm} zone={snap.zone} status={status} testID="demo-meter" />
        </View>
        <LiveGraph points={snap.points} coolingBands={snap.coolingBands} nowMs={snap.nowMs} windowMs={GRAPH_WINDOW_MS} />
        {snap.engine.isPromptShowing && (
          <DecisionCard
            tone="high"
            question={t('prompt.highStress')}
            yesLabel={t('prompt.yesCool')}
            noLabel={t('prompt.no')}
            voiceLine="highPrompt"
            onYes={() => running.session.dispatch({ t: 'promptAnswer', yes: true })}
            onNo={() => running.session.dispatch({ t: 'promptAnswer', yes: false })}
            testID="demo-prompt"
          />
        )}
        <Button
          label={isCooling ? t('cool.stop') : t('cool.start')}
          variant={isCooling ? 'outlined' : 'filled'}
          isDisabled={!isCooling && snap.engine.coolBlockReason !== null}
          onPress={() => running.session.dispatch({ t: 'userCool', on: !isCooling })}
          testID="demo-cool"
        />
        <Text style={styles.debug} testID="demo-debug">
          {`dev · cooling ${snap.engine.cooling}${snap.engine.coolBlockReason ? ` (blocked: ${snap.engine.coolBlockReason})` : ''} · battery ${
            snap.engine.tarhaBatteryPct ?? '—'
          }% · episode ${snap.engine.episode}${snap.engine.isHelpAsking ? ' · HELP QUESTION' : ''}`}
        </Text>
      </View>
    </View>
  );
}

export function DemoPlaygroundScreen({ onExit }: { onExit: () => void }) {
  const { lang, palette } = useUi();
  const [scenario, setScenario] = useState<DemoScenarioId | null>(null);
  const [lastAction, setLastAction] = useState('—');
  const onAction = useMemo(
    () => (a: EngineAction) => {
      if (a.a === 'speak') playVoice(lang, a.line);
      if (a.a === 'haptic') playHaptic(a.pattern);
      if (a.a === 'notify' || a.a === 'askHelp' || a.a === 'askAlertLess') setLastAction(a.a === 'notify' ? `notify ${a.kind}` : a.a);
    },
    [lang],
  );
  const running = useRunningSession(scenario, onAction);

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.controls}>
        <Pressable onPress={onExit} style={styles.chip}>
          <Text style={styles.chipText}>← Gallery</Text>
        </Pressable>
        {DEMO_SCENARIO_IDS.map((id) => (
          <Pressable key={id} onPress={() => setScenario(id)} style={[styles.chip, scenario === id && styles.chipOn]} testID={`scenario-${id}`}>
            <Text style={[styles.chipText, scenario === id && styles.chipTextOn]}>{id}</Text>
          </Pressable>
        ))}
        {scenario !== null && (
          <Pressable onPress={() => setScenario(null)} style={styles.chip}>
            <Text style={styles.chipText}>Stop demo</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.debug, styles.pad]}>{`dev · last alert: ${lastAction}`}</Text>
      {running !== null ? (
        <Live key={running.scenario} running={running} />
      ) : (
        <Text style={[styles.debug, styles.pad]}>Pick a scenario. Story = the 30-second MVP: wait for the red prompt, tap Yes.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: 48, paddingBottom: 64 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, paddingHorizontal: SPACE.md, marginBottom: SPACE.sm },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, borderColor: '#1565C0', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: '#1565C0' },
  chipText: { color: '#1565C0', fontSize: 16, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  live: { marginHorizontal: SPACE.md, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  body: { padding: SPACE.md, gap: SPACE.md },
  center: { alignItems: 'center' },
  debug: { fontSize: 13, color: '#5A524A' },
  pad: { paddingHorizontal: SPACE.md, marginBottom: SPACE.sm },
});
