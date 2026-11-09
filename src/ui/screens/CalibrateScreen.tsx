// Flow 1b — Learn Your Calm (03, 04 §10): a breathing circle (in 4 s, out 6 s) inside a progress ring
// that fills with 60 valid seconds. It pauses with the fit message when the sensor isn't touching, and
// thanks her when done. Skip is a small link (default baseline).
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { MonitorSnapshot } from '../../engine/session';
import { AppText } from '../components/AppText';
import { ScreenFrame } from '../components/ScreenFrame';
import { useUi } from '../theme/UiProvider';
import { BREATHE_IN_MS, BREATHE_OUT_MS, TOUCH_MIN } from '../theme/tokens';
import { useReduceMotion } from '../theme/useReduceMotion';
import { playVoice } from '../voice/player';

interface CalibrateScreenProps {
  snapshot: MonitorSnapshot | null;
  isDemo: boolean;
  onSkip: () => void;
  onBack: () => void;
}

const SIZE = 240;
const RING = 14;
const R = (SIZE - RING) / 2;
const C = 2 * Math.PI * R;
const SMALL = 0.6;

export function CalibrateScreen({ snapshot, isDemo, onSkip, onBack }: CalibrateScreenProps) {
  const { t, palette, lang } = useUi();
  const isReducedMotion = useReduceMotion();
  const [isInhale, setIsInhale] = useState(true);
  const [scale] = useState(() => new Animated.Value(SMALL));
  const calibration = snapshot?.calibration ?? null;
  const isDone = calibration?.isDone === true;
  const isPaused = calibration?.isPaused === true;

  useEffect(() => {
    if (isDone) return undefined;
    const duration = isInhale ? BREATHE_IN_MS : BREATHE_OUT_MS;
    const animation = Animated.timing(scale, {
      toValue: isInhale ? 1 : SMALL,
      duration: isReducedMotion ? 0 : duration,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: false,
    });
    animation.start();
    const id = setTimeout(() => setIsInhale((v) => !v), duration);
    return () => {
      animation.stop();
      clearTimeout(id);
    };
  }, [isInhale, isDone, isReducedMotion, scale]);

  useEffect(() => {
    if (isDone) playVoice(lang, 'calibrateDone');
  }, [isDone, lang]);

  const progress = calibration?.progress ?? 0;
  const message = isDone ? t('calibrate.done') : isPaused ? t('connect.fitMove') : isInhale ? t('calibrate.breatheIn') : t('calibrate.breatheOut');

  return (
    <ScreenFrame testID="screen-calibrate" voiceLine="calibrateIntro" onBack={onBack} demo={isDemo ? { isSpedUp: false } : null}>
      <AppText variant="body">{t('calibrate.intro')}</AppText>
      <View style={styles.circleBox} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={palette.track} strokeWidth={RING} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={isPaused ? palette.neutral : palette.calm}
            strokeWidth={RING}
            strokeDasharray={`${C} ${C}`}
            strokeDashoffset={C * (1 - progress)}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <Animated.View style={[styles.breath, { backgroundColor: palette.bandCool, transform: [{ scale }] }]} />
      </View>
      <AppText variant="question" style={styles.center} testID="calibrate-message">
        {message}
      </AppText>
      {!isDone && (
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip} testID="calibrate-skip">
          <AppText variant="body" color="textMuted">
            {t('calibrate.skip')}
          </AppText>
        </Pressable>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  circleBox: { width: SIZE, height: SIZE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  breath: { width: SIZE - 4 * RING, height: SIZE - 4 * RING, borderRadius: SIZE },
  center: { textAlign: 'center' },
  skip: { minHeight: TOUCH_MIN, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
