// A single voiced message with OK — used for "Okay. Nothing was saved." (03 Flow 5 step 2) and "Everything is
// deleted." (03 Flow 13 step 4) before the app returns to Choose Language.
import { StyleSheet, View } from 'react-native';
import type { VoiceLineId } from '../../shared/types';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { IconShield } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

interface NoticeScreenProps {
  message: string;
  voiceLine: VoiceLineId;
  onOk: () => void;
  testID?: string;
}

const BADGE = 120;

export function NoticeScreen({ message, voiceLine, onOk, testID }: NoticeScreenProps) {
  const { t, palette } = useUi();
  return (
    <ScreenFrame testID={testID} voiceLine={voiceLine} footer={<Button label={t('common.ok')} onPress={onOk} testID="notice-ok" />}>
      <View style={styles.body}>
        <View style={[styles.badge, { backgroundColor: palette.accentSoft }]}>
          <IconShield color={palette.accent} size={56} />
        </View>
        <AppText variant="title" style={styles.center} testID={testID ? `${testID}-message` : undefined}>
          {message}
        </AppText>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: SPACE.lg, paddingTop: SPACE.xl * 2 },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
