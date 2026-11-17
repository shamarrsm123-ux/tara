// The TARA woman (04 §8): a bust in a light, flowing tarha with the small sensor dot behind her ear. Drawn as an
// SVG group in a 200 × 200 box so scenes can place and scale her. Respectful and simple — soft closed-eye calm
// face, no exaggerated features. 🟡 Draft art to review with community members (13 Phase 12).
import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { ART } from '../theme/tokens';
import { useReduceMotion } from '../theme/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const PULSE_MS = 1100;

export type TarhaStyle = 'cream' | 'coral';

interface TarhaWomanProps {
  /** Position of the 200 × 200 figure box and its scale. */
  x?: number;
  y?: number;
  scale?: number;
  tarha?: TarhaStyle;
  skin?: string;
  /** Pulsing coral sensor dot behind the ear. */
  isSensing?: boolean;
  dotColor?: string;
}

function usePulse(isOn: boolean): Animated.Value {
  const isReducedMotion = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!isOn || isReducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: PULSE_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, isOn, isReducedMotion]);
  return pulse;
}

export function TarhaWoman({ x = 0, y = 0, scale = 1, tarha = 'cream', skin = ART.skinWarm, isSensing = false, dotColor = '#EF6A4A' }: TarhaWomanProps) {
  const pulse = usePulse(isSensing);
  const scarf = tarha === 'cream' ? ART.tarhaCream : ART.tarhaCoral;
  const scarfShade = tarha === 'cream' ? ART.tarhaShade : ART.tarhaCoralShade;
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* body / dress */}
      <Path d="M34 200 C40 160 66 142 100 142 C134 142 160 160 166 200 Z" fill={ART.dress} />
      <Path d="M100 142 C86 150 80 172 82 200 L118 200 C120 172 114 150 100 142 Z" fill={ART.dressShade} opacity={0.35} />
      {/* tarha: back drape falling over the shoulders */}
      <Path
        d="M100 22 C64 22 46 52 48 86 C50 110 44 128 30 152 C24 164 24 182 28 200 L64 200 C60 176 66 158 80 146 L120 146 C134 158 140 176 136 200 L172 200 C176 182 176 164 170 152 C156 128 150 110 152 86 C154 52 136 22 100 22 Z"
        fill={scarf}
      />
      {/* tarha folds */}
      <Path d="M56 120 C62 140 58 166 50 196 M146 118 C140 140 144 168 152 196" stroke={scarfShade} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* face opening, framed by the scarf edge */}
      <Path d="M100 44 C76 44 68 66 70 92 C72 116 84 132 100 134 C116 132 128 116 130 92 C132 66 124 44 100 44 Z" fill={scarfShade} />
      <Ellipse cx={100} cy={92} rx={26} ry={34} fill={skin} />
      {/* soft calm face: closed eyes, small smile, warm cheeks */}
      <Path d="M86 90 Q91 94 96 90 M104 90 Q109 94 114 90" stroke={ART.skinDeep} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M93 108 Q100 113 107 108" stroke={ART.skinDeep} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Circle cx={84} cy={102} r={5} fill={ART.blush} opacity={0.28} />
      <Circle cx={116} cy={102} r={5} fill={ART.blush} opacity={0.28} />
      {/* scarf crossing under the chin */}
      <Path d="M70 112 C80 140 120 140 130 112 C126 132 116 146 100 148 C84 146 74 132 70 112 Z" fill={scarf} />
      <Path d="M76 126 C90 140 112 140 124 126" stroke={scarfShade} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      {/* sensor dot behind the ear */}
      {isSensing && <AnimatedCircle cx={134} cy={98} r={12} fill={dotColor} opacity={pulse.interpolate({ inputRange: [0.3, 1], outputRange: [0.08, 0.28] })} />}
      <Circle cx={134} cy={98} r={5} fill={dotColor} />
    </G>
  );
}
