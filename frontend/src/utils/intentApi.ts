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
  'contacts', 'settings', 'help', 'switch_mode',
];

// Model intent -> the screen the wallet already has for it.
const MODEL_TO_APP: Record<string, IntentType> = {
  check_balance: 'check_balance',
  send: 'send',
  receive: 'receive',
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

async function askModel(text: string, contacts: string[]): Promise<ModelResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The wallet holds test ETH, so an amount with no currency means ETH;
      // the model says "ETH" in its read-back so the user hears it.
      body: JSON.stringify({ text, contacts, default_unit: 'ETH' }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`intent API ${res.status}`);
    return (await res.json()) as ModelResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function understandCommand(text: string, contacts: string[]): Promise<UnderstoodCommand> {
  const local = parseVoiceIntent(text);
  if (APP_INTENTS.includes(local.intent)) {
    return { ...local, source: 'rules' };
  }
  try {
    const m = await askModel(text, contacts);
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

/** What to say when a send can't go ahead as understood. */
export function sendBlocker(cmd: UnderstoodCommand): string | null {
  if (cmd.source !== 'model') return null;
  const l = cmd.detectedLang;
  if (cmd.recipientType === 'self') return cmd.readback || 'That is your own wallet. Nothing was sent.';
  if (cmd.unit && cmd.unit !== 'ETH') {
    return l === 'hi'
      ? 'अभी मैं सिर्फ़ टेस्ट ईथर भेज सकता हूँ। रकम ईथर में बोलिए।'
      : l === 'ar'
      ? 'حالياً أقدر أرسل إيثيريوم تجريبي بس. قل المبلغ بالإيثيريوم.'
      : 'I can only send test ETH right now. Please say the amount in ETH.';
  }
  if (cmd.recipientType && cmd.recipientType !== 'contact') {
    return l === 'hi'
      ? 'अभी मैं सिर्फ़ सेव किए गए कॉन्टैक्ट को भेज सकता हूँ। कॉन्टैक्ट का नाम बोलिए।'
      : l === 'ar'
      ? 'حالياً أقدر أرسل لجهات الاتصال المحفوظة بس. قل اسم الشخص.'
      : 'I can only send to a saved contact right now. Please say the contact’s name.';
  }
  return null;
}
