// Hold-to-Confirm (04 §9.5) — only for Delete Everything. A ring fills over 3 s while the voice counts
// down; releasing early cancels. Prevents accidental taps with dusty or busy hands.
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { VoiceLineId } from '../../shared/types';
import { formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { DELETE_HOLD_MS, PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE } from '../theme/tokens';
import { playVoice, stopVoice } from '../voice/player';
import { AppText } from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 40;
const RING_STROKE = 5;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const TICK_MS = 100;
const MS_PER_S = 1000;

/** Whole seconds left to hold, as shown in the countdown. */
export function secondsLeft(elapsedMs: number, holdMs: number): number {
  return Math.max(0, Math.ceil((holdMs - elapsedMs) / MS_PER_S));
}

/** Starts a hold: ticks the countdown and fires `onDone` after `holdMs`. Returns a cancel function. */
export function startHold(holdMs: number, onTick: (secondsLeft: number) => void, onDone: () => void): () => void {
  const startedAt = Date.now();
  onTick(secondsLeft(0, holdMs));
  const tick = setInterval(() => onTick(secondsLeft(Date.now() - startedAt, holdMs)), TICK_MS);
  const done = setTimeout(() => {
    clearInterval(tick);
    onDone();
  }, holdMs);
  return () => {
    clearInterval(tick);
    clearTimeout(done);
  };
}

interface HoldToConfirmProps {
  label: string;
  onConfirm: () => void;
  voiceLine?: VoiceLineId;
  holdMs?: number;
  testID?: string;
}

export function HoldToConfirm({ label, onConfirm, voiceLine, holdMs = DELETE_HOLD_MS, testID }: HoldToConfirmProps) {
  const { palette, t, lang } = useUi();
  const [progress] = useState(() => new Animated.Value(0));
  const cancelHold = useRef<(() => void) | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => () => cancelHold.current?.(), []);

  const start = () => {
    if (cancelHold.current !== null) return;
    if (voiceLine !== undefined) playVoice(lang, voiceLine);
    Animated.timing(progress, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: false }).start();
    cancelHold.current = startHold(holdMs, setRemaining, () => {
      cancelHold.current = null;
      setRemaining(null);
      onConfirm();
    });
  };

  const cancel = () => {
    if (cancelHold.current === null) return; // already confirmed or never started
    cancelHold.current();
    cancelHold.current = null;
    progress.stopAnimation();
    progress.setValue(0);
    setRemaining(null);
    stopVoice();
  };

  const hint = t('deleteAll.hold', { seconds: formatNumber(holdMs / MS_PER_S, lang) });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      onPressIn={start}
      onPressOut={cancel}
      style={[styles.button, { backgroundColor: palette.high }]}
      testID={testID}
    >
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={RING_R} stroke={palette.onAccent} strokeOpacity={0.35} strokeWidth={RING_STROKE} fill="none" />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={RING_R}
          stroke={palette.onAccent}
          strokeWidth={RING_STROKE}
          strokeDasharray={`${RING_C} ${RING_C}`}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [RING_C, 0] })}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.text}>
        <AppText variant="button" color="onAccent">
          {label}
        </AppText>
        <AppText variant="caption" color="onAccent" testID={testID ? `${testID}-countdown` : undefined}>
          {remaining !== null ? formatNumber(remaining, lang) : hint}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: RADIUS.button,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  text: { flex: 1 },
});
