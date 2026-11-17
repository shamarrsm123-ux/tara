// Flow 2 — Home (03, 04 §10, 04a v2 §4): greeting row (hello + today's date, connection button), the Calm ring
// meter, the cooling card while cooling, "Right now" tiles (tarha · battery · cooling) and the last 10 minutes.
// Calm shows only after 5 s of Good fit (11 §2). Back is not offered while cooling is active (03 §0.2). The
// Cool button lives in the tab bar (04a v2 D6); prompts are drawn over every tab by MainShell.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GOOD_FIT_SHOW_MS, GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { formatDate, formatNumber } from '../i18n/format';
import { CoolingCard } from '../components/ActionCards';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CalmMeter, type MeterStatus } from '../components/CalmMeter';
import { FitChip } from '../components/FitChip';
import { LiveGraph } from '../components/LiveGraph';
import { BackButton, ScreenFrame } from '../components/ScreenFrame';
import { LogoMark } from '../art/LogoMark';
import type { BackdropMood } from '../theme/tokens';
import { Card, SectionTitle, type CardTint } from '../components/Surface';
import { IconBattery, IconBellOff, IconLink, IconSnow } from '../icons/Icons';
import { MuteChoices, MutedNotice } from '../components/MuteControl';
import { muteUntilMono } from '../../engine/mute';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE, TOUCH_MIN } from '../theme/tokens';

interface HomeScreenProps {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
  onCool: (on: boolean) => void;
  onExtend: () => void;
  onBack?: () => void;
  /** Try story: shown after the cooling scene to go on to Screen 4. */
  onContinue?: () => void;
  /** Mute alerts until this monotonic time; null turns alerts back on (03 Flow 7 step 5). */
  onMute?: (untilMono: number | null) => void;
}

const MS_PER_S = 1000;
const TILE_ICON = 26;

export function meterStatusFor(s: MonitorSnapshot): MeterStatus {
  if (s.connection !== 'connected') return 'notConnected';
  if (s.calm === null || s.goodFitMs < GOOD_FIT_SHOW_MS) return 'adjustSensor';
  return 'live';
}

export function isCoolingActive(s: MonitorSnapshot): boolean {
  return s.engine.cooling === 'on' || s.engine.cooling === 'starting';
}

/** The background follows what is happening: blue while cooling, else the live zone (04a v3 §6). */
export function moodFor(s: MonitorSnapshot): BackdropMood {
  if (isCoolingActive(s)) return 'cool';
  if (meterStatusFor(s) !== 'live' || s.zone === 'unknown') return 'warm';
  return s.zone;
}

function Greeting({ snapshot, onBack, onMutePress }: { snapshot: MonitorSnapshot; onBack?: () => void; onMutePress?: () => void }) {
  const { t, lang, palette } = useUi();
  const isConnected = snapshot.connection === 'connected';
  return (
    <View style={styles.header}>
      {onBack !== undefined ? (
        <BackButton onPress={onBack} />
      ) : (
        <LogoMark size={56} />
      )}
      <View style={styles.greeting}>
        <AppText variant="caption" color="textMuted">
          {`${t('home.greeting')} · ${t('brand.name')}`}
        </AppText>
        <AppText variant="body" isBold numberOfLines={1} testID="home-date">
          {formatDate(snapshot.nowMs, lang)}
        </AppText>
      </View>
      {onMutePress !== undefined && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mute.button')}
          onPress={onMutePress}
          style={({ pressed }) => [styles.avatar, styles.outlined, { borderColor: palette.line, backgroundColor: palette.surface, opacity: pressed ? 0.7 : 1 }]}
          testID="mute-button"
        >
          <IconBellOff color={snapshot.engine.isMuted ? palette.accent : palette.text} size={24} />
        </Pressable>
      )}
      <View
        style={[styles.avatar, styles.outlined, { borderColor: palette.line }]}
        accessible
        accessibilityLabel={isConnected ? t('status.connected') : t('status.notConnected')}
        testID="status-connection"
      >
        <IconLink color={isConnected ? palette.calm : palette.neutral} size={26} />
      </View>
    </View>
  );
}

interface TileProps {
  tint: Exclude<CardTint, 'white'>;
  icon: ReactNode;
  value: string;
  label: string;
  testID?: string;
}

