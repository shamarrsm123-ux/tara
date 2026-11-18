// Shown instead of TARA while App Lock is on and she hasn't unlocked (03 Flow 17). Nothing of her data is drawn
// behind it. "Unlock TARA" opens the phone's own PIN / pattern / fingerprint.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { PhoneShieldScene } from '../art/Scenes';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useUi();
  useEffect(() => {
    onUnlock(); // ask straight away on open; the button is there if she cancels
  }, [onUnlock]);
  return (
    <ScreenFrame testID="screen-locked" footer={<Button label={t('lock.unlock')} onPress={onUnlock} testID="lock-unlock" />}>
      <View style={styles.body}>
        <PhoneShieldScene height={240} />
        <AppText variant="title" style={styles.center}>
          {t('lock.locked')}
        </AppText>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.lg, paddingTop: SPACE.lg },
  center: { textAlign: 'center' },
});
