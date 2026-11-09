// Flow 2 — Home (03, 04 §10): status bar (tarha connection, battery, cooling), the Calm meter, the last
// 10 minutes, and the big blue Cool button. Calm shows only after 5 s of Good fit (11 §2); when not
// connected the meter is grey with "—" (03 Flow 15). Prompt (Phase 5), Help, Mute and tabs come later.
import { StyleSheet, View } from 'react-native';
import { GOOD_FIT_SHOW_MS, GRAPH_WINDOW_MS, type MonitorSnapshot } from '../../engine/session';
import { formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CalmMeter, type MeterStatus } from '../components/CalmMeter';
import { LiveGraph } from '../components/LiveGraph';
import { ScreenFrame } from '../components/ScreenFrame';
import { IconBattery, IconLink, IconSnow } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

interface HomeScreenProps {
  snapshot: MonitorSnapshot;
  demo: { isSpedUp: boolean } | null;
  onCool: (on: boolean) => void;
  onBack: () => void;
}

export function meterStatusFor(s: MonitorSnapshot): MeterStatus {
  if (s.connection !== 'connected') return 'notConnected';
  if (s.calm === null || s.goodFitMs < GOOD_FIT_SHOW_MS) return 'adjustSensor';
  return 'live';
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

export function HomeScreen({ snapshot, demo, onCool, onBack }: HomeScreenProps) {
  const { t } = useUi();
  const isCooling = snapshot.engine.cooling === 'on' || snapshot.engine.cooling === 'starting';
  const isBlocked = !isCooling && snapshot.engine.coolBlockReason !== null;
  return (
    <ScreenFrame
      testID="screen-home"
      onBack={onBack}
      demo={demo}
      footer={
        <Button
          label={isCooling ? t('cool.stop') : t('cool.start')}
          variant={isCooling ? 'outlined' : 'filled'}
          isDisabled={isBlocked}
          onPress={() => onCool(!isCooling)}
          testID="home-cool"
        />
      }
    >
      <StatusRow snapshot={snapshot} />
      {snapshot.connection !== 'connected' && <AppText variant="body">{t('status.notConnected')}</AppText>}
      <View style={styles.center}>
        <CalmMeter calm={snapshot.calm} zone={snapshot.zone} status={meterStatusFor(snapshot)} testID="home-meter" />
      </View>
      <LiveGraph points={snapshot.points} coolingBands={snapshot.coolingBands} nowMs={snapshot.nowMs} windowMs={GRAPH_WINDOW_MS} />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  battery: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  center: { alignItems: 'center' },
});
