// Phase 1 acceptance: every core component in each language, Sun & Night, at 100% and 130% font scale
// (13 Phase 1). Debug builds only. The sample values below are fixed gallery fixtures for drawing
// components — not demo-source data, not real data, never persisted.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LANGS, type Lang, type Zone } from '../shared/types';
import { LANG_NATIVE_NAME } from '../ui/i18n';
import { CalmMeter } from '../ui/components/CalmMeter';
import { DecisionCard } from '../ui/components/DecisionCard';
import { DemoRibbon } from '../ui/components/DemoRibbon';
import { FitChip } from '../ui/components/FitChip';
import { HoldToConfirm } from '../ui/components/HoldToConfirm';
import { LiveGraph } from '../ui/components/LiveGraph';
import { VoiceButton } from '../ui/components/VoiceButton';
import type { GraphPoint } from '../ui/components/graphGeometry';
import { UiProvider, useUi } from '../ui/theme/UiProvider';
import { MAX_FONT_SCALE, PALETTES, SPACE, type ThemeName } from '../ui/theme/tokens';
import { ProbeScreen } from './ProbeScreen';

const GRAPH_WINDOW_MS = 10 * 60_000;
const GRAPH_SAMPLES = 600;
const CYCLE_MS = 2000;
const CYCLE: readonly { calm: number; zone: Zone }[] = [
  { calm: 72, zone: 'calm' },
  { calm: 40, zone: 'rising' },
  { calm: 18, zone: 'high' },
  { calm: 60, zone: 'calm' },
];

function graphFixture(nowMs: number): GraphPoint[] {
  return Array.from({ length: GRAPH_SAMPLES }, (_, i) => ({
    tMs: nowMs - (GRAPH_SAMPLES - 1 - i) * 1000,
    calm: i >= 300 && i < 330 ? null : 55 + 30 * Math.sin(i / 70),
  }));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { palette } = useUi();
  return (
    <View style={[styles.section, { backgroundColor: palette.surface, borderColor: palette.sand }]}>
      <Text style={[styles.sectionTitle, { color: palette.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function GalleryContent() {
  const { t, palette } = useUi();
  const [nowMs] = useState(() => Date.now());
  const points = useMemo(() => graphFixture(nowMs), [nowMs]);
  const [step, setStep] = useState(0);
  const [lastTap, setLastTap] = useState('—');
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % CYCLE.length), CYCLE_MS);
    return () => clearInterval(id);
  }, []);
  const live = CYCLE[step] ?? CYCLE[0]!;

  return (
    <View style={[styles.content, { backgroundColor: palette.bg }]}>
      <Section title="Calm Meter — animated">
        <CalmMeter calm={live.calm} zone={live.zone} status="live" testID="meter-live" />
      </Section>
      <Section title="Calm Meter — zones & states">
        <View style={styles.wrapRow}>
          <CalmMeter calm={72} zone="calm" status="live" testID="meter-calm" />
          <CalmMeter calm={40} zone="rising" status="live" />
          <CalmMeter calm={18} zone="high" status="live" />
          <CalmMeter calm={null} zone="unknown" status="notConnected" testID="meter-off" />
          <CalmMeter calm={null} zone="unknown" status="adjustSensor" />
        </View>
      </Section>
      <Section title="Live Graph — 10 min, gap + cooling band">
        <LiveGraph points={points} coolingBands={[{ fromMs: nowMs - 240_000, toMs: nowMs - 60_000 }]} nowMs={nowMs} windowMs={GRAPH_WINDOW_MS} />
      </Section>
      <Section title="Fit Chip">
        <View style={styles.row}>
          <FitChip fit="good" />
          <FitChip fit="adjust" />
          <FitChip fit="none" />
        </View>
      </Section>
      <Section title={`Decision Card — last tap: ${lastTap}`}>
        <DecisionCard
          tone="high"
          question={t('prompt.highStress')}
          yesLabel={t('prompt.yesCool')}
          noLabel={t('prompt.no')}
          voiceLine="highPrompt"
          onYes={() => setLastTap('yes')}
          onNo={() => setLastTap('no')}
          testID="card-high"
        />
      </Section>
      <Section title={`Hold-to-Confirm — ${lastTap === 'deleted' ? 'confirmed' : 'hold 3 s'}`}>
        <HoldToConfirm label={t('deleteAll.button')} voiceLine="deleteHold" onConfirm={() => setLastTap('deleted')} />
      </Section>
      <Section title="Demo Ribbon (+ sped up)">
        <View style={[styles.frame, { borderColor: palette.sand, backgroundColor: palette.bg }]}>
          <DemoRibbon isSpedUp />
        </View>
      </Section>
      <Section title="Voice button">
        <VoiceButton line="langName" />
      </Section>
    </View>
  );
}

function Chip({ label, isOn, onPress }: { label: string; isOn: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, isOn && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: isOn }}>
      <Text style={[styles.chipText, isOn && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function GalleryScreen() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<ThemeName>('sun');
  const [fontScale, setFontScale] = useState(1);
  const [isProbe, setIsProbe] = useState(false);

  if (isProbe) {
    return (
      <View style={styles.fill}>
        <Chip label="← Gallery" isOn={false} onPress={() => setIsProbe(false)} />
        <ProbeScreen />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: PALETTES[theme].bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.controls}>
        {LANGS.map((l) => (
          <Chip key={l} label={LANG_NATIVE_NAME[l]} isOn={lang === l} onPress={() => setLang(l)} />
        ))}
        <Chip label="Sun" isOn={theme === 'sun'} onPress={() => setTheme('sun')} />
        <Chip label="Night" isOn={theme === 'night'} onPress={() => setTheme('night')} />
        <Chip label="100%" isOn={fontScale === 1} onPress={() => setFontScale(1)} />
        <Chip label="130%" isOn={fontScale === MAX_FONT_SCALE} onPress={() => setFontScale(MAX_FONT_SCALE)} />
        <Chip label="DB probe" isOn={false} onPress={() => setIsProbe(true)} />
      </View>
      <UiProvider lang={lang} theme={theme} fontScale={fontScale}>
        <GalleryContent />
      </UiProvider>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, paddingTop: 48 },
  scroll: { paddingTop: 48, paddingBottom: 64 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, paddingHorizontal: SPACE.md, marginBottom: SPACE.md },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, borderColor: '#1565C0', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: '#1565C0' },
  chipText: { color: '#1565C0', fontSize: 16, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF' },
  content: { paddingHorizontal: SPACE.md, gap: SPACE.md },
  section: { borderWidth: 1, borderRadius: 16, padding: SPACE.md, gap: SPACE.md },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg, justifyContent: 'center' },
  frame: { height: 140, borderWidth: 2, borderRadius: 16, overflow: 'hidden', position: 'relative' },
});
