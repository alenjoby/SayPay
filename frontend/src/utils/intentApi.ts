import { parseVoiceIntent, IntentType, ParsedIntentResult } from './intentParser';
import type { SupportedLanguage } from './i18n';

/**
 * Understands a spoken command with the SayPay intent model (ml/ API), and
 * falls back to the local keyword parser when the model server is not reachable.
 *
 * App navigation ("fingerprint", "earphones connected", "show contacts", "help", ...)
 * stays with the local parser; money commands go to the model, which handles
 * Arabic / English / Hindi code-switching, misspelled names and number words.
 *
 * Start the model:  cd ml && python -m uvicorn app.main:app --port 8000
 * By default the request goes to /saypay-api on this same server, which Vite
 * forwards to the model on port 8000 (see vite.config.ts), so it also works
 * through a Cloudflare tunnel. Other URL: VITE_INTENT_API_URL in frontend/.env
 */
const API_URL = (import.meta.env.VITE_INTENT_API_URL as string | undefined) || '/saypay-api';
const TIMEOUT_MS = 2500;

// Commands about the app itself, not money: the local parser is exact for these.
const APP_INTENTS: IntentType[] = [
  'passkey_sign', 'confirm', 'earphones_connected', 'copy_address', 'guardians',
  'contacts', 'settings', 'help', 'switch_mode', 'fund', 'swap',
];

// Model intent -> the screen the wallet already has for it.
const MODEL_TO_APP: Record<string, IntentType> = {
  check_balance: 'check_balance',
  send: 'send',
  receive: 'receive',
  fund: 'fund',
  deposit: 'fund',
  swap: 'swap',
  exchange: 'swap',
  history: 'history',
  tx_status: 'history', // "did my payment go through" -> latest transaction status
  add_contact: 'contacts',
  recovery_help: 'guardians', // "I lost my phone" -> guardian recovery
  cancel: 'cancel',
  unknown: 'unknown',
};

export interface ModelResponse {
  intent: string;
  confidence: number;
  needs_clarification: boolean;
  clarification: { type: string; options?: string[] | null; slots?: string[] | null } | null;
  amount: number | null;
  unit: string | null;
  recipient: { type: string; value: string | null; contact: string | null; score: number } | null;
  contact: string | null;
  name: string | null;
  lang_mix: string[];
  readback: { text: string; lang: SupportedLanguage };
  engine: string;
}

export interface UnderstoodCommand extends ParsedIntentResult {
  /** 'model' when the SayPay model answered, 'rules' for the local parser. */
  source: 'model' | 'rules';
  /** The model wants to ask a question instead of acting (low confidence or missing slot). */
  needsClarification?: boolean;
  /** Sentence to speak before acting, in the user's language (model only). */
  readback?: string;
  unit?: string | null;
  recipientType?: string | null;
  model?: ModelResponse;
}

async function askModel(text: string, contacts: string[], replyLang?: SupportedLanguage): Promise<ModelResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The wallet holds test ETH, so an amount with no currency means ETH;
      // the model says "ETH" in its read-back so the user hears it.
      // reply_lang: answer in the language the user chose, whatever language they spoke.
      body: JSON.stringify({ text, contacts, default_unit: 'ETH', reply_lang: replyLang ?? null }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`intent API ${res.status}`);
    return (await res.json()) as ModelResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function understandCommand(
  text: string,
  contacts: string[],
  replyLang?: SupportedLanguage
): Promise<UnderstoodCommand> {
  const local = parseVoiceIntent(text);
  if (APP_INTENTS.includes(local.intent)) {
    return { ...local, source: 'rules' };
  }
  try {
    const m = await askModel(text, contacts, replyLang);
    const lang: SupportedLanguage = ['en', 'hi', 'ar'].includes(m.readback?.lang)
      ? m.readback.lang
      : local.detectedLang;
    console.info(`[SayPay model ${m.engine}] ${m.intent} (${m.confidence})`, m);
    return {
      intent: MODEL_TO_APP[m.intent] ?? 'unknown',
      amount: m.amount ?? undefined,
      contact: m.contact ?? undefined,
      confidence: m.confidence,
      detectedLang: lang,
      rawText: text,
      source: 'model',
      needsClarification: m.needs_clarification,
      readback: m.readback?.text,
      unit: m.unit,
      recipientType: m.recipient?.type ?? null,
      model: m,
    };
  } catch (err) {
    console.warn('[SayPay] intent model unreachable, using the local parser:', err);
    return { ...local, source: 'rules' };
  }
}

