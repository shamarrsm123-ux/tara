// Flow L — Choose Language (03, 04 §10): three large cards in their own script, each with ▶ that plays the
// language's name. Tapping selects and plays "TARA will speak to you in this language." Continue appears
// only once a language is chosen, so nothing on this screen needs reading in another language.
import { Pressable, StyleSheet, View } from 'react-native';
import { LANGS, type Lang } from '../../shared/types';
import { LANG_NATIVE_NAME } from '../i18n';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ScreenFrame } from '../components/ScreenFrame';
import { VoiceButton } from '../components/VoiceButton';
import { UiProvider, useUi } from '../theme/UiProvider';
import { PRIMARY_BUTTON_HEIGHT, RADIUS, SPACE } from '../theme/tokens';
import { playVoice } from '../voice/player';

interface LanguageScreenProps {
  selected: Lang | null;
  onSelect: (lang: Lang) => void;
  onContinue: () => void;
}

const SELECTED_BORDER = 4;
const BORDER = 2;

function LanguageCard({ lang, isSelected, onPress }: { lang: Lang; isSelected: boolean; onPress: () => void }) {
  const { theme, palette } = useUi();
  return (
    <UiProvider lang={lang} theme={theme}>
      <View
        style={[
          styles.card,
          { backgroundColor: palette.surface, borderColor: isSelected ? palette.cool : palette.sand, borderWidth: isSelected ? SELECTED_BORDER : BORDER },
        ]}
      >
        <Pressable accessibilityRole="radio" accessibilityState={{ selected: isSelected }} onPress={onPress} style={styles.cardPress} testID={`lang-${lang}`}>
          <AppText variant="title">{LANG_NATIVE_NAME[lang]}</AppText>
        </Pressable>
        <VoiceButton line="langName" testID={`lang-${lang}-voice`} />
      </View>
    </UiProvider>
  );
}

export function LanguageScreen({ selected, onSelect, onContinue }: LanguageScreenProps) {
  const { t } = useUi();
  const choose = (lang: Lang) => {
    onSelect(lang);
    playVoice(lang, 'langConfirm');
  };
  return (
    <ScreenFrame
      testID="screen-language"
      footer={selected !== null ? <Button label={t('language.continue')} onPress={onContinue} testID="language-continue" /> : undefined}
    >
      <View style={styles.cards}>
        {LANGS.map((lang) => (
          <LanguageCard key={lang} lang={lang} isSelected={selected === lang} onPress={() => choose(lang)} />
        ))}
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  cards: { gap: SPACE.md, paddingTop: SPACE.xl },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.card, paddingHorizontal: SPACE.md, gap: SPACE.md },
  cardPress: { flex: 1, minHeight: PRIMARY_BUTTON_HEIGHT + SPACE.md, justifyContent: 'center' },
});
