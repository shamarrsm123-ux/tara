// Live Graph (04 §9.2, 04a D5): a white card with rounded bars (one per 10 s) colored by zone, grey dots
// where there was no valid signal, a blue band under cooling, and start/end time labels. In RTL, time flows
// in the reading direction (04 §5).
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { formatClock, formatNumber } from '../i18n/format';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { barSeries, coolingRects, yFor, type GraphFrame, type GraphPoint, type TimeBand } from './graphGeometry';
import { Card } from './Surface';

interface LiveGraphProps {
  points: readonly GraphPoint[];
  coolingBands?: readonly TimeBand[];
  nowMs: number;
  windowMs: number;
  height?: number;
  testID?: string;
}

const DEFAULT_HEIGHT = 120;
const BUCKET_MS = 10_000;
const BAR_GAP = 2;
const MIN_BAR = 4;
const DOT_R = 2;
const BAND_RADIUS = 8;
const MS_PER_MIN = 60_000;

export function LiveGraph({ points, coolingBands = [], nowMs, windowMs, height = DEFAULT_HEIGHT, testID }: LiveGraphProps) {
  const { palette, t, lang, isRtl } = useUi();
  const [width, setWidth] = useState(0);
  const frame: GraphFrame = { width, height, startMs: nowMs - windowMs, endMs: nowMs };
  const label = t('graph.a11y', { minutes: formatNumber(Math.round(windowMs / MS_PER_MIN), lang) });
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const bars = width > 0 ? barSeries(points, frame, Math.round(windowMs / BUCKET_MS)) : [];

  return (
    <Card testID={testID}>
      <View accessible accessibilityLabel={label}>
        <AppText variant="body" isBold>
          {label}
        </AppText>
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height} style={isRtl ? styles.mirrored : undefined}>
            {coolingRects(coolingBands, frame).map((r) => (
              <Rect key={`cool-${r.x}`} x={r.x} y={0} width={Math.max(r.width, MIN_BAR)} height={height} rx={BAND_RADIUS} fill={palette.bandCool} />
            ))}
            {bars.map((b) => {
              const w = Math.max(b.width - BAR_GAP, 2);
              if (b.calm === null || b.zone === null) {
                return <Circle key={b.x} cx={b.x + b.width / 2} cy={height - DOT_R} r={DOT_R} fill={palette.neutral} />;
              }
              const y = Math.min(yFor(b.calm, frame), height - MIN_BAR);
              return <Rect key={b.x} x={b.x + BAR_GAP / 2} y={y} width={w} height={height - y} rx={w / 2} fill={palette[b.zone]} />;
            })}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -SPACE.xs },
});
