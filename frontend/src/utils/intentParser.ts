import { detectLanguage, SupportedLanguage } from './i18n';

export interface ParsedIntentResult {
  intent: 'check_balance' | 'send' | 'history' | 'add_contact' | 'recovery_help' | 'cancel' | 'unknown';
  amount?: number;
  contact?: string;
  confidence: number;
  detectedLang: SupportedLanguage;
  rawText: string;
}

const KNOWN_CONTACTS = ['Amma', 'Rahul', 'Zaid', 'Fatima', 'Priya', 'Sara'];

/**
 * Natural Language Understanding parser for English, Hindi, and Arabic crypto commands.
 */
export function parseVoiceIntent(rawText: string): ParsedIntentResult {
  const clean = rawText.trim();
  const lower = clean.toLowerCase();
  const lang = detectLanguage(clean);

  // 1. Check for cancel / veto
  if (
    lower.includes('cancel') ||
    lower.includes('stop') ||
    lower.includes('rehne do') ||
    lower.includes('venda') ||
    lower.includes('ilgha') ||
    clean.includes('إلغاء') ||
    clean.includes('الغاء')
  ) {
    return {
      intent: 'cancel',
      confidence: 0.98,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 2. Check for balance inquiry
  if (
    lower.includes('balance') ||
    lower.includes('kitna') ||
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

  // 3. Check for transaction history
  if (
    lower.includes('history') ||
    lower.includes('transactions') ||
    lower.includes('past') ||
    lower.includes('pehle') ||
    clean.includes('سجل') ||
    clean.includes('المعاملات')
  ) {
    return {
      intent: 'history',
      confidence: 0.94,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 4. Check for recovery assistance
  if (
    lower.includes('recover') ||
    lower.includes('lost') ||
    lower.includes('phone kho gaya') ||
    lower.includes('guardian') ||
    clean.includes('استرداد') ||
    clean.includes('فقدت')
  ) {
    return {
      intent: 'recovery_help',
      confidence: 0.92,
      detectedLang: lang,
      rawText: clean,
    };
  }

  // 5. Check for Send money (with amount and contact extraction)
  const isSend =
    lower.includes('send') ||
    lower.includes('pay') ||
    lower.includes('bhejo') ||
    lower.includes('de do') ||
    lower.includes('arsil') ||
    clean.includes('أرسل') ||
    clean.includes('ارسل') ||
    clean.includes('حول');

  if (isSend) {
    // Extract contact
    let matchedContact = 'Amma'; // Default demo recipient if not explicit
    for (const c of KNOWN_CONTACTS) {
      if (lower.includes(c.toLowerCase()) || clean.includes(c)) {
        matchedContact = c;
        break;
      }
    }
    // Also check Arabic/Hindi variants for "Mom/Amma"
    if (clean.includes('أمي') || clean.includes('امي') || lower.includes('mom') || lower.includes('mother')) {
      matchedContact = 'Amma';
    }

    // Extract amount
    let amount = 0.1; // Default realistic demo amount
    const numMatch = clean.match(/(\d+(\.\d+)?)/);
    if (numMatch) {
      amount = parseFloat(numMatch[1]);
    } else if (lower.includes('one') || lower.includes('ek') || clean.includes('واحد')) {
      amount = 1.0;
    } else if (lower.includes('half') || lower.includes('aadha') || clean.includes('نصف')) {
      amount = 0.5;
    } else if (lower.includes('paanch') || lower.includes('khamsa') || lower.includes('five')) {
      amount = 5.0;
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
    intent: 'check_balance',
    confidence: 0.75,
    detectedLang: lang,
    rawText: clean,
  };
}
