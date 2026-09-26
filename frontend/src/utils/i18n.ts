export type SupportedLanguage = 'en' | 'hi' | 'ar';

export interface TranslationDictionary {
  appName: string;
  tagline: string;
  heroHeadline: string;
  heroSubhead: string;
  liveDemoTitle: string;
  micPrompt: string;
  micListening: string;
  trySaying: string;
  exampleCommand: string;
  balanceLabel: string;
  readBalanceAloud: string;
  currencyLabel: string;
  sendAction: string;
  receiveAction: string;
  contactsAction: string;
  guardiansAction: string;
  passkeyConfirmPrompt: string;
  confirmWithBiometrics: string;
  transactionSuccess: string;
  transactionPending: string;
  cancel: string;
  confirm: string;
  researchBadge: string;
  researchStat1: string;
  researchStat1Label: string;
  researchStat2: string;
  researchStat2Label: string;
  researchStat3: string;
  researchStat3Label: string;
  featuresTitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Title: string;
  feature4Desc: string;
  launchApp: string;
  switchLang: string;
  soundOn: string;
  soundOff: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    appName: "SayPay",
    tagline: "Voice-First Smart Wallet",
    heroHeadline: "Crypto Was Built for Everyone. Except the Blind. We Changed That.",
    heroSubhead: "The world's first voice-first, seedless smart wallet built for visually impaired users. Speak naturally in English, Hindi, or Arabic: zero seed phrases, zero silent popups, zero hex addresses.",
    liveDemoTitle: "Interactive Voice Simulation",
    micPrompt: "Tap or hold Spacebar to speak",
    micListening: "Listening to your voice...",
    trySaying: "Try saying:",
    exampleCommand: "\"Send 0.1 ETH to Amma\"",
    balanceLabel: "Total Balance",
    readBalanceAloud: "Read Balance Aloud",
    currencyLabel: "Sepolia Testnet ETH",
    sendAction: "Send",
    receiveAction: "Receive",
    contactsAction: "Contacts",
    guardiansAction: "Guardians",
    passkeyConfirmPrompt: "Send {amount} ETH to {contact}. Confirm with your fingerprint.",
    confirmWithBiometrics: "Confirm with Fingerprint / Passkey",
    transactionSuccess: "Transaction confirmed on Sepolia Testnet!",
    transactionPending: "Transaction submitted. Waiting for block confirmation...",
    cancel: "Cancel",
    confirm: "Approve & Sign",
    researchBadge: "Backed by SOUPS 2023 Research",
    researchStat1: "70% Slower",
    researchStat1Label: "Blind users took 47.9m vs 28.2m to complete basic wallet tasks",
    researchStat2: "0 Announcements",
    researchStat2Label: "MetaMask popups and state changes failed silently without voice",
    researchStat3: "12 Seed Words",
    researchStat3Label: "Cognitive overload from seed phrases forced users to abandon backups",
    featuresTitle: "Engineered for Complete Accessibility",
    feature1Title: "Multilingual Voice NLU",
    feature1Desc: "Understands natural code-switching in English, Hindi, and Arabic without rigid syntax.",
    feature2Title: "Seedless Social Vault",
    feature2Desc: "Account Abstraction smart wallet with 2-of-3 guardian recovery and owner veto protection.",
    feature3Title: "Zero Silent Changes",
    feature3Desc: "Dual ARIA live regions and distinct audio earcons announce every on-chain event.",
    feature4Title: "Human Contacts Book",
    feature4Desc: "Never copy or verify 42-character hex addresses. Send directly to trusted contact names.",
    launchApp: "Open Smart Vault",
    switchLang: "Language",
    soundOn: "Sound Effects On",
    soundOff: "Mute Sounds",
  },
  hi: {
    appName: "से-पे (SayPay)",
    tagline: "वॉइस-फर्स्ट स्मार्ट वॉलेट",
    heroHeadline: "क्रिप्टो सबके लिए बना था, सिवाए दृष्टिबाधितों के। हमने इसे बदल दिया।",
    heroSubhead: "नेत्रहीन उपयोगकर्ताओं के लिए बनाया गया पहला आवाज-आधारित, सीडलेस स्मार्ट वॉलेट। हिंदी, अंग्रेजी या अरबी में बोलें: न कोई सीड फ्रेज खोने का डर, न कोई साइलेंट पॉपअप।",
    liveDemoTitle: "लाइव वॉइस सिमुलेशन",
    micPrompt: "बोलने के लिए टैप करें या स्पेसबार दबाएं",
    micListening: "आपकी आवाज सुनी जा रही है...",
    trySaying: "बोलकर देखें:",
    exampleCommand: "\"अम्मा को 0.1 ETH भेजो\"",
    balanceLabel: "कुल बैलेंस",
    readBalanceAloud: "बैलेंस बोलकर बताएं",
    currencyLabel: "सेपोलिया टेस्टनेट ETH",
    sendAction: "भेजें",
    receiveAction: "प्राप्त करें",
    contactsAction: "संपर्क",
    guardiansAction: "गार्जियन",
    passkeyConfirmPrompt: "{contact} को {amount} ETH भेज रहे हैं। फिंगरप्रिंट से पुष्टि करें।",
    confirmWithBiometrics: "फिंगरप्रिंट / पासकी से पुष्टि करें",
    transactionSuccess: "लेनदेन सेपोलिया टेस्टनेट पर सफल रहा!",
    transactionPending: "लेनदेन प्रक्रिया में है। पुष्टि की प्रतीक्षा की जा रही है...",
    cancel: "रद्द करें",
    confirm: "स्वीकारें और साइन करें",
    researchBadge: "SOUPS 2023 शोध पर आधारित",
    researchStat1: "70% अधिक समय",
    researchStat1Label: "दृष्टिबाधित उपयोगकर्ताओं को साधारण कार्यों में 47.9 मिनट लगे",
    researchStat2: "शून्य सूचना",
    researchStat2Label: "मेटामास्क में पुष्टि पॉपअप बिना आवाज के गायब हो जाते थे",
    researchStat3: "12 शब्द सीड फ्रेज",
    researchStat3Label: "सीड फ्रेज याद रखने की परेशानी से कई उपयोगकर्ताओं के फंड्स खो गए",
    featuresTitle: "पूरी तरह से सुलभता के लिए निर्मित",
    feature1Title: "बहुभाषी वॉइस NLU",
    feature1Desc: "हिंदी, हिंग्लिश और अंग्रेजी में मिश्रित बोलचाल को सटीकता से समझता है।",
    feature2Title: "सीडलेस सोशल वॉल्ट",
    feature2Desc: "गार्जियन रिकवरी और ओनर वीटो सुरक्षा के साथ सुरक्षित स्मार्ट कॉन्ट्रैक्ट।",
    feature3Title: "कोई खामोश बदलाव नहीं",
    feature3Desc: "स्क्रीन रीडर लाइव रीजन और ध्वनि संकेतों से हर बदलाव तुरंत सुनाया जाता है।",
    feature4Title: "आसान संपर्क सूची",
    feature4Desc: "42 अक्षरों वाले पते याद रखने की कोई जरूरत नहीं। सीधे नाम से भेजें।",
    launchApp: "वॉल्ट खोलें",
    switchLang: "भाषा बदलें",
    soundOn: "ध्वनि चालू",
    soundOff: "ध्वनि बंद",
  },
  ar: {
    appName: "سي-باي (SayPay)",
    tagline: "المحفظة الذكية الصوتية الأولى",
    heroHeadline: "العملات الرقمية صُممت للجميع، باستثناء المكفوفين. نحن غيّرنا ذلك.",
    heroSubhead: "أول محفظة ذكية صوتية بدون كلمات استرداد للمكفوفين وضعاف البصر. تحدث بالعربية أو الإنجليزية أو الهندية بكل حرية وبدون عناوين طويلة معقدة.",
    liveDemoTitle: "محاكاة الأوامر الصوتية المباشرة",
    micPrompt: "اضغط أو استمر بالضغط على المسافة للتحدث",
    micListening: "جاري الاستماع لصوتك...",
    trySaying: "جرّب أن تقول:",
    exampleCommand: "\"أرسل 0.1 إيثيريوم إلى أمي\"",
    balanceLabel: "الرصيد الإجمالي",
    readBalanceAloud: "قراءة الرصيد صوتياً",
    currencyLabel: "سيبوليا تيستنت ETH",
    sendAction: "إرسال",
    receiveAction: "استلام",
    contactsAction: "جهات الاتصال",
    guardiansAction: "الأوصياء",
    passkeyConfirmPrompt: "إرسال {amount} ETH إلى {contact}. يرجى التأكيد ببصمة الإصبع.",
    confirmWithBiometrics: "تأكيد ببصمة الإصبع / Passkey",
    transactionSuccess: "تم تأكيد المعاملة بنجاح على شبكة سيبوليا!",
    transactionPending: "تم إرسال المعاملة. بانتظار التأكيد على البلوكتشين...",
    cancel: "إلغاء",
    confirm: "موافقة وتوقيع",
    researchBadge: "مدعوم بأبحاث SOUPS 2023",
    researchStat1: "70% وقت أطول",
    researchStat1Label: "استغرق المكفوفون 47.9 دقيقة مقابل 28.2 دقيقة للمبصرين",
    researchStat2: "0 إشعارات صوتية",
    researchStat2Label: "تنبيهات وتأكيدات ميتاماسك تظهر بدون قراءة الشاشة",
    researchStat3: "12 كلمة استرداد",
    researchStat3Label: "صعوبة إدارة عبارات الاسترداد أدت إلى فقدان الأصول",
    featuresTitle: "مصممة للوصول الشامل بدون عوائق",
    feature1Title: "معالجة لغوية ذكية متعددة اللغات",
    feature1Desc: "تفهم اللهجات الممزوجة بالعربية والإنجليزية بدقة وبدون تعقيد.",
    feature2Title: "خزينة ذكية بدون عبارة استرداد",
    feature2Desc: "استرداد اجتماعي عبر الأوصياء الموثوقين مع حماية وإمكانية إلغاء.",
    feature3Title: "لا تغييرات صامتة",
    feature3Desc: "مناطق ARIA وقارئ شاشة مخصص مع نغمات تنبيهية مميزة لكل حدث.",
    feature4Title: "جهات اتصال بأسمائها الحقيقية",
    feature4Desc: "لا داعي للتعامل مع عناوين التشفير المعقدة ذات 42 حرفاً.",
    launchApp: "فتح المحفظة",
    switchLang: "اللغة",
    soundOn: "تشغيل الأصوات",
    soundOff: "كتم الأصوات",
  }
};

