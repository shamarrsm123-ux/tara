// Simple line icons and the Welcome illustration (04 §8). 🟡 Placeholders drawn in code: the final
// illustrations of a woman in a light tarha must be made and reviewed with community members (13 Phase 12).
import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useReduceMotion } from '../theme/useReduceMotion';

interface IconProps {
  color: string;
  size?: number;
}

const STROKE = 2.4;
const DEFAULT_SIZE = 32;
const PULSE_MS = 900;

export function IconWoman({ color, size = DEFAULT_SIZE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M8 14 Q8 4 16 4 Q24 4 24 14 L24 20 Q16 23 8 20 Z" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" />
      <Circle cx={16} cy={13} r={4.5} stroke={color} strokeWidth={STROKE} />
      <Path d="M6 30 Q16 22 26 30" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

export function IconEarSensor({ color, size = DEFAULT_SIZE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M12 26 Q8 24 9 19 Q10 15 8 12 Q7 5 15 4 Q22 4 23 11 Q24 16 19 19 Q17 21 17 24" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={25} cy={20} r={3} fill={color} />
    </Svg>
  );
}

export function IconSnow({ color, size = DEFAULT_SIZE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 3 V29 M4.7 9.5 L27.3 22.5 M4.7 22.5 L27.3 9.5 M12 5 L16 9 L20 5 M12 27 L16 23 L20 27"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconLock({ color, size = DEFAULT_SIZE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x={7} y={14} width={18} height={14} rx={3} stroke={color} strokeWidth={STROKE} />
      <Path d="M11 14 V10 Q11 4 16 4 Q21 4 21 10 V14" stroke={color} strokeWidth={STROKE} />
      <Circle cx={16} cy={21} r={2} fill={color} />
    </Svg>
  );
}

export function IconLink({ color, size = DEFAULT_SIZE }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M8 22 Q4 12 16 6 Q28 12 24 22" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      <Circle cx={16} cy={20} r={3.5} fill={color} />
    </Svg>
  );
}

export function IconBattery({ color, size = DEFAULT_SIZE, pct }: IconProps & { pct: number }) {
  const fill = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Rect x={3} y={10} width={23} height={12} rx={2.5} stroke={color} strokeWidth={STROKE} />
      <Rect x={27} y={14} width={2.5} height={4} rx={1} fill={color} />
      <Rect x={5.5} y={12.5} width={18 * fill} height={7} rx={1} fill={color} />
    </Svg>
  );
}

export function IconBack({ color, size = DEFAULT_SIZE, isFlipped }: IconProps & { isFlipped: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={isFlipped ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M20 6 L10 16 L20 26" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** A woman in a light tarha with the sensor dot behind her ear; the dot glows when `isGlowing`. */
export function TarhaIllustration({
  scarf,
  skin,
  dot,
  size = 180,
  isGlowing = false,
}: {
  scarf: string;
  skin: string;
  dot: string;
  size?: number;
  isGlowing?: boolean;
}) {
  const isReducedMotion = useReduceMotion();
  const [glow] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!isGlowing || isReducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.35, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 1, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow, isGlowing, isReducedMotion]);

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path d="M28 112 Q60 84 92 112 Z" fill={scarf} />
      <Path d="M30 62 Q28 18 60 16 Q92 18 90 62 Q92 92 60 98 Q28 92 30 62 Z" fill={scarf} />
      <Circle cx={60} cy={58} r={22} fill={skin} />
      <Circle cx={83} cy={64} r={8} fill={dot} opacity={0.25} />
      <AnimatedCircle cx={83} cy={64} r={4.5} fill={dot} opacity={glow} />
    </Svg>
  );
}
