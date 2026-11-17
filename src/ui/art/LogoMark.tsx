// TARA's mark: a soft tarha-drop shape in a coral gradient with the sensor dot — used as the app avatar.
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" accessible={false}>
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF9B7A" />
          <Stop offset="1" stopColor="#EF6A4A" />
        </LinearGradient>
      </Defs>
      <Circle cx={28} cy={28} r={28} fill="url(#logoBg)" />
      <Path d="M28 11 C18 11 14 19 15 27 C15.5 33 13 38 10 44 L46 44 C43 38 40.5 33 41 27 C42 19 38 11 28 11 Z" fill="#FFF8F1" />
      <Path d="M28 18 C22.5 18 21 23 21.5 28 C22 33 25 36.5 28 36.5 C31 36.5 34 33 34.5 28 C35 23 33.5 18 28 18 Z" fill="#F1DCCB" />
      <Circle cx={37.5} cy={29} r={2.6} fill="#EF6A4A" />
    </Svg>
  );
}
