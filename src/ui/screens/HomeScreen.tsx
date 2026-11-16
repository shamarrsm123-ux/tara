// Flow 2 — Home (03, 04 §10) and Screen 3 — Action (Flow 3): status bar, Calm meter, the last 10 minutes,
// the big blue Cool button; the High-stress prompt as a full-screen card; the blue cooling card with
// countdown and Stop; "alert less often?". Calm shows only after 5 s of Good fit (11 §2). Back is not
// offered while cooling is active (03 §0.2). Help, Mute and tabs come in later phases.
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOD_FIT_SHOW_MS, GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { formatNumber } from '../i18n/format';
import { AlertLessCard, CoolingCard, PromptCard } from '../components/ActionCards';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CalmMeter, type MeterStatus } from '../components/CalmMeter';
import { DemoRibbon } from '../components/DemoRibbon';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { IconBattery, IconLink, IconSnow } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE } from '../theme/tokens';

export interface HomeActions {
  onCool: (on: boolean) => void;
  onExtend: () => void;
  onPromptAnswer: (yes: boolean) => void;
  onPromptDismiss: () => void;
  onAlertLess: (yes: boolean) => void;
  onBack: () => void;
}

interface HomeScreenProps extends HomeActions {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
}

const MS_PER_S = 1000;
const OVERLAY_SCRIM = 'rgba(26, 23, 20, 0.55)';

export function meterStatusFor(s: MonitorSnapshot): MeterStatus {
  if (s.connection !== 'connected') return 'notConnected';
  if (s.calm === null || s.goodFitMs < GOOD_FIT_SHOW_MS) return 'adjustSensor';
  return 'live';
}

export function isCoolingActive(s: MonitorSnapshot): boolean {
  return s.engine.cooling === 'on' || s.engine.cooling === 'starting';
}

function Stat({ icon, value, label, testID }: { icon: ReactNode; value: string; label: string; testID?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`} testID={testID}>
      {icon}
      <AppText variant="body" isBold color="onInk">
        {value}
      </AppText>
      <AppText variant="caption" color="onInk" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

/** Dark stat panel (04a §4): tarha · battery · cooling — icon, value, label. */
function StatusPanel({ snapshot }: { snapshot: MonitorSnapshot }) {
  const { t, palette, lang } = useUi();
  const isConnected = snapshot.connection === 'connected';
  const battery = snapshot.engine.tarhaBatteryPct;
  const isCooling = snapshot.engine.cooling === 'on';
  return (
    <View style={[styles.panel, { backgroundColor: palette.ink }]}>
      <Stat
        testID="status-connection"
        icon={<IconLink color={isConnected ? palette.calm : palette.neutral} />}
        value={isConnected ? t('status.connectedShort') : '—'}
        label={t('status.tarhaLabel')}
      />
      <Stat
        icon={<IconBattery color={palette.onInk} pct={battery ?? 0} />}
        value={battery === null ? '—' : `${formatNumber(battery, lang)}${t('meter.percent')}`}
        label={t('status.batteryLabel')}
      />
      <Stat
        testID="status-cooling"
        icon={<IconSnow color={isCooling ? palette.cool : palette.neutral} />}
        value={isCooling ? t('status.on') : t('status.off')}
        label={t('status.coolingLabel')}
      />
    </View>
  );
}

/** Full-screen card over Home. The demo ribbon is drawn again on top so the scrim never dims it (08 §12). */
function Overlay({ children, demo }: { children: ReactNode; demo: { isSpedUp: boolean } | null }) {
  return (
    <View style={styles.overlay} testID="home-overlay">
      {demo !== null && <DemoRibbon isSpedUp={demo.isSpedUp} />}
      <View style={styles.overlayBody}>{children}</View>
    </View>
  );
}

export function HomeScreen({ snapshot, demo, onCool, onExtend, onPromptAnswer, onPromptDismiss, onAlertLess, onBack }: HomeScreenProps) {
  const { t } = useUi();
  const e = snapshot.engine;
  const isCooling = isCoolingActive(snapshot);
  const isBlocked = e.coolBlockReason !== null;
  const remainingS = e.coolingEndsAtMono === null ? null : (e.coolingEndsAtMono - snapshot.nowMono) / MS_PER_S;
  const totalS = e.coolingEndsAtMono === null || e.coolingStartedAtMono === null ? null : (e.coolingEndsAtMono - e.coolingStartedAtMono) / MS_PER_S;

  return (
    <View style={styles.fill}>
      <ScreenFrame
        testID="screen-home"
        title={t('brand.name')}
        onBack={isCooling ? undefined : onBack}
        demo={demo}
        footer={isCooling ? undefined : <Button label={t('cool.start')} hasArrow isDisabled={isBlocked} onPress={() => onCool(true)} testID="home-cool" />}
      >
        <StatusPanel snapshot={snapshot} />
        {snapshot.connection !== 'connected' && <AppText variant="body">{t('status.notConnected')}</AppText>}
        <View style={styles.center}>
          <CalmMeter calm={snapshot.calm} zone={snapshot.zone} status={meterStatusFor(snapshot)} testID="home-meter" />
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
        <LiveGraph points={snapshot.points} coolingBands={snapshot.coolingBands} nowMs={snapshot.nowMs} windowMs={GRAPH_WINDOW_MS} />
      </ScreenFrame>
      {e.isPromptShowing ? (
        <Overlay demo={demo}>
          <PromptCard blockReason={e.coolBlockReason} onAnswer={onPromptAnswer} onDismiss={onPromptDismiss} />
        </Overlay>
      ) : (
        e.isAskingAlertLess && (
          <Overlay demo={demo}>
            <AlertLessCard onAnswer={onAlertLess} />
          </Overlay>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  panel: { flexDirection: 'row', borderRadius: RADIUS.card, paddingVertical: SPACE.md, paddingHorizontal: SPACE.sm },
  stat: { flex: 1, alignItems: 'center', gap: SPACE.xs },
  statLabel: { opacity: 0.75 },
  center: { alignItems: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: OVERLAY_SCRIM,
    overflow: 'hidden',
  },
  overlayBody: { flex: 1, justifyContent: 'center', padding: SPACE.md },
});
