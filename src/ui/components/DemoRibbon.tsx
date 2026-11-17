// Demo Ribbon (04 §9.6, 08 §12; shape per 04a v2 D7): a yellow banner across the top of the screen and a
// yellow "DEMO" badge pinned to the top-right corner. Rendered by the screen root while the demo source is
// active. It has no dismiss — it cannot be hidden. The parent must be `position: relative`.
import { StyleSheet, View } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';

interface DemoRibbonProps {
  /** Time-compressed scenarios must say "sped up" (08 §12). */
  isSpedUp?: boolean;
}

/** Keeps the banner's label clear of the corner badge, so it is never covered (08 §12). */
const BAR_SIDE_CLEARANCE = 72;

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
      <View pointerEvents="none" style={[styles.corner, { backgroundColor: palette.demo, borderColor: palette.surface }]} testID="demo-ribbon-corner">
        <AppText variant="caption" isBold color="onDemo">
          {t('demo.corner')}
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { alignSelf: 'stretch', paddingVertical: 6, paddingHorizontal: BAR_SIDE_CLEARANCE },
  center: { textAlign: 'center' },
  corner: {
    position: 'absolute',
    top: SPACE.sm,
    right: SPACE.sm,
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 2,
    zIndex: 10,
  },
});
