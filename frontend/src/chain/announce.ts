/**
 * What the app says for every contract event and every transaction step, in
 * English, Arabic and Hindi. Addresses are never read out: they become contact
 * names, or "an unknown wallet". `urgent` messages (someone else acting on the
 * user's wallet) belong in an assertive live region.
 */
import { formatEther } from 'ethers';
import type { SupportedLanguage } from '../utils/i18n';
import type { FailReason, TxProgress, VaultEvent } from './vault';

export interface Announcement {
  text: string;
  urgent: boolean;
}

export interface AnnounceContext {
  lang: SupportedLanguage;
  /** Contact name for an address (address book on the device), or null. */
  nameOf: (address: string) => string | null;
  /** This phone's address, to say "this phone" instead of a name. */
  me?: string | null;
  threshold: number;
  /** Current chain time in unix seconds, for "in 2 minutes". */
  now: number;
}

type L = Record<SupportedLanguage, string>;
const pick = (m: L, lang: SupportedLanguage) => m[lang] ?? m.en;

const UNKNOWN: L = { en: 'an unknown wallet', ar: 'محفظة غير معروفة', hi: 'एक अनजान वॉलेट' };
const UNIT: L = { en: 'test ETH', ar: 'إيثيريوم تجريبي', hi: 'टेस्ट ईथर' };

function amount(wei: unknown, lang: SupportedLanguage): string {
  const n = Number(formatEther(wei as bigint));
  const s = (Math.round(n * 10000) / 10000).toString();
  return `${s} ${pick(UNIT, lang)}`;
}

function minutes(untilTs: unknown, now: number, lang: SupportedLanguage): string {
  // Round, not ceil: block times are a second or two apart, and 121 s should still say "2 minutes".
  const m = Math.max(1, Math.round((Number(untilTs) - now) / 60));
  if (lang === 'ar') return m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : `${m} دقائق`;
  if (lang === 'hi') return `${m} मिनट`;
  return m === 1 ? '1 minute' : `${m} minutes`;
}

function who(address: unknown, ctx: AnnounceContext): string {
  const a = String(address);
  return ctx.nameOf(a) ?? pick(UNKNOWN, ctx.lang);
}

const same = (a: unknown, b?: string | null) => !!b && String(a).toLowerCase() === b.toLowerCase();

