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
    cantCool: 'التبريد مش هيقدر يشتغل دلوقتي. لو سمحتي اقعدي في الضل واشربي مية.',
    highStress: 'توترك عالي. نبرّد حوالين راسك دلوقتي؟',
    yesCool: 'أيوه — برّد',
    no: 'لأ',
  },
  cool: {
    timeLeft: 'فاضل {{time}}',
    failed: 'التبريد ما اشتغلش.',
    starting: 'بيشتغل…',
    extend: '+{{minutes}} دقايق',
    auto: 'التبريد اشتغل لأن توترك عالي.',
    on: 'التبريد شغّال. خدي استراحة: اقعدي في الضل واشربي مية.',
    start: 'برّد حوالين راسي',
    stop: 'وقّف التبريد',
  },
  language: {
    continue: 'كمّلي',
    confirm: 'تارا هتكلّمك باللغة دي.',
  },
  welcome: {
    intro: 'إنتي ست عندك من ١٨ لـ ٥٠ سنة؟ بتتعبي وتتوتري في الشمس؟ أنا تارا — طرحة زي طرحتك، فيها حسّاس صغير ورا ودنك. بيحس لما تكوني متوترة وبيبرّد حوالين راسك، علشان تهدي وتكمّلي يومك.',
    rowWomen: 'للستات من ١٨ لـ ٥٠ سنة اللي بيشتغلوا في الغيط',
    rowSensor: 'حسّاس صغير ورا ودنك بيحس لما تكوني متوترة',
    rowCool: 'بنبرّد حوالين راسك علشان جسمك يهدى',
    rowPrivacy: 'بيانات توترك بتفضل على تليفونك. مش بنبعتها لحد',
    disclaimer: 'تارا مش دكتورة ومش بتشخّص أي مرض.',
    sensorQuestion: 'الحسّاس بيعمل إيه؟',
    sensorAnswer: 'هو بيسمع بس. مش بيكهربك. مش بيدخل جوه راسك. بيبعت شوية أرقام لتليفونك — ومفيش حاجة تانية.',
    try: 'جرّبي تهدّي مخك',
  },
  connect: {
    instruction: 'البسي الطرحة. حطي الحسّاس ورا ودنك، لامس جلدك.',
    button: 'وصّلي',
    searching: 'بندوّر على طرحتك…',
    notFound: 'مش لاقيين طرحتك. هي مفتوحة؟',
    tryAgain: 'جرّبي تاني',
    useDemo: 'استخدمي التجربة بدالها',
    fitMove: 'حرّكي الحسّاس علشان يلمس جلدك.',
    next: 'التالي',
  },
  calibrate: {
    intro: 'اقعدي في الضل. خدي نفس بالراحة. أنا بتعلّم إزاي بتكوني هادية.',
    breatheIn: 'خدي نفس',
    breatheOut: 'طلّعي النفس',
    done: 'شكرًا. دلوقتي عرفت هدوءك.',
    skip: 'تخطّي',
  },
  status: {
    connected: 'الطرحة متوصّلة',
    notConnected: 'الطرحة مش متوصّلة — بنحاول نوصّل…',
    battery: 'بطارية الطرحة {{pct}} في المية',
    coolingOn: 'التبريد شغّال',
    coolingOff: 'التبريد مقفول',
  },
  alertLess: {
    question: 'أنبّهك أقل النهارده؟',
  },
  common: {
    no: 'لأ',
    yes: 'أيوه',
    ok: 'تمام',
    playVoice: 'شغّلي الصوت',
    back: 'رجوع',
  },
  deleteAll: {
    button: 'امسحي كل حاجة',
    hold: 'اضغطي واستني {{seconds}} ثواني',
  },
  graph: {
    a11y: 'الهدوء في آخر {{minutes}} دقيقة',
  },
};
