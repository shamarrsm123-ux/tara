// Live Graph (04 §9.2): pale green/amber/red background bands, one thick line, blue band where cooling
// was on, no gridlines, just start/end time labels. In RTL, time flows in the reading direction (04 §5).
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { formatClock, formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { coolingRects, linePaths, zoneBands, type GraphFrame, type GraphPoint, type TimeBand } from './graphGeometry';

interface LiveGraphProps {
  points: readonly GraphPoint[];
  coolingBands?: readonly TimeBand[];
  nowMs: number;
  windowMs: number;
  height?: number;
  testID?: string;
}

const DEFAULT_HEIGHT = 140;
const LINE_WIDTH = 4;
const MS_PER_MIN = 60_000;

export function LiveGraph({ points, coolingBands = [], nowMs, windowMs, height = DEFAULT_HEIGHT, testID }: LiveGraphProps) {
  const { palette, t, lang, isRtl } = useUi();
  const [width, setWidth] = useState(0);
  const frame: GraphFrame = { width, height, startMs: nowMs - windowMs, endMs: nowMs };
  const bands = zoneBands(frame);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View
      accessible
      accessibilityLabel={t('graph.a11y', { minutes: formatNumber(Math.round(windowMs / MS_PER_MIN), lang) })}
      testID={testID}
    >
      <View onLayout={onLayout} style={[styles.plot, { height }]}>
        {width > 0 && (
          <Svg width={width} height={height} style={isRtl ? styles.mirrored : undefined}>
            <Rect x={0} y={bands.calm.y} width={width} height={bands.calm.height} fill={palette.bandCalm} />
            <Rect x={0} y={bands.rising.y} width={width} height={bands.rising.height} fill={palette.bandRising} />
            <Rect x={0} y={bands.high.y} width={width} height={bands.high.height} fill={palette.bandHigh} />
            {coolingRects(coolingBands, frame).map((r) => (
              <Rect key={`cool-${r.x}`} x={r.x} y={0} width={r.width} height={height} fill={palette.bandCool} />
            ))}
            {linePaths(points, frame).map((d) => (
              <Path key={d.slice(0, 24)} d={d} stroke={palette.text} strokeWidth={LINE_WIDTH} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" color="textMuted">
          {formatClock(frame.startMs, lang)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {formatClock(frame.endMs, lang)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { alignSelf: 'stretch', borderRadius: 12, overflow: 'hidden' },
  mirrored: { transform: [{ scaleX: -1 }] },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE.xs },
});
