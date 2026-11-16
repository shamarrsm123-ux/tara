// Flow 0 — Welcome (03, 02 §8.2, 04 §10): illustration with the glowing sensor dot, voiced intro, four icon
// rows, the honesty line, "What does the sensor do?", and one big button. No name, age or phone number.
import { useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { Card } from '../components/Surface';
import { IconEarSensor, IconLock, IconSnow, IconWoman, TarhaIllustration } from '../icons/Icons';
import { useUi } from '../theme/UiProvider';
import { RADIUS, SPACE, TOUCH_MIN } from '../theme/tokens';

interface WelcomeScreenProps {
  onTry: () => void;
  onBack: () => void;
}

type RowKey = 'welcome.rowWomen' | 'welcome.rowSensor' | 'welcome.rowCool' | 'welcome.rowPrivacy';
const ROWS: readonly { Icon: ComponentType<{ color: string }>; key: RowKey }[] = [
  { Icon: IconWoman, key: 'welcome.rowWomen' },
  { Icon: IconEarSensor, key: 'welcome.rowSensor' },
  { Icon: IconSnow, key: 'welcome.rowCool' },
  { Icon: IconLock, key: 'welcome.rowPrivacy' },
];

const SKIN = '#B9875F';

export function WelcomeScreen({ onTry, onBack }: WelcomeScreenProps) {
  const { t, palette } = useUi();
  const [isSensorOpen, setIsSensorOpen] = useState(false);
  return (
    <ScreenFrame
      testID="screen-welcome"
      voiceLine="welcome"
      onBack={onBack}
      footer={<Button label={t('welcome.try')} hasArrow onPress={onTry} testID="welcome-try" />}
    >
      <View style={[styles.hero, { backgroundColor: palette.accentSoft }]}>
        <TarhaIllustration scarf={palette.surface} skin={SKIN} dot={palette.accent} size={200} isGlowing />
      </View>
      <AppText variant="headline">{t('brand.name')}</AppText>
      <AppText variant="body" color="textMuted">
        {t('welcome.intro')}
      </AppText>
      <Card>
        {ROWS.map(({ Icon, key }) => (
          <View key={key} style={styles.row}>
            <View style={[styles.iconBubble, { backgroundColor: palette.accentSoft }]}>
              <Icon color={palette.accent} />
            </View>
            <AppText variant="body" style={styles.rowText}>
              {t(key)}
            </AppText>
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="textMuted">
        {t('welcome.disclaimer')}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isSensorOpen }}
        onPress={() => setIsSensorOpen((open) => !open)}
        style={styles.expander}
        testID="welcome-sensor"
      >
        <AppText variant="body" color="accent" isBold>
          {t('welcome.sensorQuestion')}
        </AppText>
      </Pressable>
      {isSensorOpen && <AppText variant="body">{t('welcome.sensorAnswer')}</AppText>}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.card, paddingVertical: SPACE.lg },
  iconBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  rowText: { flex: 1 },
  expander: { minHeight: TOUCH_MIN, justifyContent: 'center' },
});
