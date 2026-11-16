// Shared surfaces from 04a §3–4: the white rounded card with one soft shadow, and the tag pill (dot + word)
// used for status everywhere (fit, High stress, Cooling).
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SHADOW, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

export function Card({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const { palette } = useUi();
  return (
    <View style={[styles.card, { backgroundColor: palette.surface }, style]} testID={testID}>
      {children}
    </View>
  );
}

const DOT = 12;

/** Pill with a colored dot and a word — never color alone (04 §1). */
export function Tag({ label, color, testID }: { label: string; color: string; testID?: string }) {
  const { palette } = useUi();
  return (
    <View style={[styles.tag, { backgroundColor: palette.chip }]} accessible accessibilityLabel={label} testID={testID}>
      <View style={[styles.dot, { backgroundColor: color }]} testID={testID ? `${testID}-dot` : undefined} />
      <AppText variant="caption" isBold>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: RADIUS.card, padding: SPACE.lg, gap: SPACE.md, ...SHADOW },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.chip,
  },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