/**
 * Detect language from text (Arabic, Hindi, or English)
 */
export function detectLanguage(text: string): SupportedLanguage {
  const arabicRegex = /[\u0600-\u06FF]/;
  const devanagariRegex = /[\u0900-\u097F]/;

  if (arabicRegex.test(text)) return 'ar';
  if (devanagariRegex.test(text)) return 'hi';

  const lower = text.toLowerCase();
  // Check for common Hinglish transliterations
  if (
    lower.includes('bhejo') ||
    lower.includes('kitna') ||
    lower.includes('amma') ||
    lower.includes('rupaye') ||
    lower.includes('paanch') ||
    lower.includes('sau') ||
    lower.includes('paisa')
  ) {
    return 'hi';
  }

  // Check for common Arabic transliterations
  if (
    lower.includes('arsil') ||
    lower.includes('raseed') ||
    lower.includes('khamsa') ||
    lower.includes('ommi') ||
    lower.includes('fuloos')
  ) {
    return 'ar';
  }

  return 'en';
}

/**
 * Speech Synthesis State Observers (Half-Duplex Audio Engine UX-01)
 */
let activeSpeechCount = 0;
let currentUtterance: SpeechSynthesisUtterance | null = null;
const speechListeners: Array<(isSpeaking: boolean) => void> = [];

