import React, { useEffect, useRef } from 'react';
import { Volume2, Eye, Mic, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

interface ModeOnboardingModalProps {
  isOpen: boolean;
  currentLang: SupportedLanguage;
  onSelectMode: (mode: 'blind' | 'visual') => void;
  onClose: () => void;
}

export const ModeOnboardingModal: React.FC<ModeOnboardingModalProps> = ({
  isOpen,
  currentLang,
  onSelectMode,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      audioCues.playIntentRecognized();

      const welcomeMessage =
        currentLang === 'hi'
          ? 'से-पे में आपका स्वागत है। आप अपना वॉलेट कैसे इस्तेमाल करना चाहते हैं? विकल्प एक: वॉइस-असिस्टेड मोड, दृष्टिबाधितों के लिए। विकल्प दो: विजुअल स्टैंडर्ड मोड।'
          : currentLang === 'ar'
          ? 'مرحباً بكم في سي-باي. كيف تفضل استخدام محفظتك؟ الخيار الأول: وضع المساعدة الصوتية للمكفوفين. الخيار الثاني: الوضع المرئي القياسي.'
          : 'Welcome to SayPay. How would you like to experience your wallet? Option 1: Voice-Assisted Mode for blind and visually impaired users. Option 2: Visual Standard Mode. You can change this anytime.';

      speakText(welcomeMessage, currentLang);
    }
  }, [isOpen, currentLang]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 focus:outline-none"
        tabIndex={-1}
      >
        {/* Header Icon + Label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#00E575]/15 text-emerald-600 flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Accessibility Setup
            </span>
            <h2 id="onboarding-title" className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Welcome to SayPay
            </h2>
          </div>
        </div>

        <p id="onboarding-desc" className="text-sm text-slate-600 mb-6 leading-relaxed">
          Choose your preferred interaction style. You can switch between these modes anytime with a single tap or voice command.
        </p>

        {/* Options Grid */}
        <div className="space-y-4">
          {/* Option A: Voice-Assisted Mode (Blind & Low Vision) */}
          <button
            onClick={() => {
              audioCues.playSuccess();
              speakText('Voice-Assisted Mode activated. All screen actions and balances will be spoken aloud.', currentLang);
              onSelectMode('blind');
            }}
            className="w-full text-left p-5 rounded-2xl border-2 border-[#00E575] bg-[#00E575]/10 hover:bg-[#00E575]/15 transition relative group shadow-sm focus:outline-none focus:ring-4 focus:ring-[#00E575]/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#00E575] text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-slate-900 font-display">
                      Voice-Assisted Mode
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-[#00E575] text-slate-950">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-normal font-medium">
                    Designed for blind and low-vision users. Auto-reads balances, speaks every transaction step, provides audible earcons, and activates spacebar speech trigger.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-700 shrink-0 mt-2 transition group-hover:translate-x-1" />
            </div>
          </button>

          {/* Option B: Visual Standard Mode */}
          <button
            onClick={() => {
              audioCues.playSuccess();
              speakText('Visual Standard Mode activated.', currentLang);
              onSelectMode('visual');
            }}
            className="w-full text-left p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition relative group shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-slate-900 block font-display">
                    Visual Standard Mode
                  </span>
                  <p className="text-xs text-slate-500 mt-1 leading-normal font-medium">
                    Modern visual crypto dashboard. Voice control and read-aloud buttons are available on-demand, without automatic screen reading.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 mt-2 transition group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        {/* Footer info note */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>WCAG AAA Accessible &bull; Voice Hotkey Enabled</span>
          </div>

          <button
            onClick={() => {
              onClose();
            }}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
