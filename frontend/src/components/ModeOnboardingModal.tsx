import React, { useEffect, useRef } from 'react';
import { Volume2, Eye, Mic, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';
import logoImg from '../../Assets/logo.png';

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
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
          <img src={logoImg} alt="SayPay" className="h-7 w-auto object-contain" />
          <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 tracking-wider">
            Accessibility Setup
          </span>
        </div>

        <p id="onboarding-desc" className="text-sm text-zinc-600 mb-6 leading-relaxed">
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
            className="w-full text-left p-5 rounded-2xl border-2 border-[#FF5500] bg-[#FF5500]/10 hover:bg-[#FF5500]/15 transition relative group shadow-sm focus:outline-none focus:ring-4 focus:ring-[#FF5500]/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500] text-white flex items-center justify-center shrink-0 shadow-md">
                  <Mic className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-zinc-950 font-display">
                      Voice-Assisted Mode
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-[#FF5500] text-white">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1 leading-normal font-medium">
                    Designed for blind and low-vision users. Auto-reads balances, speaks every transaction step, provides audible earcons, and activates spacebar speech trigger.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-[#FF5500] shrink-0 mt-2 transition group-hover:translate-x-1" />
            </div>
          </button>

          {/* Option B: Visual Standard Mode */}
          <button
            onClick={() => {
              audioCues.playSuccess();
              speakText('Visual Standard Mode activated.', currentLang);
              onSelectMode('visual');
            }}
            className="w-full text-left p-5 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 transition relative group shadow-sm focus:outline-none focus:ring-4 focus:ring-zinc-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-zinc-950 block font-display">
                    Visual Standard Mode
                  </span>
                  <p className="text-xs text-zinc-500 mt-1 leading-normal font-medium">
                    Modern visual crypto dashboard. Voice control and read-aloud buttons are available on-demand, without automatic screen reading.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 shrink-0 mt-2 transition group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        {/* Footer info note */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
            <span>WCAG AAA Accessible &bull; Voice Hotkey Enabled</span>
          </div>

          <button
            onClick={() => {
              onClose();
            }}
            className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