export function describeEvent(ev: VaultEvent, ctx: AnnounceContext): Announcement {
  const { lang } = ctx;
  const a = ev.args;
  const t = (m: L, urgent = false): Announcement => ({ text: pick(m, lang), urgent });

  switch (ev.name) {
    case 'Deposited': {
      const amt = amount(a.amount, lang), from = who(a.from, ctx);
      return t({ en: `You received ${amt} from ${from}.`, ar: `وصلك ${amt} من ${from}.`, hi: `${from} से ${amt} मिला।` });
    }
    case 'Sent': {
      const amt = amount(a.amount, lang), to = who(a.to, ctx);
      return t({ en: `Sent ${amt} to ${to}.`, ar: `تم تحويل ${amt} إلى ${to}.`, hi: `${to} को ${amt} भेज दिया गया।` });
    }
    case 'Pinged':
      return t({ en: 'Got it. Your wallet knows you are here.', ar: 'تمام. المحفظة عرفت إنك موجود.', hi: 'ठीक है। वॉलेट को पता है कि आप मौजूद हैं।' });
    case 'RecoveryProposed': {
      const g = who(a.guardian, ctx);
      return t({
        en: `${g} started moving your wallet to a new phone. If this wasn't you, say "cancel recovery".`,
        ar: `${g} بدأ نقل محفظتك لجوال جديد. إذا ما كنت أنت، قل "الغي الاسترجاع".`,
        hi: `${g} ने आपका वॉलेट नए फ़ोन पर ले जाना शुरू किया। अगर यह आप नहीं हैं, तो "रिकवरी कैंसल करो" बोलिए।`,
      }, true);
    }
    case 'RecoveryApproved': {
      const g = who(a.guardian, ctx), n = Number(a.approvals), th = ctx.threshold;
      const ready = Number(a.readyAt) > 0 ? minutes(a.readyAt, ctx.now, lang) : null;
      return t({
        en: `${g} approved the recovery. ${n} of ${th} approvals.` + (ready ? ` It can finish in ${ready}.` : ''),
        ar: `${g} وافق على الاسترجاع. ${n} من ${th}.` + (ready ? ` يكتمل بعد ${ready}.` : ''),
        hi: `${g} ने रिकवरी मंज़ूर की। ${th} में से ${n}।` + (ready ? ` ${ready} में पूरी हो सकती है।` : ''),
      });
    }
    case 'RecoveryExecuted':
      if (same(a.newOwner, ctx.me)) {
        return t({ en: 'Recovery complete. This phone now controls your wallet.', ar: 'تم الاسترجاع. هذا الجوال الحين يتحكم بمحفظتك.', hi: 'रिकवरी पूरी हुई। अब यह फ़ोन आपका वॉलेट चलाता है।' }, true);
      }
      if (same(a.oldOwner, ctx.me)) {
        return t({ en: 'Your wallet moved to your new phone. This phone can no longer send money.', ar: 'محفظتك انتقلت لجوالك الجديد. هذا الجوال ما يقدر يرسل فلوس بعد الحين.', hi: 'आपका वॉलेट नए फ़ोन पर चला गया। यह फ़ोन अब पैसे नहीं भेज सकता।' }, true);
      }
      return t({ en: 'Recovery complete. The wallet moved to a new phone.', ar: 'تم الاسترجاع. المحفظة انتقلت لجوال جديد.', hi: 'रिकवरी पूरी हुई। वॉलेट नए फ़ोन पर चला गया।' }, true);
    case 'RecoveryCancelled':
      return t({ en: 'Recovery cancelled. Your wallet is safe.', ar: 'تم إلغاء الاسترجاع. محفظتك بأمان.', hi: 'रिकवरी रद्द हो गई। आपका वॉलेट सुरक्षित है।' });
    case 'InheritanceStarted': {
      const m = minutes(a.claimableAt, ctx.now, lang);
      return t({
        en: `Your wallet has been inactive. It passes to your beneficiary in ${m} unless you or a guardian stop it.`,
        ar: `محفظتك غير نشطة. تنتقل للوريث بعد ${m} إذا ما أوقفتها أنت أو أحد الأوصياء.`,
        hi: `आपका वॉलेट निष्क्रिय है। ${m} में यह आपके वारिस को मिल जाएगा, जब तक आप या कोई गार्डियन इसे न रोकें।`,
      }, true);
    }
    case 'InheritanceVetoed':
      return t({ en: 'Inheritance stopped. The owner is active.', ar: 'توقفت الوراثة. صاحب المحفظة نشط.', hi: 'विरासत रोक दी गई। मालिक सक्रिय है।' });
    case 'InheritanceClaimed': {
      const amt = amount(a.amount, lang), b = who(a.beneficiary, ctx);
      return t({ en: `${amt} passed to ${b}. The wallet is closed.`, ar: `انتقل ${amt} إلى ${b}. المحفظة أُغلقت.`, hi: `${amt} ${b} को मिल गया। वॉलेट बंद हो गया।` }, true);
    }
    default:
      return { text: ev.name, urgent: false };
  }
}

