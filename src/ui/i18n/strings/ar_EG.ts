// Egyptian Arabic. 🟡 Draft wording — must be reviewed by native speakers before release (13 Phase 12).
import type { Strings } from './en';

export const ar_EG: Strings = {
  zone: {
    calm: 'هادية',
    rising: 'التوتر بيزيد',
    high: 'توتر عالي',
  },
  meter: {
    percent: '٪',
    notConnected: 'مش متوصّلة',
    adjustSensor: 'عدّلي الحسّاس',
    a11y: 'الهدوء {{value}} في المية، {{zone}}',
  },
  fit: {
    good: 'كويس',
    adjust: 'عدّلي',
    none: 'مش لامس',
  },
  demo: {
    ribbon: 'تجربة — مش بيانات مخ حقيقية',
    corner: 'تجربة',
    spedUp: 'تجربة — مُسرَّعة',
  },
  prompt: {
    highStress: 'توترك عالي. نبرّد حوالين راسك دلوقتي؟',
    yesCool: 'أيوه — برّد',
    no: 'لأ',
  },
  cool: {
    start: 'برّد حوالين راسي',
    stop: 'وقّف التبريد',
  },
  common: {
    playVoice: 'شغّلي الصوت',
  },
  deleteAll: {
    button: 'امسحي كل حاجة',
    hold: 'اضغطي واستني {{seconds}} ثواني',
  },
  graph: {
    a11y: 'الهدوء في آخر {{minutes}} دقيقة',
  },
};
