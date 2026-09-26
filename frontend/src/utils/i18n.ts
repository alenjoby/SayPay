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
// Every utterance being spoken, referenced so Chrome doesn't garbage-collect them mid-speech.
let utterancesInFlight: SpeechSynthesisUtterance[] = [];
// Bumped by every new message and stopSpeaking(): callbacks from older speech are ignored.
let speechGeneration = 0;
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
  utterancesInFlight = [];
  speechGeneration++;
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
// Within a tier: the Gulf / Indian / US accent first, then these calm, clear voices.
const PREFERRED_REGIONS: Record<SupportedLanguage, string[]> = {
  en: ['en-us', 'en-gb', 'en-in'],
  hi: ['hi-in'],
  ar: ['ar-ae', 'ar-sa', 'ar-qa', 'ar-kw', 'ar-bh', 'ar-om', 'ar-eg'],
};
const PREFERRED_NAMES = /Jenny|Aria|Ava|Emma|Swara|Madhur|Fatima|Hamdan|Zariyah|Hamed|Salma|Samantha/i;
const voiceCache: Partial<Record<SupportedLanguage, { of: number; voice: SpeechSynthesisVoice }>> = {};

function findBestVoice(lang: SupportedLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const cached = voiceCache[lang];
  if (cached && cached.of === voices.length) return cached.voice;

  const prefix = lang === 'hi' ? 'hi' : lang === 'ar' ? 'ar' : 'en';
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const matching = voices.filter((v) => norm(v).startsWith(prefix));
  if (matching.length === 0) return null;

  const regions = PREFERRED_REGIONS[lang];
  const score = (v: SpeechSynthesisVoice) => {
    const tier = VOICE_TIERS.findIndex((t) => t.test(v.name));
    const region = regions.indexOf(norm(v));
    return (
      (tier === -1 ? VOICE_TIERS.length : tier) * 100 +
      (region === -1 ? regions.length : region) * 10 +
      (PREFERRED_NAMES.test(v.name) ? 0 : 5) +
      (/Multilingual/i.test(v.name) ? 3 : 0) // their accent drifts between languages
    );
  };
  const best = [...matching].sort((a, b) => score(a) - score(b))[0];
  voiceCache[lang] = { of: voices.length, voice: best };
  return best;
}

/** The language the text is mostly written in (an Arabic reply shouldn't get an English voice). */
function scriptLanguage(text: string, fallback: SupportedLanguage): SupportedLanguage {
  const arabic = (text.match(/[؀-ۿ]/g) || []).length;
  const devanagari = (text.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic > latin && arabic > devanagari) return 'ar';
  if (devanagari > latin && devanagari > arabic) return 'hi';
  if (latin > arabic + devanagari && fallback !== 'en') {
    // English words in a Hindi/Arabic reply are fine to read in that voice; only switch
    // when there is no Arabic/Devanagari at all.
    return arabic + devanagari === 0 ? 'en' : fallback;
  }
  return fallback;
}

// ---- Echo filter ---------------------------------------------------------------
// With speakers (no earphones) the mic can hear the app's own reply. Remember what was
// said recently so the recogniser's copy of it can be dropped.
const spokenLog: { words: string[]; at: number }[] = [];
const ECHO_WINDOW_MS = 20_000;

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function remember(text: string) {
  const now = Date.now();
  while (spokenLog.length && now - spokenLog[0].at > ECHO_WINDOW_MS) spokenLog.shift();
  spokenLog.push({ words: words(text), at: now });
}

/**
 * Removes the app's own recent speech from what the mic heard. Returns the user's part,
 * or '' when everything heard was the app talking.
 * An echo is a run of 4+ words in the same order as a recent reply (or 3+ covering nearly
 * all of what was heard), so a user repeating a word or two ("to Priya") isn't removed.
 */
export function stripEcho(heard: string): string {
  const now = Date.now();
  // Compare normalised words, but keep the original ones ("0.05", not "0 05").
  let orig = heard.trim().split(/\s+/).filter((t) => words(t).length);
  let h = orig.map((t) => words(t).join(''));
  if (!h.length) return heard;
  for (const { words: said, at } of spokenLog) {
    if (now - at > ECHO_WINDOW_MS || said.length < 3) continue;
    // Longest run of consecutive words shared with this reply.
    let best = 0;
    let bestEnd = 0;
    for (let i = 0; i < h.length; i++) {
      for (let j = 0; j < said.length; j++) {
        let k = 0;
        while (i + k < h.length && j + k < said.length && h[i + k] === said[j + k]) k++;
        if (k > best) {
          best = k;
          bestEnd = i + k;
        }
      }
    }
    if (best >= 4 || (best >= 3 && best / h.length >= 0.9)) {
      h = [...h.slice(0, bestEnd - best), ...h.slice(bestEnd)];
      orig = [...orig.slice(0, bestEnd - best), ...orig.slice(bestEnd)];
    }
  }
  if (orig.length === heard.trim().split(/\s+/).filter((t) => words(t).length).length) return heard; // nothing removed
  return orig.length >= 2 || (orig.length === 1 && /\d/.test(orig[0])) ? orig.join(' ') : '';
}

/**
 * Text-To-Speech Synthesis helper using native device Web Speech API
 * Instant 0ms response, zero network hops, and single-pass speech.
 *
 * onEnd(finished): finished is false when the speech was cut off (stopSpeaking, a new
 * message), so callers don't open the mic for an answer to something that wasn't heard.
 */
export function speakText(
  text: string,
  lang: SupportedLanguage = 'en',
  onEnd?: (finished: boolean) => void
) {
  if (!text || !text.trim()) {
    if (onEnd) onEnd(true);
    return;
  }

  stopSpeaking();

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd(true);
    return;
  }

  activeSpeechCount++;
  notifySpeechState(true);
  remember(text);
  const generation = ++speechGeneration;

  // Resume paused synthesis if Chrome suspended the audio context
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (e) {}

  const langMap: Record<SupportedLanguage, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    ar: 'ar-SA',
  };
  const voiceLang = scriptLanguage(text, lang);
  const voice = findBestVoice(voiceLang);

  // One utterance per sentence: Chrome's Google voices stop after ~15 s of a single
  // utterance, and short ones start sooner.
  const sentences = text
    .trim()
    .split(/(?<=[.!?؟।])\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let completed = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  const finish = (finished: boolean) => {
    if (completed) return;
    completed = true;
    if (watchdog) clearTimeout(watchdog);
    if (generation === speechGeneration) {
      currentUtterance = null;
      activeSpeechCount = Math.max(0, activeSpeechCount - 1);
      notifySpeechState(false);
    }
    if (onEnd) onEnd(finished && generation === speechGeneration);
  };
  // Chrome sometimes never fires onend (then nothing that waits for it would run).
  // Generous, so the mic never opens while the app is still talking.
  const armWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (window.speechSynthesis.speaking && generation === speechGeneration) armWatchdog();
      else finish(generation === speechGeneration);
    }, 4000 + text.length * 110);
  };

  sentences.forEach((sentence, i) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = langMap[voiceLang] || 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    if (voice) utterance.voice = voice;
    const last = i === sentences.length - 1;
    utterance.onstart = armWatchdog;
    utterance.onend = () => {
      if (last) finish(true);
    };
    utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
      const cut = e.error === 'interrupted' || e.error === 'canceled';
      if (last || cut) finish(!cut);
    };
    if (i === 0) currentUtterance = utterance; // keep a reference: Chrome can drop onend otherwise
    utterancesInFlight.push(utterance);
    window.speechSynthesis.speak(utterance);
  });
  armWatchdog();
}
