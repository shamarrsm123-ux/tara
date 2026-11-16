// Pill buttons (04a §4). Filled = the main choice (orange, with the dark round "→" badge for primary
// actions); outlined = the other choice, same size so No is never hidden (04 §5). 64dp tall.
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, RADIUS, SHADOW, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

export type ButtonTone = 'accent' | 'ink' | 'cool' | 'high' | 'neutral';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  tone?: ButtonTone;
  /** Dark round arrow badge at the leading edge (primary actions). */
  hasArrow?: boolean;
  isDisabled?: boolean;
  testID?: string;
}

const BADGE = 48;
const BORDER_WIDTH = 2;

function ArrowBadge({ color, background, isFlipped }: { color: string; background: string; isFlipped: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Svg width={22} height={22} viewBox="0 0 24 24" style={isFlipped ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Path d="M5 12 H19 M13 6 L19 12 L13 18" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

export function Button({ label, onPress, variant = 'filled', tone = 'accent', hasArrow = false, isDisabled = false, testID }: ButtonProps) {
  const { palette, isRtl } = useUi();
  const fill = tone === 'neutral' ? palette.surface : palette[tone];
  const isFilled = variant === 'filled' && tone !== 'neutral';
  const labelColor = isFilled ? (tone === 'ink' ? 'onInk' : 'onAccent') : tone === 'neutral' || tone === 'ink' ? 'text' : tone;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        isFilled && styles.shadow,
        {
          backgroundColor: isFilled ? fill : palette.surface,
          borderColor: isFilled ? fill : tone === 'neutral' || tone === 'ink' ? palette.sand : fill,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {hasArrow && isFilled && <ArrowBadge color={palette.onInk} background={palette.ink} isFlipped={isRtl} />}
      <View style={styles.labelBox}>
        <AppText variant="button" color={labelColor} style={styles.label}>
          {label}
        </AppText>
      </View>
      {hasArrow && isFilled && <View style={styles.badgeSpacer} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: RADIUS.button,
    borderWidth: BORDER_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: SPACE.sm,
  },
  shadow: SHADOW,
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center' },
  badgeSpacer: { width: BADGE },
  labelBox: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.sm },
  label: { textAlign: 'center' },
});
