// Mute alerts (03 Flow 7 step 5): choices 30 minutes / 1 hour / Rest of today, and while muted an "Alerts paused"
// tag with "Turn alerts back on". Muting never blocks the Cool button or battery alerts (07 §5.5).
import { StyleSheet, View } from 'react-native';
import type { MuteChoice } from '../../engine/mute';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card, Tag } from './Surface';

const CHOICES: readonly { choice: MuteChoice; key: 'mute.m30' | 'mute.h1' | 'mute.day' }[] = [
  { choice: 'm30', key: 'mute.m30' },
  { choice: 'h1', key: 'mute.h1' },
  { choice: 'day', key: 'mute.day' },
];

export function MuteChoices({ onChoose, onCancel }: { onChoose: (choice: MuteChoice) => void; onCancel: () => void }) {
  const { t } = useUi();
  return (
    <Card testID="mute-choices">
      <AppText variant="question" isBold>
        {t('mute.button')}
      </AppText>
      {CHOICES.map(({ choice, key }) => (
        <Button key={choice} label={t(key)} variant="outlined" tone="neutral" onPress={() => onChoose(choice)} testID={`mute-${choice}`} />
      ))}
      <Button label={t('mute.cancel')} variant="outlined" tone="neutral" onPress={onCancel} testID="mute-cancel" />
    </Card>
  );
}

export function MutedNotice({ onResume }: { onResume: () => void }) {
  const { t, palette } = useUi();
  return (
    <View style={styles.muted} testID="muted-notice">
      <Tag label={t('mute.paused')} color={palette.neutral} />
      <Button label={t('mute.resume')} variant="outlined" tone="neutral" onPress={onResume} testID="mute-resume" />
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { gap: SPACE.sm, alignSelf: 'stretch' },
});