const FAIL: Record<FailReason, L> = {
  rejected: { en: 'Fingerprint cancelled. Nothing was sent.', ar: 'ألغيت البصمة. ما انرسل شي.', hi: 'फिंगरप्रिंट रद्द हुआ। कुछ नहीं भेजा गया।' },
  not_owner: { en: 'This phone is not the wallet owner.', ar: 'هذا الجوال مو صاحب المحفظة.', hi: 'यह फ़ोन वॉलेट का मालिक नहीं है।' },
  not_guardian: { en: 'Only a guardian can do that.', ar: 'هذا للأوصياء بس.', hi: 'यह सिर्फ़ गार्डियन कर सकते हैं।' },
  not_beneficiary: { en: 'Only the beneficiary can claim.', ar: 'الوريث بس يقدر يستلم.', hi: 'सिर्फ़ वारिस ही क्लेम कर सकता है।' },
  closed: { en: 'This wallet is closed.', ar: 'هذي المحفظة مقفلة.', hi: 'यह वॉलेट बंद है।' },
  bad_address: { en: 'That wallet address is not allowed.', ar: 'عنوان المحفظة هذا غير مسموح.', hi: 'यह वॉलेट पता मान्य नहीं है।' },
  insufficient_balance: { en: 'Not enough money in the wallet.', ar: 'ما في رصيد كافي.', hi: 'वॉलेट में पर्याप्त पैसे नहीं हैं।' },
  recovery_active: { en: 'A recovery is already running.', ar: 'فيه استرجاع شغال.', hi: 'एक रिकवरी पहले से चल रही है।' },
  no_recovery: { en: 'There is no recovery running.', ar: 'ما فيه استرجاع شغال.', hi: 'कोई रिकवरी नहीं चल रही।' },
  wrong_new_owner: { en: 'That is not the phone being recovered to.', ar: 'هذا مو الجوال اللي ينقل له الاسترجاع.', hi: 'यह वह फ़ोन नहीं है जिस पर रिकवरी हो रही है।' },
  already_approved: { en: 'This guardian already approved.', ar: 'هذا الوصي وافق من قبل.', hi: 'यह गार्डियन पहले ही मंज़ूरी दे चुका है।' },
  recovery_not_ready: { en: 'Not yet. It needs enough approvals and the waiting time to pass.', ar: 'مو الحين. يحتاج موافقات كافية ومرور وقت الانتظار.', hi: 'अभी नहीं। पर्याप्त मंज़ूरी और इंतज़ार का समय पूरा होना चाहिए।' },
  owner_active: { en: 'The owner was active recently.', ar: 'صاحب المحفظة كان نشط قريب.', hi: 'मालिक हाल ही में सक्रिय था।' },
  inheritance_active: { en: 'The inheritance has already started.', ar: 'الوراثة بدأت من قبل.', hi: 'विरासत पहले ही शुरू हो चुकी है।' },
  no_inheritance: { en: 'No inheritance is running.', ar: 'ما فيه وراثة شغالة.', hi: 'कोई विरासत नहीं चल रही।' },
  grace_not_over: { en: 'The waiting period is not over yet.', ar: 'فترة الانتظار ما خلصت.', hi: 'इंतज़ार का समय अभी पूरा नहीं हुआ।' },
  no_gas: { en: 'This phone has no ETH to pay the network fee.', ar: 'الجوال ما عنده إيثيريوم لرسوم الشبكة.', hi: 'इस फ़ोन के पास नेटवर्क फ़ीस के लिए ईथर नहीं है।' },
  network: { en: 'Network problem. Please try again.', ar: 'مشكلة في الشبكة. حاول مرة ثانية.', hi: 'नेटवर्क में दिक्कत है। फिर से कोशिश कीजिए।' },
  unknown: { en: 'That did not work. Nothing was sent.', ar: 'ما زبطت. ما انرسل شي.', hi: 'यह नहीं हुआ। कुछ नहीं भेजा गया।' },
};

/** "Pending." / "Confirmed." / why it failed. Null for the silent 'approving' step. */
export function describeProgress(p: TxProgress, lang: SupportedLanguage): Announcement | null {
  switch (p.stage) {
    case 'approving':
      return null; // the passkey prompt speaks for itself
    case 'pending':
      return { text: pick({ en: 'Pending.', ar: 'جاري التنفيذ.', hi: 'प्रक्रिया में है।' }, lang), urgent: false };
    case 'confirmed':
      return { text: pick({ en: 'Confirmed.', ar: 'تم التأكيد.', hi: 'पुष्टि हो गई।' }, lang), urgent: false };
    case 'failed':
      return { text: pick(FAIL[p.reason], lang), urgent: true };
  }
}
