// Illustrated scenes (04 §8, 04a v3 §6), drawn in code so nothing is downloaded (P1): the sunny field she works
// in, the cooling breeze around her head, and her phone keeping her data. Decorative only — hidden from screen
// readers; the words beside them carry the meaning (04 §1). The artboard always fits whole (never cropped); sky
// and ground run past its edges so wide cards and tablets are filled. 🟡 Draft art to review with the communities.
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ART } from '../theme/tokens';
import { TarhaWoman, type TarhaStyle } from './TarhaWoman';

const W = 360;
/** Background layers extend this far past the artboard on each side. */
const BLEED = 720;
type Pt = readonly [number, number];
const SNOW: readonly Pt[] = [
  [62, 54],
  [300, 46],
  [44, 150],
  [318, 140],
  [250, 24],
];
const SPARKLES: readonly Pt[] = [
  [110, 64],
  [256, 140],
  [96, 140],
];

interface SceneFrameProps {
  height: number;
  /** Drawing height of the 360-wide artboard (scenes made for wide cards use a shorter one). */
  artHeight?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}

function SceneFrame({ height, artHeight = 240, radius = 28, style, children, testID }: SceneFrameProps) {
  return (
    <View style={[styles.frame, { height, borderRadius: radius }, style]} accessible={false} importantForAccessibility="no-hide-descendants" testID={testID}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${artHeight}`} preserveAspectRatio="xMidYMax meet">
        {children}
      </Svg>
    </View>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} opacity={0.85}>
      <Path d="M0 20 C0 10 10 6 18 10 C22 2 36 0 42 10 C52 8 58 16 56 22 C56 28 50 30 44 30 L8 30 C2 30 0 26 0 20 Z" fill={ART.cloud} />
    </G>
  );
}

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`} opacity={0.75}>
      <Path d="M20 80 C22 56 24 34 30 14" stroke={ART.palm} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path
        d="M30 14 C18 6 6 10 0 18 C10 14 20 14 30 16 Z M30 14 C42 4 56 8 62 16 C50 12 40 13 30 16 Z M30 14 C24 2 30 -6 40 -8 C34 0 32 6 31 14 Z M30 14 C20 18 12 30 12 38 C18 28 24 22 30 17 Z M30 14 C40 20 46 30 46 38 C40 28 35 22 30 17 Z"
        fill={ART.palm}
      />
    </G>
  );
}

