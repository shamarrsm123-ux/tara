// Settings inside the Safety tab (03 Flow 16): Language · Speak automatically · Cooling (ask / auto) · Cooling
// length · Alerts (fewer / normal / more) · Learn my calm again · Reminders · About & privacy. Place labels and
// App Lock have their own cards on the same screen. Every change is saved and applied to the engine at once.
import { StyleSheet, View } from 'react-native';
import { LANGS, type Lang, type Settings } from '../../shared/types';
import { LANG_NATIVE_NAME } from '../i18n';
import { formatClock, formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Segmented } from '../components/Segmented';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';

export interface ReminderItem {
  slotStartMin: number;
  reminderAtMs: number;
}

export interface SettingsTools {
  lang: Lang;
  onLanguage: (lang: Lang) => void;
  onRecalibrate: () => void;
  reminders: readonly ReminderItem[];
  onReminderOff: (slotStartMin: number) => void;
}

interface SettingsSectionProps extends SettingsTools {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
}

export function SettingsSection({ settings, onSettings, lang, onLanguage, onRecalibrate, reminders, onReminderOff }: SettingsSectionProps) {
  const { t } = useUi();
  const minutes = (n: number) => t('settings.minutes', { n: formatNumber(n, lang) });
  return (
    <>
      <Card testID="settings">
        <AppText variant="question" isBold>
          {t('settings.title')}
        </AppText>
        <Segmented label={t('settings.language')} value={lang} options={LANGS.map((l) => ({ value: l, label: LANG_NATIVE_NAME[l] }))} onChange={onLanguage} testID="set-lang" />
        <Segmented
          label={t('settings.speak')}
          value={settings.speakAutomatically}
          options={[
            { value: true, label: t('settings.on') },
            { value: false, label: t('settings.off') },
          ]}
          onChange={(v) => onSettings({ speakAutomatically: v })}
          testID="set-speak"
        />
        <Segmented
          label={t('settings.coolingMode')}
          value={settings.coolingMode}
          options={[
            { value: 'ask', label: t('settings.ask') },
            { value: 'auto', label: t('settings.auto') },
          ]}
          onChange={(v) => onSettings({ coolingMode: v })}
          testID="set-mode"
        />
        <Segmented
          label={t('settings.coolingLength')}
          value={settings.coolingMinutes}
          options={([5, 10, 15] as const).map((n) => ({ value: n, label: minutes(n) }))}
          onChange={(v) => onSettings({ coolingMinutes: v })}
          testID="set-length"
        />
        <Segmented
          label={t('settings.sensitivity')}
          value={settings.alertSensitivity}
          options={[
            { value: 'fewer', label: t('settings.fewer') },
            { value: 'normal', label: t('settings.normal') },
            { value: 'more', label: t('settings.more') },
          ]}
          onChange={(v) => onSettings({ alertSensitivity: v })}
          testID="set-sensitivity"
        />
        <Button label={t('settings.recalibrate')} variant="outlined" tone="neutral" onPress={onRecalibrate} testID="set-recalibrate" />
      </Card>
      <Card testID="settings-reminders">
        <AppText variant="body" isBold>
          {t('settings.reminders')}
        </AppText>
        {reminders.length === 0 ? (
          <AppText variant="body" color="textMuted">
            {t('settings.noReminders')}
          </AppText>
        ) : (
          reminders.map((r) => (
            <View key={r.slotStartMin} style={styles.row}>
              <AppText variant="body" style={styles.flex}>
                {t('settings.reminderAt', { time: formatClock(r.reminderAtMs, lang) })}
              </AppText>
              <Button label={t('settings.turnOffReminder')} variant="outlined" tone="neutral" onPress={() => onReminderOff(r.slotStartMin)} testID={`reminder-off-${r.slotStartMin}`} />
            </View>
          ))
        )}
      </Card>
      <Card tint="peach" testID="about">
        <AppText variant="body" isBold>
          {t('about.title')}
        </AppText>
        <AppText variant="body">{t('about.body')}</AppText>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.sm },
  flex: { flexShrink: 1 },
});
