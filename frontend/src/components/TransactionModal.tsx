import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, X, Volume2, ArrowUpRight } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { signTransactionWithPasskey } from '../utils/passkeyAuth';

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
      return `${contact} को ${amount} टेस्ट इथीरियम भेज रहे हैं। फिंगरप्रिंट या पासकी से पुष्टि करें।`;
    }
    if (lang === 'ar') {
      return `إرسال ${amount} إيثيريوم تجريبي إلى ${contact}. يرجى التأكيد ببصمة الإصبع أو مفتاح المرور.`;
    }
    return `Send ${amount} test Ether to ${contact}. Confirm with fingerprint or passkey.`;
  };

  useEffect(() => {
    if (isOpen) {
      setScanState('idle');
      audioCues.playIntentRecognized();
      speakText(getReadbackText(), lang);

      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

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

  const handleSimulatePasskey = async () => {
    setScanState('scanning');
    audioCues.playListeningStarted();

    const pseudoTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const result = await signTransactionWithPasskey(pseudoTx, contact, amount);

    if (result.success) {
      setScanState('approved');
      audioCues.playPasskeySuccess();
      setTimeout(() => audioCues.playSuccess(), 250);
      speakText(
        lang === 'hi'
          ? 'पासकी द्वारा हस्ताक्षर हुआ! लेनदेन स्वीकृत और ब्लॉकचेन पर भेजा गया।'
          : lang === 'ar'
          ? 'تم التحقق من البصمة! تم تأكيد المعاملة وإرسالها إلى البلوكتشين.'
          : 'Passkey signature verified! Transaction approved and broadcast to blockchain.',
        lang
      );

      setTimeout(() => {
        onSuccess(amount, contact);
        onClose();
      }, 1100);
    } else {
      setScanState('idle');
      audioCues.playWarning();
      speakText('Biometric verification cancelled. Tap to try again.', lang);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
    >
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-2xl relative text-slate-900 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dialog-title" className="text-lg font-bold text-slate-900 tracking-tight">
                {lang === 'hi' ? 'लेनदेन की पुष्टि करें' : lang === 'ar' ? 'تأكيد المعاملة' : 'Confirm Transaction'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'hi' ? 'स्मार्ट कॉन्ट्रैक्ट वॉल्ट' : lang === 'ar' ? 'خزينة العقود الذكية' : 'Smart Contract Vault'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Readback announcement box */}
        <div id="dialog-desc" className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
          <button
            onClick={() => speakText(getReadbackText(), lang)}
            className="mt-0.5 p-2 rounded-xl bg-white hover:bg-[#FF5500]/10 text-[#FF5500] border border-slate-200 transition shrink-0 shadow-sm"
            title="Listen again"
            aria-label="Repeat spoken details"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <div className="text-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              {lang === 'hi' ? 'सुनाया गया विवरण:' : lang === 'ar' ? 'التفاصيل المقروءة:' : 'Voice Read-Back:'}
            </p>
            <p className="font-semibold text-slate-800 leading-snug">{getReadbackText()}</p>
          </div>
        </div>

        {/* Amount & Contact Details */}
        <div className="space-y-2.5 mb-6 text-sm">
          <div className="flex justify-between items-center py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">{lang === 'hi' ? 'प्राप्तकर्ता:' : lang === 'ar' ? 'المستلم:' : 'Recipient:'}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{contact}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-[#FF5500]/10 text-[#FF5500] font-mono font-medium">
                {contact === 'Amma' ? '0x71C8...4E92' : '0x89AB...12F4'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">{lang === 'hi' ? 'राशि:' : lang === 'ar' ? 'المبلغ:' : 'Amount:'}</span>
            <div className="text-right">
              <span className="text-xl font-extrabold text-slate-900 tabular-nums">{amount} ETH</span>
              <span className="block text-[11px] text-slate-400">≈ ${(amount * 3368.2).toFixed(2)} USD</span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">{lang === 'hi' ? 'गैस शुल्क:' : lang === 'ar' ? 'رسوم الشبكة:' : 'Gas Fee:'}</span>
            <span className="text-xs font-mono text-[#FF5500] font-bold">&lt; 0.0001 ETH ($0.12)</span>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 px-1">
          <ShieldCheck className="w-4 h-4 text-[#FF5500] shrink-0" />
          <span>
            {lang === 'hi'
              ? 'AI सीधे पैसे नहीं भेजता; बायोमेट्रिक हस्ताक्षर अनिवार्य है।'
              : lang === 'ar'
              ? 'الذكاء الاصطناعي لا يحرك الأموال دون تأكيد البصمة الحيوية.'
              : 'AI never moves money directly. Passkey approval is required.'}
          </span>
        </div>

        {/* Biometric Confirmation Button */}
        <div className="flex flex-col gap-2.5">
          <button
            ref={confirmBtnRef}
            onClick={handleSimulatePasskey}
            disabled={scanState !== 'idle'}
            className={`w-full py-3.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2.5 transition-all text-sm shadow-md ${
              scanState === 'approved'
                ? 'bg-[#FF5500] text-white shadow-orange-500/20'
                : scanState === 'scanning'
                ? 'bg-[#E04B00] text-white animate-pulse'
                : 'bg-[#FF5500] hover:bg-[#E04B00] text-white shadow-orange-500/25 active:scale-98'
            }`}
          >
            {scanState === 'approved' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{lang === 'hi' ? 'स्वीकृत! भेजा गया' : lang === 'ar' ? 'تمت الموافقة بنجاح' : 'Approved & Broadcast!'}</span>
              </>
            ) : scanState === 'scanning' ? (
              <>
                <Fingerprint className="w-5 h-5 animate-spin" />
                <span>{lang === 'hi' ? 'पासकी जांची जा रही है...' : lang === 'ar' ? 'جاري التحقق من البصمة...' : 'Verifying Passkey...'}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>{lang === 'hi' ? 'फिंगरप्रिंट से पुष्टि करें' : lang === 'ar' ? 'تأكيد ببصمة الإصبع' : 'Confirm with Fingerprint'}</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            {lang === 'hi' ? 'रद्द करें' : lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
