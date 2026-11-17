// Live Graph (04 §9.2, 04a v2 D5): section title, then a smooth coral line with a soft gradient fill (one point
// per 10 s), dashed guides at the High and Calm thresholds, a blue band under cooling, grey dots where there
// was no valid signal, and the latest point ringed in its zone color with a guide line down. Start/end time
// labels. In RTL, time flows in the reading direction (04 §5).
import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { CALM_ZONE_MIN_C, HIGH_ZONE_MAX_C } from "../../engine/constants";
import { formatClock, formatNumber } from "../i18n/format";
import { useUi } from "../theme/UiProvider";
import { SPACE } from "../theme/tokens";
import { AppText } from "./AppText";
import {
  areaPath,
  barSeries,
  coolingRects,
  lineSegments,
  smoothPath,
  yFor,
  type GraphFrame,
  type GraphPoint,
  type TimeBand,
} from "./graphGeometry";

interface LiveGraphProps {
  points: readonly GraphPoint[];
  coolingBands?: readonly TimeBand[];
  nowMs: number;
  windowMs: number;
  height?: number;
  /** Replaces the default "Calm over the last N minutes" title. */
  title?: string;
  testID?: string;
}

const DEFAULT_HEIGHT = 150;
const BUCKET_MS = 10_000;
const DOT_R = 2.5;
const MARKER_R = 7;
const BAND_RADIUS = 8;
const MS_PER_MIN = 60_000;
const PAD_Y = MARKER_R + 2;
/** Keeps the latest-point marker inside the drawing at both ends. */
const PAD_X = MARKER_R + 2;
const GRADIENT_ID = "calmFill";

export function LiveGraph({
  points,
  coolingBands = [],
  nowMs,
  windowMs,
  height = DEFAULT_HEIGHT,
  title,
  testID,
}: LiveGraphProps) {
  const { palette, t, lang, isRtl } = useUi();
  const [width, setWidth] = useState(0);
  const plotH = height - PAD_Y * 2;
  const frame: GraphFrame = {
    width: Math.max(width - PAD_X * 2, 0),
    height: plotH,
    startMs: nowMs - windowMs,
    endMs: nowMs,
  };
  const label =
    title ??
    t("graph.a11y", {
      minutes: formatNumber(Math.round(windowMs / MS_PER_MIN), lang),
    });
  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(Math.round(e.nativeEvent.layout.width));
  const bars =
    width > 0 ? barSeries(points, frame, Math.round(windowMs / BUCKET_MS)) : [];
  const segments = lineSegments(bars, frame);
  const lastBar = [...bars].reverse().find((b) => b.zone !== null);
  const lastPoint = segments[segments.length - 1]?.at(-1);

  return (
    <View style={styles.root} testID={testID}>
      <View accessible accessibilityLabel={label}>
        <AppText variant="question" isBold>
          {label}
        </AppText>
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg
            width={width}
            height={height}
            style={isRtl ? styles.mirrored : undefined}
          >
            <Defs>
              <LinearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={palette.accent}
                  stopOpacity={0.28}
                />
                <Stop offset="1" stopColor={palette.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <G transform={`translate(${PAD_X} 0)`}>
              {coolingRects(coolingBands, frame).map((r) => (
                <Rect
                  key={`cool-${r.x}`}
                  x={r.x}
                  y={0}
                  width={Math.max(r.width, 4)}
                  height={height}
                  rx={BAND_RADIUS}
                  fill={palette.bandCool}
                />
              ))}
              {[CALM_ZONE_MIN_C, HIGH_ZONE_MAX_C].map((c) => (
                <Line
                  key={c}
                  x1={0}
                  x2={frame.width}
                  y1={PAD_Y + yFor(c, frame)}
                  y2={PAD_Y + yFor(c, frame)}
                  stroke={palette.sand}
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
              ))}
              {segments.map((seg) => (
                <Path
                  key={`a-${seg[0]?.x}`}
                  d={areaPath(seg, plotH)}
                  fill={`url(#${GRADIENT_ID})`}
                  transform={`translate(0 ${PAD_Y})`}
                />
              ))}
              {segments.map((seg) => (
                <Path
                  key={`l-${seg[0]?.x}`}
                  d={smoothPath(seg)}
                  stroke={palette.accent}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  transform={`translate(0 ${PAD_Y})`}
                />
              ))}
              {bars
                .filter((b) => b.calm === null)
                .map((b) => (
                  <Circle
                    key={`n-${b.x}`}
                    cx={b.x + b.width / 2}
                    cy={height - DOT_R}
                    r={DOT_R}
                    fill={palette.neutral}
                  />
                ))}
              {lastPoint !== undefined && lastBar?.zone != null && (
                <>
                  <Line
                    x1={lastPoint.x}
                    x2={lastPoint.x}
                    y1={PAD_Y + lastPoint.y}
                    y2={height}
                    stroke={palette.sand}
                    strokeWidth={1.5}
                  />
                  <Circle
                    cx={lastPoint.x}
                    cy={PAD_Y + lastPoint.y}
                    r={MARKER_R}
                    fill={palette.surface}
                    stroke={palette[lastBar.zone]}
                    strokeWidth={3}
                  />
                </>
              )}
            </G>
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
  root: { gap: SPACE.md },
  mirrored: { transform: [{ scaleX: -1 }] },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -SPACE.sm,
  },
});
