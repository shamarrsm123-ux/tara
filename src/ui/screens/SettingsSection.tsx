// Settings inside the Safety tab (03 Flow 16): Language · Speak automatically · Cooling (ask / auto) · Cooling
// length · Alerts (fewer / normal / more) · Learn my calm again · Reminders · About & privacy. Place labels and
// App Lock have their own cards on the same screen. Every change is saved and applied to the engine at once.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEMO_SCENARIO_IDS, type DemoScenarioId } from '../../demo/scenarios';
import { LANGS, type Lang, type Settings } from '../../shared/types';
import { LANG_NATIVE_NAME } from '../i18n';
import { formatClock, formatNumber } from '../i18n/format';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Segmented } from '../components/Segmented';
import { Card } from '../components/Surface';
import { useUi } from '../theme/UiProvider';
import { SPACE } from '../theme/tokens';
import { CycleSection, type CycleSettingsTools } from './CycleSection';

/** Shown in About; 5 taps open Demo mode (03 Flow 18). */
const APP_VERSION = '0.1.0';
const DEMO_TAPS = 5;

export interface ReminderItem {
  slotStartMin: number;
  reminderAtMs: number;
}

export interface DemoTools {
  isActive: boolean;
  onStart: (id: DemoScenarioId) => void;
  onExit: () => void;
}

export interface SettingsTools {
  lang: Lang;
  onLanguage: (lang: Lang) => void;
  onRecalibrate: () => void;
  reminders: readonly ReminderItem[];
  onReminderOff: (slotStartMin: number) => void;
  /** Flow 18: hidden behind 5 taps on the version number in About. */
  demo?: DemoTools;
  /** Flow 19: PMDD-aware cooling. */
  cycle?: CycleSettingsTools;
}

interface SettingsSectionProps extends SettingsTools {
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
}

export function SettingsSection({ settings, onSettings, lang, onLanguage, onRecalibrate, reminders, onReminderOff, demo, cycle }: SettingsSectionProps) {
  const { t } = useUi();
  const [versionTaps, setVersionTaps] = useState(0);
  const isDemoOpen = demo !== undefined && (demo.isActive || versionTaps >= DEMO_TAPS);
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
      {cycle !== undefined && <CycleSection settings={settings} onSettings={onSettings} {...cycle} />}
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
        <Pressable onPress={() => setVersionTaps((n) => n + 1)} accessibilityRole="text" testID="about-version">
          <AppText variant="caption" color="textMuted">
            {t('version.label', { v: APP_VERSION })}
          </AppText>
        </Pressable>
      </Card>
      {isDemoOpen && demo !== undefined && (
        <Card testID="demo-mode">
          <AppText variant="body" isBold>
            {t('demoMode.title')}
          </AppText>
          {DEMO_SCENARIO_IDS.map((id) => (
            <Button key={id} label={t(`demoMode.${id}`)} variant="outlined" tone="neutral" onPress={() => demo.onStart(id)} testID={`demo-start-${id}`} />
          ))}
          {demo.isActive && <Button label={t('demoMode.exit')} onPress={demo.onExit} testID="demo-exit" />}
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACE.sm },
  flex: { flexShrink: 1 },
});