/** The reference's "My Plans" tile: tinted card, icon, bold value, muted label. */
function Tile({ tint, icon, value, label, testID }: TileProps) {
  const { palette } = useUi();
  const fill = tint === 'peach' ? palette.tintPeach : tint === 'apricot' ? palette.tintApricot : palette.tintLemon;
  return (
    <View style={[styles.tile, { backgroundColor: fill }]} accessible accessibilityLabel={`${label}: ${value}`} testID={testID}>
      <View style={[styles.tileIcon, { backgroundColor: palette.surface }]}>{icon}</View>
      <View>
        <AppText variant="body" isBold numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

function RightNow({ snapshot }: { snapshot: MonitorSnapshot }) {
  const { t, palette, lang } = useUi();
  const isConnected = snapshot.connection === 'connected';
  const battery = snapshot.engine.tarhaBatteryPct;
  const isCooling = snapshot.engine.cooling === 'on';
  return (
    <View style={styles.section}>
      <SectionTitle>{t('home.rightNow')}</SectionTitle>
      <View style={styles.tiles}>
        <Tile
          tint="peach"
          icon={<IconLink color={isConnected ? palette.calm : palette.neutral} size={TILE_ICON} />}
          value={isConnected ? t('status.connectedShort') : '—'}
          label={t('status.tarhaLabel')}
        />
        <Tile
          tint="apricot"
          icon={<IconBattery color={palette.accent} pct={battery ?? 0} size={TILE_ICON} />}
          value={battery === null ? '—' : `${formatNumber(battery, lang)}${t('meter.percent')}`}
          label={t('status.batteryLabel')}
        />
        <Tile
          tint="lemon"
          testID="status-cooling"
          icon={<IconSnow color={isCooling ? palette.cool : palette.neutral} size={TILE_ICON} />}
          value={isCooling ? t('status.on') : t('status.off')}
          label={t('status.coolingLabel')}
        />
      </View>
    </View>
  );
}

export function HomeScreen({ snapshot, demo, onCool, onExtend, onBack, onContinue, onMute }: HomeScreenProps) {
  const [isChoosingMute, setIsChoosingMute] = useState(false);
  const { t } = useUi();
  const e = snapshot.engine;
  const isCooling = isCoolingActive(snapshot);
  const remainingS = e.coolingEndsAtMono === null ? null : (e.coolingEndsAtMono - snapshot.nowMono) / MS_PER_S;
  const totalS = e.coolingEndsAtMono === null || e.coolingStartedAtMono === null ? null : (e.coolingEndsAtMono - e.coolingStartedAtMono) / MS_PER_S;

  return (
    <ScreenFrame testID="screen-home" demo={demo} backdrop={moodFor(snapshot)} header={<Greeting snapshot={snapshot} onBack={isCooling ? undefined : onBack} onMutePress={onMute !== undefined ? () => setIsChoosingMute((v) => !v) : undefined} />}>
      {isChoosingMute && onMute !== undefined && (
        <MuteChoices
          onChoose={(choice) => {
            onMute(muteUntilMono(choice, snapshot.nowMs, snapshot.nowMono));
            setIsChoosingMute(false);
          }}
          onCancel={() => setIsChoosingMute(false)}
        />
      )}
      {snapshot.engine.isMuted && onMute !== undefined && <MutedNotice onResume={() => onMute(null)} />}
      <View style={styles.meter}>
        {snapshot.fit !== null && snapshot.fit !== 'good' && <FitChip fit={snapshot.fit} testID="home-fit" />}
        <CalmMeter calm={snapshot.calm} zone={snapshot.zone} status={meterStatusFor(snapshot)} testID="home-meter" />
        {snapshot.connection !== 'connected' && (
          <AppText variant="body" color="textMuted" style={styles.centerText}>
            {t('status.notConnected')}
          </AppText>
        )}
      </View>
      {isCooling && (
        <CoolingCard
          remainingS={remainingS}
          totalS={totalS}
          reason={e.coolingReason}
          isStarting={e.cooling === 'starting'}
          canExtend={e.canExtendCooling}
          onStop={() => onCool(false)}
          onExtend={onExtend}
        />
      )}
      {!isCooling && e.hasCoolingStartFailed && (
        <AppText variant="body" color="high" isBold testID="cooling-failed">
          {t('cool.failed')}
        </AppText>
      )}
      {onContinue !== undefined && <Button label={t('home.continue')} hasArrow onPress={onContinue} testID="home-continue" />}
      <RightNow snapshot={snapshot} />
      <Card>
        <LiveGraph points={snapshot.points} coolingBands={snapshot.coolingBands} nowMs={snapshot.nowMs} windowMs={GRAPH_WINDOW_MS} />
      </Card>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, paddingBottom: SPACE.md },
  avatar: { width: TOUCH_MIN, height: TOUCH_MIN, borderRadius: TOUCH_MIN / 2, alignItems: 'center', justifyContent: 'center' },
  outlined: { borderWidth: 1 },
  greeting: { flex: 1 },
  meter: { alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.sm },
  centerText: { textAlign: 'center' },
  section: { gap: SPACE.md },
  tiles: { flexDirection: 'row', gap: SPACE.sm },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tile: { flex: 1, borderRadius: RADIUS.tile, padding: SPACE.md, gap: SPACE.md, minHeight: 120, justifyContent: 'space-between' },
});
