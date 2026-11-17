// Pill buttons (04a v2 §4). Filled = the main choice (coral with a soft coral glow and a trailing arrow for
// "go on" actions); outlined = the other choice, same size so No is never hidden (04 §5). 64dp tall.
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useUi } from '../theme/UiProvider';
import { ACCENT_GLOW, PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

export type ButtonTone = 'accent' | 'ink' | 'cool' | 'high' | 'neutral';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  tone?: ButtonTone;
  /** Trailing arrow for actions that move forward. */
  hasArrow?: boolean;
  isDisabled?: boolean;
  testID?: string;
}

const BORDER_WIDTH = 1.5;
const ARROW = 22;

function Arrow({ color, isFlipped }: { color: string; isFlipped: boolean }) {
  return (
    <Svg width={ARROW} height={ARROW} viewBox="0 0 24 24" style={isFlipped ? styles.flipped : undefined}>
      <Path d="M5 12 H19 M13 6 L19 12 L13 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
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
        isFilled && tone === 'accent' && !isDisabled && ACCENT_GLOW,
        {
          backgroundColor: isFilled ? fill : palette.surface,
          borderColor: isFilled ? fill : tone === 'neutral' || tone === 'ink' ? palette.sand : fill,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <AppText variant="button" color={labelColor} style={styles.label}>
        {label}
      </AppText>
      {hasArrow && isFilled && (
        <View style={styles.arrow}>
          <Arrow color={palette[labelColor]} isFlipped={isRtl} />
        </View>
      )}
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
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: SPACE.lg,
    gap: SPACE.sm,
  },
  label: { textAlign: 'center', flexShrink: 1 },
  arrow: { marginStart: SPACE.xs },
  flipped: { transform: [{ scaleX: -1 }] },
});
