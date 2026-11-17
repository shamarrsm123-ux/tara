// Screen 3 — Action (03 Flow 3, 04 §10): the High-stress prompt (red band), its "can't cool right now"
// variant, the blue "Cooling is on" card with countdown ring and Stop, and "alert less often?". All state
// comes from the engine snapshot; these components only render it and report taps.
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { CoolBlockReason, CoolOnReason } from '../../engine/types';
import { formatCountdown, formatNumber } from '../i18n/format';
import { IconBattery, IconLink, IconSnow } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { DecisionCard } from './DecisionCard';
import { Card, Tag } from './Surface';
import { VoiceButton } from './VoiceButton';
import { CoolBreezeScene } from '../art/Scenes';

const RING = 96;
const RING_STROKE = 9;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const EXTEND_MINUTES = 10;
const REASON_ICON = 48;
const LOW_BATTERY_ICON_PCT = 8;

interface PromptCardProps {
  blockReason: CoolBlockReason | null;
  onAnswer: (yes: boolean) => void;
  onDismiss: () => void;
}

function ReasonIcon({ reason }: { reason: CoolBlockReason }) {
  const { palette } = useUi();
  if (reason === 'battery') return <IconBattery color={palette.high} pct={LOW_BATTERY_ICON_PCT} size={REASON_ICON} />;
  if (reason === 'disconnected') return <IconLink color={palette.neutral} size={REASON_ICON} />;
  return <IconSnow color={palette.neutral} size={REASON_ICON} />;
}

/** "Your stress is high. Should we cool around your head now?" — or, if cooling can't start, why not (Flow 3.6). */
export function PromptCard({ blockReason, onAnswer, onDismiss }: PromptCardProps) {
  const { t, palette } = useUi();
  if (blockReason === null || blockReason === 'busy') {
    return (
      <DecisionCard
        tone="high"
        question={t('prompt.highStress')}
        yesLabel={t('prompt.yesCool')}
        noLabel={t('prompt.no')}
        tagLabel={t('zone.high')}
        voiceLine="highPrompt"
        onYes={() => onAnswer(true)}
        onNo={() => onAnswer(false)}
        testID="prompt"
      />
    );
  }
  return (
    <Card testID="prompt-blocked">
      <Tag label={t('zone.high')} color={palette.high} />
      <View style={styles.body}>
        <View style={styles.header}>
          <AppText variant="question" style={styles.flex}>
            {t('prompt.cantCool')}
          </AppText>
          <VoiceButton line="cantCool" />
        </View>
        <View style={styles.center} testID={`prompt-blocked-${blockReason}`}>
          <ReasonIcon reason={blockReason} />
        </View>
        <Button label={t('common.ok')} onPress={onDismiss} tone="ink" testID="prompt-ok" />
      </View>
    </Card>
  );
}

function ShadeAndWater({ color }: { color: string }) {
  return (
    <Svg width={88} height={40} viewBox="0 0 88 40" fill="none">
      <Path d="M4 20 Q20 2 36 20 Z M20 20 V38" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M58 8 H78 L74 36 H62 Z M60 18 H76" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
    </Svg>
  );
}

interface CoolingCardProps {
  remainingS: number | null;
  totalS: number | null;
  reason: CoolOnReason | null;
  isStarting: boolean;
  canExtend: boolean;
  onStop: () => void;
  onExtend: () => void;
}

/** "Cooling is on. Take a break: find shade and drink water." + countdown + Stop (03 Flow 3 step 3, Flow 9). */
export function CoolingCard({ remainingS, totalS, reason, isStarting, canExtend, onStop, onExtend }: CoolingCardProps) {
  const { t, palette, lang } = useUi();
  const fraction = remainingS === null || totalS === null || totalS <= 0 ? 1 : Math.min(1, Math.max(0, remainingS / totalS));
  const time = remainingS === null ? null : formatCountdown(remainingS, lang);
  const message = isStarting ? t('cool.starting') : reason === 'auto' ? t('cool.auto') : t('cool.on');

  return (
    <Card testID="cooling-card">
      <Tag label={t('status.coolingLabel')} color={palette.cool} testID="cooling-tag" />
      <CoolBreezeScene height={150} />
      <View style={styles.body}>
        <View style={styles.header}>
          <AppText variant="question" style={styles.flex}>
            {message}
          </AppText>
          <VoiceButton line="coolingOn" />
        </View>
        {!isStarting && (
          <View style={styles.timerRow}>
            <View style={styles.ring} accessible accessibilityLabel={time === null ? undefined : t('cool.timeLeft', { time })}>
              <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={palette.track} strokeWidth={RING_STROKE} fill="none" />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_R}
                  stroke={palette.cool}
                  strokeWidth={RING_STROKE}
                  strokeDasharray={`${RING_C} ${RING_C}`}
                  strokeDashoffset={RING_C * (1 - fraction)}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              </Svg>
              <AppText variant="body" isBold testID="cooling-countdown">
                {time ?? '—'}
              </AppText>
            </View>
            <ShadeAndWater color={palette.cool} />
          </View>
        )}
        {canExtend && (
          <Button
            label={t('cool.extend', { minutes: formatNumber(EXTEND_MINUTES, lang) })}
            onPress={onExtend}
            variant="outlined"
            tone="cool"
            testID="cooling-extend"
          />
        )}
        <Button label={t('cool.stop')} onPress={onStop} variant="outlined" tone="neutral" testID="cooling-stop" />
      </View>
    </Card>
  );
}

/** "Should I alert you less often today?" after the third No (03 Flow 3 step 4). */
export function AlertLessCard({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  const { t } = useUi();
  return (
    <DecisionCard
      tone="neutral"
      question={t('alertLess.question')}
      yesLabel={t('common.yes')}
      noLabel={t('common.no')}
      voiceLine="alertLess"
      onYes={() => onAnswer(true)}
      onNo={() => onAnswer(false)}
      testID="alert-less"
    />
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
});