export function isCurrentlySpeaking(): boolean {
  return activeSpeechCount > 0 || (typeof window !== 'undefined' && window.speechSynthesis?.speaking === true);
}

export function onSpeechStateChange(listener: (isSpeaking: boolean) => void): () => void {
  speechListeners.push(listener);
  return () => {
    const idx = speechListeners.indexOf(listener);
    if (idx >= 0) speechListeners.splice(idx, 1);
  };
}

function notifySpeechState(speaking: boolean) {
  speechListeners.forEach((fn) => {
    try {
      fn(speaking);
    } catch (e) {}
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  currentUtterance = null;
  activeSpeechCount = 0;
  notifySpeechState(false);
}

// Voices load asynchronously; keep the latest list so the first sentence already
// gets the best voice instead of the browser default.
let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

// Best first: Edge's online "Natural" voices (near-human, include Arabic and Hindi),
// then Chrome's Google voices, then any other neural voice, then any voice.
const VOICE_TIERS: RegExp[] = [/Natural/i, /Google/i, /Neural|Premium|Enhanced/i];

function findBestVoice(lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const prefix = lang === 'hi' ? 'hi' : lang === 'ar' ? 'ar' : 'en';
  const matching = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  if (matching.length === 0) return null;

  for (const tier of VOICE_TIERS) {
    const hit = matching.find((v) => tier.test(v.name));
    if (hit) return hit;
  }
  return matching.find((v) => v.localService) || matching[0];
}

/**
 * Text-To-Speech Synthesis helper using native device Web Speech API
 * Instant 0ms response, zero network hops, and single-pass speech.
 */
export function speakText(
  text: string,
  lang: SupportedLanguage = 'en',
  onEnd?: () => void
) {
  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  stopSpeaking();

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  activeSpeechCount++;
  notifySpeechState(true);

  // Resume paused synthesis if Chrome suspended the audio context
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {}

  const utterance = new SpeechSynthesisUtterance(text.trim());
  currentUtterance = utterance;

  const langMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    ar: 'ar-SA',
  };

  utterance.lang = langMap[lang] || 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voice = findBestVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }

  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    currentUtterance = null;
    activeSpeechCount = Math.max(0, activeSpeechCount - 1);
    notifySpeechState(false);
    if (onEnd) onEnd();
  };

  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.speak(utterance);
}
