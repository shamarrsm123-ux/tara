// Calm Meter (04 §9.1): thick ring filled to the Calm %, colored by zone; face above the big number;
// zone word below. Not connected / poor fit: grey ring, "—", status word. The zone is always passed in —
// it is computed by signal/, never decided here.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Zone } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { ZoneFace } from '../icons/ZoneFace';
import { useUi } from '../theme/UiProvider';
import { METER_EASE_MS, RING_SIZE, RING_STROKE, SPACE, TYPE_SIZE } from '../theme/tokens';
import { useReduceMotion } from '../theme/useReduceMotion';
import { AppText } from './AppText';

export type MeterStatus = 'live' | 'notConnected' | 'adjustSensor';

interface CalmMeterProps {
  calm: number | null;
  zone: Zone;
  status: MeterStatus;
  testID?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CENTER = RING_SIZE / 2;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FACE_SIZE = 40;
const NUMBER_LINE_RATIO = 1.15;
const NO_VALUE = '—';

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export function CalmMeter({ calm, zone, status, testID }: CalmMeterProps) {
  const { palette, t, lang, fontScale } = useUi();
  const isReducedMotion = useReduceMotion();
  const liveZone = status === 'live' && calm !== null && zone !== 'unknown' ? zone : null;
  const target = liveZone !== null && calm !== null ? clampPercent(calm) / 100 : 0;

  const [fill] = useState(() => new Animated.Value(target));
  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: target,
      duration: isReducedMotion ? 0 : METER_EASE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, target, isReducedMotion]);

  const word =
    liveZone !== null ? t(`zone.${liveZone}`) : t(status === 'adjustSensor' ? 'meter.adjustSensor' : 'meter.notConnected');
  const shown = liveZone !== null && calm !== null ? formatNumber(Math.round(clampPercent(calm)), lang) : null;
  const numberSize = TYPE_SIZE.calmNumber * fontScale;

  return (
    <View
      accessible
      accessibilityLabel={shown !== null ? t('meter.a11y', { value: shown, zone: word }) : word}
      style={styles.wrap}
      testID={testID}
    >
      <View style={styles.ring}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={palette.track} strokeWidth={RING_STROKE} fill="none" />
          {liveZone !== null && (
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={palette[liveZone]}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={fill.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
              fill="none"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            />
          )}
        </Svg>
        <View style={styles.center}>
          {liveZone !== null && <ZoneFace zone={liveZone} color={palette[liveZone]} size={FACE_SIZE} />}
          <AppText
            variant="calmNumber"
            color={shown !== null ? 'text' : 'neutral'}
            style={{ lineHeight: Math.round(numberSize * NUMBER_LINE_RATIO) }}
            testID={testID ? `${testID}-value` : undefined}
          >
            {shown ?? NO_VALUE}
            {shown !== null && (
              <AppText variant="title" isBold>
                {t('meter.percent')}
              </AppText>
            )}
          </AppText>
        </View>
      </View>
      <AppText variant="zone" color={liveZone ?? 'textMuted'} style={styles.word} testID={testID ? `${testID}-word` : undefined}>
        {word}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: SPACE.sm },
  ring: { width: RING_SIZE, height: RING_SIZE },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  word: { textAlign: 'center' },
});
