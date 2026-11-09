// Simple line faces for zones (04 §8): calm = soft smile, rising = neutral, high = worried brow. Not emoji.
import Svg, { Circle, Path } from 'react-native-svg';
import type { Zone } from '../../shared/types';

interface ZoneFaceProps {
  zone: Exclude<Zone, 'unknown'>;
  color: string;
  size: number;
}

const STROKE = 3.5;

const MOUTH: Record<ZoneFaceProps['zone'], string> = {
  calm: 'M15 27 Q24 35 33 27',
  rising: 'M16 30 L32 30',
  high: 'M15 33 Q24 25 33 33',
};

export function ZoneFace({ zone, color, size }: ZoneFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={21} stroke={color} strokeWidth={STROKE} fill="none" />
      <Circle cx={17} cy={19} r={2.6} fill={color} />
      <Circle cx={31} cy={19} r={2.6} fill={color} />
      {zone === 'high' && (
        <Path d="M12 13 L20 15 M36 13 L28 15" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      )}
      <Path d={MOUTH[zone]} stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
