// Full-width 64dp button (04 §5). Filled = the main choice; outlined = the other choice, same size.
import { Pressable, StyleSheet, View } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE } from '../theme/tokens';
import { AppText } from './AppText';

export type ButtonTone = 'cool' | 'high' | 'neutral';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined';
  tone?: ButtonTone;
  isDisabled?: boolean;
  testID?: string;
}

const BORDER_WIDTH = 3;

export function Button({ label, onPress, variant = 'filled', tone = 'cool', isDisabled = false, testID }: ButtonProps) {
  const { palette } = useUi();
  const accent = tone === 'neutral' ? palette.text : palette[tone];
  const isFilled = variant === 'filled';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isFilled ? accent : palette.surface,
          borderColor: isDisabled ? palette.neutral : accent,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.labelBox}>
        <AppText variant="button" color={isFilled ? 'onAccent' : tone === 'neutral' ? 'text' : tone} style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: RADIUS.button,
    borderWidth: BORDER_WIDTH,
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: SPACE.md,
  },
  labelBox: { alignItems: 'center' },
  label: { textAlign: 'center' },
});
