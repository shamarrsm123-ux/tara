// A labelled row of equal pill choices (Settings, 03 Flow 16). The chosen one is filled coral; every option is a
// 56dp target with its word — never color alone.
import { Pressable, StyleSheet, View } from 'react-native';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE, TOUCH_MIN } from '../theme/tokens';
import { AppText } from './AppText';

export interface SegmentedOption<T extends string | number | boolean> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number | boolean> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  testID?: string;
}

export function Segmented<T extends string | number | boolean>({ label, value, options, onChange, testID }: SegmentedProps<T>) {
  const { palette } = useUi();
  return (
    <View style={styles.block} testID={testID}>
      <AppText variant="body" isBold>
        {label}
      </AppText>
      <View style={styles.row}>
        {options.map((o) => {
          const isOn = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isOn }}
              onPress={() => onChange(o.value)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: isOn ? palette.accent : palette.surface, borderColor: isOn ? palette.accent : palette.sand, opacity: pressed ? 0.7 : 1 },
              ]}
              testID={testID ? `${testID}-${String(o.value)}` : undefined}
            >
              <AppText variant="caption" isBold color={isOn ? 'onAccent' : 'text'} style={styles.center}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACE.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  option: { flexGrow: 1, flexBasis: '28%', minHeight: TOUCH_MIN, paddingHorizontal: SPACE.sm, borderRadius: RADIUS.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