// Demo exchange rates: US dollars per unit, for the currencies the model recognises.
const USD_PER_UNIT: Record<string, number> = {
  USD: 1, AED: 0.2723, SAR: 0.2667, QAR: 0.2747, OMR: 2.6, BHD: 2.6596, KWD: 3.25, INR: 0.012, EUR: 1.08,
};

/**
 * The amount in ETH. Money in another currency ("50 dirhams", "10 dollars") is converted
 * at the demo rate; null means the unit isn't one we can convert.
 */
export function toEth(amount: number | undefined | null, unit: string | null | undefined, ethRateUSD: number) {
  if (amount === undefined || amount === null) return { eth: amount ?? undefined, from: null as string | null };
  const u = (unit || 'ETH').toUpperCase();
  if (u === 'ETH') return { eth: amount, from: null };
  const usd = USD_PER_UNIT[u] ?? (u.includes('DOLLAR') ? 1 : undefined);
  if (usd === undefined) return null;
  return { eth: Number(((amount * usd) / ethRateUSD).toFixed(4)), from: u };
}

/** The model's last question ("How much should I send to Priya?") and the words it was about. */
export interface PendingQuestion {
  text: string;
  at: number;
}
const FOLLOW_UP_MS = 60_000;

/**
 * Understand an answer to the model's last question. The model reads one sentence at a
 * time, so "0.05" alone doesn't say who it's for: the answer is joined to the sentence
 * that was asked about ("send money to Priya" + "0.05"). A complete new command on its
 * own ("cancel", "what's my balance") wins over the question.
 */
export async function understandFollowUp(
  text: string,
  contacts: string[],
  replyLang: SupportedLanguage | undefined,
  pending: PendingQuestion | null
): Promise<UnderstoodCommand & { contextText: string }> {
  const alone = await understandCommand(text, contacts, replyLang);
  const standsAlone =
    !pending ||
    Date.now() - pending.at > FOLLOW_UP_MS ||
    alone.source !== 'model' ||
    (!alone.needsClarification && alone.intent !== 'unknown');
  if (standsAlone) return { ...alone, contextText: text };

  const contextText = `${pending!.text} ${text}`;
  const joined = await understandCommand(contextText, contacts, replyLang);
  if (joined.source !== 'model' || (joined.intent === 'unknown' && alone.intent !== 'unknown')) {
    return { ...alone, contextText: text };
  }
  console.info('[SayPay] follow-up answer joined to the question:', contextText);
  return { ...joined, rawText: text, contextText };
}

/** What to say when a send can't go ahead as understood. */
export function sendBlocker(
  cmd: UnderstoodCommand,
  availableBalanceETH?: number,
  ethRateUSD: number = 2693
): string | null {
  const l = cmd.detectedLang;

  // Convert dollars, dirhams, riyals, rupees... to ETH for the balance check.
  const converted = toEth(cmd.amount, cmd.unit, ethRateUSD);
  if (!converted) {
    return l === 'hi'
      ? 'यह मुद्रा मैं नहीं बदल सकता। रकम ईथर में बोलिए।'
      : l === 'ar'
      ? 'ما أقدر أحول هذي العملة. قل المبلغ بالإيثيريوم.'
      : "I can't convert that currency. Please say the amount in ETH.";
  }
  const calculatedAmountETH = converted.eth;

  // Strict Balance Check (applies to both model and rule sources)
  if (availableBalanceETH !== undefined && calculatedAmountETH !== undefined && calculatedAmountETH !== null) {
    if (availableBalanceETH <= 0) {
      return l === 'hi'
        ? 'आपके वॉलेट में 0 ईथर शेष है। भेजने से पहले फंड जोड़ें।'
        : l === 'ar'
        ? 'رصيدك الحالي 0 إيثيريوم. يرجى شحن المحفظة أولاً.'
        : 'Cannot send. Your balance is 0 Sepolia ETH. Please fund your wallet first.';
    }
    if (calculatedAmountETH > availableBalanceETH) {
      return l === 'hi'
        ? `अपर्याप्त बैलेंस। आप ${calculatedAmountETH} ईथर नहीं भेज सकते क्योंकि आपका बैलेंस सिर्फ़ ${availableBalanceETH.toFixed(4)} ईथर है।`
        : l === 'ar'
        ? `الرصيد غير كافٍ. لا يمكنك إرسال ${calculatedAmountETH} إيثيريوم، رصيدك هو ${availableBalanceETH.toFixed(4)} إيثيريوم.`
        : `Insufficient balance. Cannot send ${calculatedAmountETH} ETH because your balance is only ${availableBalanceETH.toFixed(4)} ETH.`;
    }
  }

  if (cmd.source === 'model') {
    if (cmd.recipientType === 'self') return cmd.readback || 'That is your own wallet. Nothing was sent.';
  }

  return null;
}
