// Calm Meter (04a v2 D1): a thick round ring with a rounded end and a thin dashed inner circle; the filled arc
// takes the zone color (green / amber / red), with the zone face, the big number and the zone word inside —
// color + face + word (04 §1). Not connected / poor fit: empty ring, "—", status word. The zone always comes
// from signal/. `ProgressRing` is the same ring on its own, used by Learn Your Calm.
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import type { Zone } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { ZoneFace } from '../icons/ZoneFace';
import { useUi } from '../theme/UiProvider';
import { METER_EASE_MS, RING_GRADIENT, RING_SIZE, RING_STROKE, TYPE_SIZE } from '../theme/tokens';
import { useReduceMotion } from '../theme/useReduceMotion';
import { AppText } from './AppText';

export type MeterStatus = 'live' | 'notConnected' | 'adjustSensor';

const R = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const INNER_GAP = 22;
const INNER_R = R - RING_STROKE / 2 - INNER_GAP;
const DASH = '5 7';
const FACE_SIZE = 30;
const NUMBER_LINE_RATIO = 1.05;
const NO_VALUE = '—';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

interface ProgressRingProps {
  /** 0–1 */
  fraction: number;
  color: string;
  trackColor: string;
  /** Lighter start color: the arc fades from this into `color` (04a v3 §6). */
  gradientFrom?: string;
  children?: ReactNode;
}

/** The ring on its own, filling clockwise from the top (counter-clockwise in RTL). */
export function ProgressRing({ fraction, color, trackColor, gradientFrom, children }: ProgressRingProps) {
  const { isRtl } = useUi();
  const isReducedMotion = useReduceMotion();
  const [fill] = useState(() => new Animated.Value(fraction));
  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: fraction,
      duration: isReducedMotion ? 0 : METER_EASE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill, fraction, isReducedMotion]);

  const c = RING_SIZE / 2;
  const id = `ring-${color.replace('#', '')}`;
  return (
    <View style={styles.box}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={[StyleSheet.absoluteFill, isRtl ? styles.mirrored : null]}>
        <Defs>
          <LinearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradientFrom ?? color} />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
          <RadialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.55" stopColor={color} stopOpacity={0.14} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {fraction > 0 && <Circle cx={c} cy={c} r={c} fill={`url(#${id}-halo)`} />}
        <Circle cx={c} cy={c} r={R} stroke={trackColor} strokeWidth={RING_STROKE} fill="none" />
        <Circle cx={c} cy={c} r={INNER_R - 4} fill="#FFFFFF" opacity={0.9} />
        <Circle cx={c} cy={c} r={INNER_R} stroke={color} strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray={DASH} fill="none" />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={R}
          stroke={`url(#${id}-arc)`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={fill.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0], extrapolate: 'clamp' })}
          strokeOpacity={fraction <= 0 ? 0 : 1}
          fill="none"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

interface CalmMeterProps {
  calm: number | null;
  zone: Zone;
  status: MeterStatus;
  testID?: string;
}

export function CalmMeter({ calm, zone, status, testID }: CalmMeterProps) {
  const { palette, t, lang, fontScale } = useUi();
  const liveZone = status === 'live' && calm !== null && zone !== 'unknown' ? zone : null;
  const word = liveZone !== null ? t(`zone.${liveZone}`) : t(status === 'adjustSensor' ? 'meter.adjustSensor' : 'meter.notConnected');
  const shown = liveZone !== null && calm !== null ? formatNumber(Math.round(clampPercent(calm)), lang) : null;
  const fraction = liveZone !== null && calm !== null ? clampPercent(calm) / 100 : 0;
  const numberSize = TYPE_SIZE.calmNumber * fontScale;

  return (
    <View accessible accessibilityLabel={shown !== null ? t('meter.a11y', { value: shown, zone: word }) : word} testID={testID}>
      <ProgressRing
        fraction={fraction}
        color={liveZone !== null ? palette[liveZone] : palette.neutral}
        gradientFrom={liveZone !== null ? RING_GRADIENT[liveZone] : undefined}
        trackColor={palette.track}
      >
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
        <AppText variant="zone" color={liveZone ?? 'textMuted'} style={styles.word} testID={testID ? `${testID}-word` : undefined}>
          {word}
        </AppText>
      </ProgressRing>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: RING_SIZE, height: RING_SIZE, alignSelf: 'center' },
  mirrored: { transform: [{ scaleX: -1 }] },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: RING_STROKE + INNER_GAP },
  word: { textAlign: 'center' },
});
