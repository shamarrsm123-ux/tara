// Screen backdrop (04a v3 §6): a soft top wash and two large blurred-looking blobs behind the content. The mood
// follows what is happening — warm by default, green when calm, amber when rising, rose when stress is high, blue
// while cooling — always pale enough that text contrast is unchanged (cards sit on white). Decorative only.
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BACKDROP, type BackdropMood } from '../theme/tokens';

const H = 900;
const W = 420;

export function Backdrop({ mood = 'warm' }: { mood?: BackdropMood }) {
  const [a, b] = BACKDROP[mood];
  const id = `bd-${mood}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants" testID={`backdrop-${mood}`}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice">
        <Defs>
          <LinearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={a} stopOpacity={0.85} />
            <Stop offset="0.45" stopColor={a} stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={`${id}-blobA`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={a} stopOpacity={0.9} />
            <Stop offset="1" stopColor={a} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-blobB`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={b} stopOpacity={0.9} />
            <Stop offset="1" stopColor={b} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={W} height={H} fill="#FFFFFF" />
        <Rect width={W} height={H} fill={`url(#${id}-wash)`} />
        <Circle cx={W - 30} cy={90} r={190} fill={`url(#${id}-blobA)`} />
        <Circle cx={-10} cy={420} r={200} fill={`url(#${id}-blobB)`} />
      </Svg>
    </View>
  );
}
