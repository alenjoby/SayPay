import { detectLanguage, SupportedLanguage } from './i18n';

export type IntentType =
  | 'check_balance'
  | 'send'
  | 'confirm'
  | 'passkey_sign'
  | 'cancel'
  | 'history'
  | 'receive'
  | 'fund'
  | 'swap'
  | 'copy_address'
  | 'guardians'
  | 'contacts'
  | 'settings'
  | 'earphones_connected'
  | 'switch_mode'
  | 'help'
  | 'unknown';

export interface ParsedIntentResult {
  intent: IntentType;
  amount?: number;
  contact?: string;
  confidence: number;
  detectedLang: SupportedLanguage;
  rawText: string;
}

const KNOWN_CONTACTS = ['Amma', 'Priya', 'Zaid', 'Fatima', 'Sara'];

/**
 * Natural Language Understanding parser for English, Hindi, and Arabic crypto commands.
 * Handles full voice navigation across the entire wallet app.
 */
export function parseVoiceIntent(rawText: string): ParsedIntentResult {
  const clean = rawText.trim();
  const lower = clean.toLowerCase();
  const lang = detectLanguage(clean);

  // 0. Check for Real Passkey / Fingerprint Authorization
  if (
    lower.includes('fingerprint') ||
    lower.includes('passkey') ||
    lower.includes('biometric') ||
    lower.includes('touch id') ||
    lower.includes('face id') ||
    lower.includes('angutha') ||
    lower.includes('ungli') ||
    lower.includes('authorize') ||
    lower.includes('sign with') ||
    clean.includes('بصمة') ||
    clean.includes('مفتاح المرور')
  ) {
    return {
      intent: 'passkey_sign',
      confidence: 0.99,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 0.1 Check for Earphone / Headphone connection confirmation
  if (
    lower.includes('headphone') ||
    lower.includes('earphone') ||
    lower.includes('earphones connected') ||
    lower.includes('headphones connected') ||
    lower.includes('plugged in') ||
    lower.includes('earphone verified') ||
    clean.includes('سماعات') ||
    clean.includes('سماعة')
  ) {
    return {
      intent: 'earphones_connected',
      confidence: 0.99,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 1. Check for Confirm / Yes (vital for hands-free voice sign-off)
  if (
    lower === 'confirm' ||
    lower === 'yes' ||
    lower === 'ok' ||
    lower === 'send now' ||
    lower === 'approve' ||
    lower === 'proceed' ||
    lower.includes('haan') ||
    lower.includes('sahi hai') ||
    lower.includes('bhej do') ||
    clean.includes('تأكيد') ||
    clean.includes('نعم') ||
    clean.includes('موافق') ||
    clean.includes('ارسل الآن')
  ) {
    return {
      intent: 'confirm',
      confidence: 0.99,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 2. Check for Cancel / Veto / Stop
  if (
    lower.includes('cancel') ||
    lower.includes('stop') ||
    lower.includes('no') ||
    lower.includes('rehne do') ||
    lower.includes('venda') ||
    lower.includes('mat bhejo') ||
    lower.includes('ilgha') ||
    clean.includes('إلغاء') ||
    clean.includes('الغاء') ||
    clean.includes('توقف') ||
    clean.includes('لا')
  ) {
    return {
      intent: 'cancel',
      confidence: 0.98,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 3. Check for balance inquiry
  if (
    lower.includes('balance') ||
    lower.includes('kitna') ||
    lower.includes('paise kitne') ||
    lower.includes('kitna bacha') ||
    lower.includes('raseed') ||
    clean.includes('رصيد') ||
    clean.includes('كم رصيدي') ||
    lower.includes('how much')
  ) {
    return {
      intent: 'check_balance',
      confidence: 0.96,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 3.1 Check for Copy Address
  if (
    lower.includes('copy address') ||
    lower.includes('copy my address') ||
    lower === 'copy' ||
    lower.includes('pata copy') ||
    clean.includes('نسخ العنوان') ||
    clean.includes('انسخ')
  ) {
    return {
      intent: 'copy_address',
      confidence: 0.98,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 4. Check for Receive / QR Code / Address
  if (
    lower.includes('receive') ||
    lower.includes('qr') ||
    lower.includes('my address') ||
    lower.includes('pate') ||
    lower.includes('mangvao') ||
    clean.includes('استلام') ||
    clean.includes('عنواني') ||
    clean.includes('باركود')
  ) {
    return {
      intent: 'receive',
      confidence: 0.95,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 5. Check for Guardians / Recovery / Security
  if (
    lower.includes('guardian') ||
    lower.includes('recover') ||
    lower.includes('lost') ||
    lower.includes('suraksha') ||
    lower.includes('rakshak') ||
    clean.includes('أوصياء') ||
    clean.includes('وصي') ||
    clean.includes('استرداد') ||
    clean.includes('حماية')
  ) {
    return {
      intent: 'guardians',
      confidence: 0.93,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 6. Check for Contacts Book
  if (
    lower.includes('contact') ||
    lower.includes('address book') ||
    lower.includes('dost') ||
    lower.includes('sampark') ||
    clean.includes('جهات الاتصال') ||
    clean.includes('الاصدقاء')
  ) {
    return {
      intent: 'contacts',
      confidence: 0.94,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 7. Check for transaction history / past activity
  if (
    lower.includes('history') ||
    lower.includes('activity') ||
    lower.includes('transactions') ||
    lower.includes('past') ||
    lower.includes('pehle') ||
    lower.includes('pichla') ||
    clean.includes('سجل') ||
    clean.includes('المعاملات') ||
    clean.includes('نشاط')
  ) {
    return {
      intent: 'history',
      confidence: 0.94,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 8. Check for Help / What can I say
  if (
    lower.includes('help') ||
    lower.includes('what can i say') ||
    lower.includes('madad') ||
    lower.includes('kya bolu') ||
    clean.includes('مساعدة') ||
    clean.includes('ماذا يمكنني')
  ) {
    return {
      intent: 'help',
      confidence: 0.97,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 8.1 Check for Settings
  if (
    lower.includes('setting') ||
    lower.includes('preference') ||
    lower.includes('audio setting') ||
    lower.includes('awaz setting') ||
    clean.includes('إعدادات') ||
    clean.includes('اعدادات')
  ) {
    return {
      intent: 'settings',
      confidence: 0.96,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 9. Check for Mode Switch
  if (
    lower.includes('blind mode') ||
    lower.includes('accessibility mode') ||
    lower.includes('voice mode') ||
    lower.includes('visual mode') ||
    lower.includes('mode badlo')
  ) {
    return {
      intent: 'switch_mode',
      confidence: 0.95,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 9.1 Check for Fund / Deposit
  if (
    lower.includes('fund') ||
    lower.includes('deposit') ||
    lower.includes('add cash') ||
    lower.includes('add funds') ||
    lower.includes('add money') ||
    lower.includes('faucet') ||
    lower.includes('paise daalo') ||
    lower.includes('jama karo') ||
    clean.includes('إيداع') ||
    clean.includes('شحن')
  ) {
    return {
      intent: 'fund',
      confidence: 0.98,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 9.2 Check for Swap / Exchange
  if (
    lower.includes('swap') ||
    lower.includes('exchange') ||
    lower.includes('convert') ||
    lower.includes('trade') ||
    lower.includes('badlo') ||
    lower.includes('tabdeel') ||
    clean.includes('تبديل') ||
    clean.includes('مبادلة')
  ) {
    return {
      intent: 'swap',
      confidence: 0.98,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 10. Check for Send money (with contact and amount extraction)
  const isSend =
    lower.includes('send') ||
    lower.includes('pay') ||
    lower.includes('transfer') ||
    lower.includes('bhejo') ||
    lower.includes('de do') ||
    lower.includes('daalo') ||
    lower.includes('arsil') ||
    clean.includes('أرسل') ||
    clean.includes('ارسل') ||
    clean.includes('حول') ||
    clean.includes('ادفع');

  if (isSend) {
    let matchedContact: string | undefined = undefined;
    for (const c of KNOWN_CONTACTS) {
      if (lower.includes(c.toLowerCase()) || clean.includes(c)) {
        matchedContact = c;
        break;
      }
    }
    // Also check aliases
    if (clean.includes('أمي') || clean.includes('امي') || lower.includes('mom') || lower.includes('mother')) {
      matchedContact = 'Amma';
    } else if (clean.includes('صديقي') || lower.includes('friend')) {
      matchedContact = 'Priya';
    } else if (!matchedContact) {
      // Extract explicit recipient name from phrases like "send 10 ETH to John" or "John ko 10 bhejo"
      const toMatch = lower.match(/(?:send|pay|transfer)\s+[\d.]+\s*(?:eth|sepolia\s*eth)?\s+to\s+([a-zA-Z]+)/i);
      const koMatch = lower.match(/([a-zA-Z]+)\s+ko\s+[\d.]+/i);
      if (toMatch && toMatch[1]) {
        matchedContact = toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1).toLowerCase();
      } else if (koMatch && koMatch[1]) {
        matchedContact = koMatch[1].charAt(0).toUpperCase() + koMatch[1].slice(1).toLowerCase();
      }
    }

    // Extract amount
    let amount = 0.1;
    const numMatch = clean.match(/(\d+(\.\d+)?)/);
    if (numMatch) {
      amount = parseFloat(numMatch[1]);
    } else if (lower.includes('one') || lower.includes('ek') || clean.includes('واحد')) {
      amount = 1.0;
    } else if (lower.includes('half') || lower.includes('aadha') || clean.includes('نصف')) {
      amount = 0.5;
    } else if (lower.includes('two') || lower.includes('do') || clean.includes('اثنين')) {
      amount = 2.0;
    } else if (lower.includes('quarter') || clean.includes('ربع')) {
      amount = 0.25;
    }

    return {
      intent: 'send',
      amount,
      contact: matchedContact,
      confidence: 0.95,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // Fallback default
  return {
    intent: 'unknown',
    confidence: 0.5,
    detectedLang: lang,
    rawText: clean,
  };
}
