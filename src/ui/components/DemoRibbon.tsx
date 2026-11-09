// Demo Ribbon (04 §9.6, 08 §12): yellow bar under the status bar plus a diagonal corner ribbon.
// Rendered by the screen root while the demo source is active. It has no dismiss — it cannot be hidden.
// The parent must be `position: relative` with `overflow: 'hidden'` so the corner ribbon clips cleanly.
import { StyleSheet, View } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';

interface DemoRibbonProps {
  /** Time-compressed scenarios must say "sped up" (08 §12). */
  isSpedUp?: boolean;
}

const CORNER_WIDTH = 160;
const CORNER_OFFSET = 34;
/** Keeps the bar's label clear of the corner ribbon on both sides, so it is never covered (08 §12). */
const BAR_SIDE_CLEARANCE = 64;

export function DemoRibbon({ isSpedUp = false }: DemoRibbonProps) {
  const { palette, t } = useUi();
  return (
    <>
      <View accessible accessibilityRole="text" style={[styles.bar, { backgroundColor: palette.demo }]} testID="demo-ribbon-bar">
        <AppText variant="caption" isBold color="onDemo" style={styles.center}>
          {t('demo.ribbon')}
        </AppText>
        {isSpedUp && (
          <AppText variant="caption" color="onDemo" style={styles.center}>
            {t('demo.spedUp')}
          </AppText>
        )}
      </View>
      <View pointerEvents="none" style={[styles.corner, { backgroundColor: palette.demo }]} testID="demo-ribbon-corner">
        <AppText variant="caption" isBold color="onDemo" style={styles.center}>
          {t('demo.corner')}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { alignSelf: 'stretch', paddingVertical: SPACE.xs, paddingHorizontal: BAR_SIDE_CLEARANCE },
  center: { textAlign: 'center' },
  corner: {
    position: 'absolute',
    top: CORNER_OFFSET / 2 + SPACE.md,
    right: -CORNER_OFFSET,
    width: CORNER_WIDTH,
    transform: [{ rotate: '45deg' }],
    paddingVertical: 2,
    zIndex: 10,
  },
});