/** Golden afternoon in the field: sky, sun, clouds, palms, rolling fields, and her in front. */
export function SunnyFieldScene({ height = 240, tarha = 'cream', isSensing = true, style }: { height?: number; tarha?: TarhaStyle; isSensing?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <SceneFrame height={height} style={style} testID="scene-field">
      <Defs>
        <LinearGradient id="fieldSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ART.skyTop} />
          <Stop offset="1" stopColor={ART.skyBottom} />
        </LinearGradient>
        <RadialGradient id="fieldSun" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={ART.sunGlow} stopOpacity={0.9} />
          <Stop offset="1" stopColor={ART.sunGlow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={-BLEED} width={W + 2 * BLEED} height={240} fill="url(#fieldSky)" />
      <Circle cx={286} cy={92} r={70} fill="url(#fieldSun)" />
      <Circle cx={286} cy={92} r={30} fill={ART.sun} />
      <Cloud x={34} y={62} s={1} />
      <Cloud x={176} y={48} s={0.7} />
      <Rect x={-BLEED} y={146} width={W + 2 * BLEED} height={94} fill={ART.hillFar} />
      <Path d="M0 150 C60 124 120 132 180 142 C240 152 300 126 360 132 L360 240 L0 240 Z" fill={ART.hillFar} />
      <Palm x={18} y={84} s={0.9} />
      <Palm x={300} y={96} s={0.75} />
      <Rect x={-BLEED} y={176} width={W + 2 * BLEED} height={64} fill={ART.fieldMid} />
      <Path d="M0 180 C80 160 160 170 230 178 C290 184 330 170 360 166 L360 240 L0 240 Z" fill={ART.fieldMid} />
      <Rect x={-BLEED} y={204} width={W + 2 * BLEED} height={36} fill={ART.fieldNear} />
      <Path d="M0 212 C90 196 200 204 360 196 L360 240 L0 240 Z" fill={ART.fieldNear} />
      <TarhaWoman x={112} y={84} scale={0.78} tarha={tarha} isSensing={isSensing} />
    </SceneFrame>
  );
}

/** Cooling on: soft blue air, breeze arcs around her head, and a few snow sparkles. Drawn for a wide card. */
export function CoolBreezeScene({ height = 150, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const H = 160;
  return (
    <SceneFrame height={height} artHeight={H} radius={22} style={style} testID="scene-breeze">
      <Defs>
        <LinearGradient id="coolSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ART.coolTop} />
          <Stop offset="1" stopColor={ART.coolBottom} />
        </LinearGradient>
      </Defs>
      <Rect x={-BLEED} width={W + 2 * BLEED} height={H} fill="url(#coolSky)" />
      {[0, 1, 2].map((i) => (
        <Path
          key={i}
          d={`M${84 - i * 26} ${104 - i * 4} C${104 - i * 26} ${22 - i * 12} ${256 + i * 26} ${22 - i * 12} ${276 + i * 26} ${104 - i * 4}`}
          stroke={i === 0 ? ART.breeze : ART.breezeSoft}
          strokeWidth={5 - i * 1.2}
          strokeLinecap="round"
          strokeDasharray={i === 0 ? undefined : '16 12'}
          fill="none"
        />
      ))}
      {SNOW.map(([cx, cy]) => (
        <G key={`${cx}-${cy}`} transform={`translate(${cx} ${cy * 0.66})`} opacity={0.8}>
          <Path d="M0 -7 V7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5" stroke={ART.breeze} strokeWidth={2} strokeLinecap="round" />
        </G>
      ))}
      <TarhaWoman x={114} y={28} scale={0.66} tarha="cream" />
    </SceneFrame>
  );
}

/** Her phone holding her data: a phone with a shield, a lock and leaves — "stays on your phone". */
export function PhoneShieldScene({ height = 200, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <SceneFrame height={height} style={style} testID="scene-shield">
      <Defs>
        <LinearGradient id="shieldBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE4D6" />
          <Stop offset="1" stopColor="#FFF6EE" />
        </LinearGradient>
        <LinearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF9B7A" />
          <Stop offset="1" stopColor="#EF6A4A" />
        </LinearGradient>
      </Defs>
      <Rect x={-BLEED} width={W + 2 * BLEED} height={240} fill="url(#shieldBg)" />
      <Circle cx={70} cy={60} r={46} fill="#FFFFFF" opacity={0.5} />
      <Circle cx={300} cy={190} r={60} fill="#FFFFFF" opacity={0.45} />
      <Path d="M60 210 C70 170 92 160 104 150 C96 176 84 196 60 210 Z" fill={ART.leaf} />
      <Path d="M300 214 C292 178 270 166 258 158 C264 184 278 204 300 214 Z" fill={ART.leaf} opacity={0.85} />
      <Rect x={132} y={30} width={96} height={186} rx={20} fill={ART.phone} />
      <Rect x={139} y={42} width={82} height={162} rx={14} fill={ART.screen} />
      <Path d="M180 76 L208 88 V112 C208 134 194 148 180 154 C166 148 152 134 152 112 V88 Z" fill="url(#shieldFill)" />
      <Path d="M167 114 L177 124 L194 104" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={164} y={172} width={32} height={6} rx={3} fill={ART.tarhaShade} />
      <G transform="translate(244 70)">
        <Rect x={0} y={14} width={34} height={28} rx={6} fill="#FFFFFF" />
        <Path d="M7 14 V8 C7 -1 27 -1 27 8 V14" stroke="#FFFFFF" strokeWidth={5} fill="none" />
        <Circle cx={17} cy={28} r={4} fill="#EF6A4A" />
      </G>
      {SPARKLES.map(([cx, cy]) => (
        <Path key={`${cx}-${cy}`} d={`M${cx} ${cy - 7} L${cx + 2} ${cy - 2} L${cx + 7} ${cy} L${cx + 2} ${cy + 2} L${cx} ${cy + 7} L${cx - 2} ${cy + 2} L${cx - 7} ${cy} L${cx - 2} ${cy - 2} Z`} fill="#FFB27A" />
      ))}
    </SceneFrame>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignSelf: 'stretch' },
});
