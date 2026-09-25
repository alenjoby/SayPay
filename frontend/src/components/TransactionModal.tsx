import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, X, Volume2, ArrowUpRight } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';

interface TransactionModalProps {
  isOpen: boolean;
  amount: number;
  contact: string;
  lang: SupportedLanguage;
  onClose: () => void;
  onSuccess: (amount: number, contact: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  amount,
  contact,
  lang,
  onClose,
  onSuccess,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'approved'>('idle');

  const getReadbackText = () => {
    if (lang === 'hi') {
      return `${contact} को ${amount} टेस्ट इथीरियम भेज रहे हैं। फिंगरप्रिंट से पुष्टि करें।`;
    }
    if (lang === 'ar') {
      return `إرسال ${amount} إيثيريوم تجريبي إلى ${contact}. يرجى التأكيد ببصمة الإصبع.`;
    }
    return `Send ${amount} test Ether to ${contact}. Confirm with fingerprint.`;
  };

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      audioCues.playIntentRecognized();
      speakText(getReadbackText(), lang);

      // Focus confirm button for screen reader / keyboard navigation
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSimulatePasskey = () => {
    setScanState('scanning');
    audioCues.playListeningStarted();

    setTimeout(() => {
      setScanState('approved');
      audioCues.playSuccess();
      speakText(
        lang === 'hi'
          ? 'लेनदेन स्वीकृत हुआ और ब्लॉकचेन पर भेजा गया।'
          : lang === 'ar'
          ? 'تم تأكيد المعاملة وإرسالها إلى البلوكتشين.'
          : 'Transaction approved and broadcast to blockchain.',
        lang
      );

      setTimeout(() => {
        onSuccess(amount, contact);
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="luminous-card bg-[#09332e] border-2 border-[#E5FFC3]/30 p-6 md:p-8 rounded-3xl shadow-2xl relative text-white max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#F6851B]/20 text-[#F6851B]">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h2 id="dialog-title" className="text-xl font-bold text-white tracking-tight">
                {lang === 'hi' ? 'लेनदेन की पुष्टि करें' : lang === 'ar' ? 'تأكيد المعاملة' : 'Confirm Transaction'}
              </h2>
              <p className="text-xs text-[#A4C4BC]">
                {lang === 'hi' ? 'स्मार्ट कॉन्ट्रैक्ट वॉल्ट' : lang === 'ar' ? 'خزينة العقود الذكية' : 'Smart Contract Vault'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Readback announcement box */}
        <div id="dialog-desc" className="my-5 p-4 rounded-2xl bg-[#011715] border border-[#E5FFC3]/20 flex items-start gap-3">
          <button
            onClick={() => speakText(getReadbackText(), lang)}
            className="mt-0.5 p-2 rounded-xl bg-white/5 hover:bg-[#F6851B]/20 text-[#F6851B] transition shrink-0"
            title="Listen again"
            aria-label="Repeat spoken details"
          >
            <Volume2 className="w-5 h-5" />
          </button>
          <div className="text-sm">
            <p className="text-xs uppercase tracking-wider text-[#E5FFC3] font-bold mb-1">
              {lang === 'hi' ? 'सुनाया गया विवरण:' : lang === 'ar' ? 'التفاصيل المقروءة:' : 'Voice Read-Back:'}
            </p>
            <p className="font-semibold text-white leading-snug">{getReadbackText()}</p>
          </div>
        </div>

        {/* Amount & Contact Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-white/5">
            <span className="text-sm text-[#A4C4BC]">{lang === 'hi' ? 'प्राप्तकर्ता:' : lang === 'ar' ? 'المستلم:' : 'Recipient:'}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">{contact}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E5FFC3]/20 text-[#E5FFC3] font-mono">
                {contact === 'Amma' ? '0x71C8...4E92' : '0x89AB...12F4'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-white/5">
            <span className="text-sm text-[#A4C4BC]">{lang === 'hi' ? 'राशि:' : lang === 'ar' ? 'المبلغ:' : 'Amount:'}</span>
            <div className="text-right">
              <span className="text-2xl font-black text-[#E5FFC3] tabular-numbers">{amount} ETH</span>
              <span className="block text-xs text-white/50">≈ ${(amount * 3368.2).toFixed(2)} USD</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 px-4 rounded-xl bg-white/5">
            <span className="text-sm text-[#A4C4BC]">{lang === 'hi' ? 'अनुमानित गैस शुल्क:' : lang === 'ar' ? 'رسوم الغاز:' : 'Estimated Gas Fee:'}</span>
            <span className="text-xs font-mono text-[#2EC08B] font-bold">&lt; 0.0001 ETH ($0.12)</span>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="flex items-center gap-2 text-xs text-[#A4C4BC] mb-6 px-1">
          <ShieldCheck className="w-4 h-4 text-[#F6851B] shrink-0" />
          <span>
            {lang === 'hi'
              ? 'AI सीधे पैसे नहीं भेजता; बायोमेट्रिक हस्ताक्षर अनिवार्य है।'
              : lang === 'ar'
              ? 'الذكاء الاصطناعي لا يحرك الأموال دون تأكيد البصمة الحيوية.'
              : 'AI never moves money directly. Passkey approval is required.'}
          </span>
        </div>

        {/* Biometric Confirmation Button */}
        <div className="flex flex-col gap-3">
          <button
            ref={confirmBtnRef}
            onClick={handleSimulatePasskey}
            disabled={scanState !== 'idle'}
            className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 text-base shadow-xl ${
              scanState === 'approved'
                ? 'bg-[#2EC08B] text-black shadow-[#2EC08B]/40'
                : scanState === 'scanning'
                ? 'bg-[#F6851B] text-black animate-pulse'
                : 'bg-gradient-to-r from-[#F6851B] to-[#E2761B] hover:brightness-110 text-black shadow-[#F6851B]/30'
            }`}
          >
            {scanState === 'approved' ? (
              <>
                <CheckCircle2 className="w-6 h-6 animate-bounce" />
                <span>{lang === 'hi' ? 'स्वीकृत! भेजा गया' : lang === 'ar' ? 'تمت الموافقة بنجاح' : 'Approved & Broadcast!'}</span>
              </>
            ) : scanState === 'scanning' ? (
              <>
                <Fingerprint className="w-6 h-6 animate-spin" />
                <span>{lang === 'hi' ? 'पासकी जांची जा रही है...' : lang === 'ar' ? 'جاري التحقق من البصمة...' : 'Verifying Passkey...'}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-6 h-6" />
                <span>{lang === 'hi' ? 'फिंगरप्रिंट से पुष्टि करें' : lang === 'ar' ? 'تأكيد ببصمة الإصبع' : 'Confirm with Fingerprint'}</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#A4C4BC] hover:text-white hover:bg-white/5 transition"
          >
            {lang === 'hi' ? 'रद्द करें' : lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
