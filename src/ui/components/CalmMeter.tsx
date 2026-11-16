// Calm Meter (04a D1): a segmented arc of rounded blocks; filled blocks take the zone color (green / amber /
// red), with the zone face, the big number and the zone word inside — color + face + word (04 §1). Not
// connected / poor fit: all blocks empty, "—", status word. The zone always comes from signal/.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { G, Rect } from 'react-native-svg';
import type { Zone } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { ZoneFace } from '../icons/ZoneFace';
import { useUi } from '../theme/UiProvider';
import { METER_EASE_MS, TYPE_SIZE } from '../theme/tokens';
import { useReduceMotion } from '../theme/useReduceMotion';
import { AppText } from './AppText';

export type MeterStatus = 'live' | 'notConnected' | 'adjustSensor';

const SEGMENTS = 11;
const SWEEP_DEG = 220;
const START_DEG = 200;
const WIDTH = 300;
const HEIGHT = 250;
const CX = WIDTH / 2;
const CY = 150;
const R = 116;
const SEG_W = 38;
const SEG_H = 52;
const SEG_RX = 14;
const FACE_SIZE = 36;
const NUMBER_LINE_RATIO = 1.1;
const NO_VALUE = '—';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** Segment centres and rotations along the arc, left to right over the top. */
export const SEGMENT_LAYOUT = Array.from({ length: SEGMENTS }, (_, i) => {
  const deg = START_DEG - (i * SWEEP_DEG) / (SEGMENTS - 1);
  const rad = (deg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad), rotate: 90 - deg };
});

interface SegmentedArcProps {
  /** 0–1 */
  fraction: number;
  color: string;
  trackColor: string;
}

/** The arc on its own — also used as the Learn Your Calm progress (04a §4). */
export function SegmentedArc({ fraction, color, trackColor }: SegmentedArcProps) {
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

  return (
    <Svg width={WIDTH} height={HEIGHT} style={[StyleSheet.absoluteFill, isRtl ? styles.mirrored : null]}>
      {SEGMENT_LAYOUT.map((s, i) => (
        <G key={i} transform={`translate(${s.x} ${s.y}) rotate(${s.rotate})`}>
          <Rect x={-SEG_W / 2} y={-SEG_H / 2} width={SEG_W} height={SEG_H} rx={SEG_RX} fill={trackColor} />
          <AnimatedRect
            x={-SEG_W / 2}
            y={-SEG_H / 2}
            width={SEG_W}
            height={SEG_H}
            rx={SEG_RX}
            fill={color}
            opacity={fill.interpolate({ inputRange: [i / SEGMENTS, (i + 1) / SEGMENTS], outputRange: [0, 1], extrapolate: 'clamp' })}
          />
        </G>
      ))}
    </Svg>
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
    <View accessible accessibilityLabel={shown !== null ? t('meter.a11y', { value: shown, zone: word }) : word} style={styles.box} testID={testID}>
      <SegmentedArc fraction={fraction} color={liveZone !== null ? palette[liveZone] : palette.track} trackColor={palette.track} />
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
        <AppText variant="zone" color={liveZone ?? 'textMuted'} style={styles.word} testID={testID ? `${testID}-word` : undefined}>
          {word}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: WIDTH, height: HEIGHT, alignSelf: 'center' },
  mirrored: { transform: [{ scaleX: -1 }] },
  center: { position: 'absolute', left: 0, right: 0, top: CY - 86, alignItems: 'center' },
  word: { textAlign: 'center' },
});
