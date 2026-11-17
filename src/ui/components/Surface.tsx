// Shared surfaces from 04a v2 §3–4: white or softly tinted rounded cards, the small tag (dot + word) used for
// status everywhere (fit, High stress, Cooling), the thin outlined chip, the tinted icon square and the
// section title.
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SHADOW, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

export type CardTint = 'white' | 'peach' | 'apricot' | 'lemon';

interface CardProps {
  children: ReactNode;
  tint?: CardTint;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** White cards float on a very soft shadow; tinted cards are flat (like the reference's peach panels). */
export function Card({ children, tint = 'white', style, testID }: CardProps) {
  const { palette } = useUi();
  const fill = tint === 'white' ? palette.surface : tint === 'peach' ? palette.tintPeach : tint === 'apricot' ? palette.tintApricot : palette.tintLemon;
  return (
    <View style={[styles.card, tint === 'white' && SHADOW, { backgroundColor: fill }, style]} testID={testID}>
      {children}
    </View>
  );
}

const DOT = 10;

/** Small rounded tag with a colored dot and a word — never color alone (04 §1). */
export function Tag({ label, color, testID }: { label: string; color: string; testID?: string }) {
  const { palette } = useUi();
  return (
    <View style={[styles.tag, { backgroundColor: palette.surface, borderColor: palette.line }]} accessible accessibilityLabel={label} testID={testID}>
      <View style={[styles.dot, { backgroundColor: color }]} testID={testID ? `${testID}-dot` : undefined} />
      <AppText variant="caption" isBold>
        {label}
      </AppText>
    </View>
  );
}

/** Thin outlined chip: icon + short value (04a v2 §4, the "24 °C · GPS" pattern). */
export function Chip({ icon, label, testID }: { icon: ReactNode; label: string; testID?: string }) {
  const { palette } = useUi();
  return (
    <View style={[styles.chip, { borderColor: palette.line, backgroundColor: palette.surface }]} accessible accessibilityLabel={label} testID={testID}>
      {icon}
      <AppText variant="caption" isBold>
        {label}
      </AppText>
    </View>
  );
}

const ICON_SQUARE = 48;

/** Tinted rounded square that holds a line icon. */
export function IconSquare({ children, tint = 'peach' }: { children: ReactNode; tint?: Exclude<CardTint, 'white'> }) {
  const { palette } = useUi();
  const fill = tint === 'peach' ? palette.accentSoft : tint === 'apricot' ? palette.tintApricot : palette.tintLemon;
  return <View style={[styles.iconSquare, { backgroundColor: fill }]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="question" isBold accessibilityRole="header">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: RADIUS.card, padding: SPACE.lg, gap: SPACE.md },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACE.sm,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: RADIUS.tag,
    borderWidth: 1,
  },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconSquare: { width: ICON_SQUARE, height: ICON_SQUARE, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
