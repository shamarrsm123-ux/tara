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
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { IconBattery, IconLink, IconSnow } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

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

function StatusRow({ snapshot }: { snapshot: MonitorSnapshot }) {
  const { t, palette, lang } = useUi();
  const isConnected = snapshot.connection === 'connected';
  const battery = snapshot.engine.tarhaBatteryPct;
  const isCooling = snapshot.engine.cooling === 'on';
  return (
    <View style={styles.statusRow}>
      <View accessible accessibilityLabel={isConnected ? t('status.connected') : t('status.notConnected')} testID="status-connection">
        <IconLink color={isConnected ? palette.calm : palette.neutral} />
      </View>
      {battery !== null && (
        <View accessible accessibilityLabel={t('status.battery', { pct: formatNumber(battery, lang) })} style={styles.battery}>
          <IconBattery color={palette.text} pct={battery} />
          <AppText variant="body" isBold>
            {formatNumber(battery, lang)}
            {t('meter.percent')}
          </AppText>
        </View>
      )}
      <View accessible accessibilityLabel={isCooling ? t('status.coolingOn') : t('status.coolingOff')} testID="status-cooling">
        <IconSnow color={isCooling ? palette.cool : palette.neutral} />
      </View>
    </View>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <View style={styles.overlay} testID="home-overlay">
      {children}
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
        onBack={isCooling ? undefined : onBack}
        demo={demo}
        footer={isCooling ? undefined : <Button label={t('cool.start')} isDisabled={isBlocked} onPress={() => onCool(true)} testID="home-cool" />}
      >
        <StatusRow snapshot={snapshot} />
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
        <Overlay>
          <PromptCard blockReason={e.coolBlockReason} onAnswer={onPromptAnswer} onDismiss={onPromptDismiss} />
        </Overlay>
      ) : (
        e.isAskingAlertLess && (
          <Overlay>
            <AlertLessCard onAnswer={onAlertLess} />
          </Overlay>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battery: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  center: { alignItems: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: OVERLAY_SCRIM,
    justifyContent: 'center',
    padding: SPACE.md,
  },
});
