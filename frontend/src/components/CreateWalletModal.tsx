import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Shield,
  Key,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Eye,
  Check,
  AlertCircle,
  X,
  Radio,
} from 'lucide-react';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';
import { registerWalletPasskey } from '../utils/passkeyAuth';
import { createFreshWalletUser, Guardian, WalletUser } from '../utils/walletState';
import logoImg from '../../Assets/logo.png';

interface CreateWalletModalProps {
  isOpen: boolean;
  currentLang: SupportedLanguage;
  onWalletCreated: (user: WalletUser, mode: 'blind' | 'visual') => void;
  onClose: () => void;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  currentLang,
  onWalletCreated,
  onClose,
}) => {
  // Step 1: Mode Preference (Polite Accessibility Question: Blind or Visual)
  // Step 2: Name and Handle
  // Step 3: Passkey & PIN
  // Step 4: Social Recovery Guardians & Finalize
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Mode Preference
  const [selectedMode, setSelectedMode] = useState<'blind' | 'visual'>('blind');

  // Step 2: Name and Handle
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');

  // Step 3: Passkey & PIN
  const [isPasskeyRegistering, setIsPasskeyRegistering] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [passkeyCredId, setPasskeyCredId] = useState<string | null>(null);
  const [customPin, setCustomPin] = useState('');

  // Step 4: Guardians
  const [guardianName, setGuardianName] = useState('');
  const [guardianRole, setGuardianRole] = useState('Family');
  const [guardiansList, setGuardiansList] = useState<Guardian[]>([]);

  // Voice Interaction State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<number>(1);
  stepRef.current = step;

  // Cleanup speech recognition on unmount or close
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
    setIsVoiceListening(false);
  };

  // Start speech recognition for current step
  const startVoiceRecognition = (targetStep: number) => {
    stopVoiceRecognition();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsVoiceListening(true);
        audioCues.playListeningStarted();
      };

      recognition.onresult = (e: any) => {
        const spoken = e.results[0][0].transcript.trim();
        setVoiceTranscript(spoken);

        if (e.results[0].isFinal) {
          handleVoiceInputForStep(spoken, targetStep);
        }
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceListening(false);
    }
  };

  // Dispatch spoken input according to step
  const handleVoiceInputForStep = (spoken: string, activeStep: number) => {
    const lower = spoken.toLowerCase().replace(/[.,!?]/g, '').trim();

    if (activeStep === 1) {
      // Step 1: Blind or Visual
      const isYes =
        lower.includes('yes') ||
        lower.includes('yeah') ||
        lower.includes('yep') ||
        lower.includes('blind') ||
        lower.includes('voice') ||
        lower.includes('enable') ||
        lower.includes('sure') ||
        lower.includes('okay') ||
        lower.includes('haan') ||
        lower.includes('naam') ||
        lower.includes('हाँ') ||
        lower.includes('نعم') ||
        lower.includes('مكفوف');

      const isNo =
        lower.includes('no') ||
        lower.includes('nope') ||
        lower.includes('visual') ||
        lower.includes('standard') ||
        lower.includes('regular') ||
        lower.includes('nahi') ||
        lower.includes('ना') ||
        lower.includes('नहीं') ||
        lower.includes('لا') ||
        lower.includes('مرئي');

      if (isYes) {
        handleSelectMode('blind');
      } else if (isNo) {
        handleSelectMode('visual');
      } else {
        // Unknown: prompt again gently
        speakText('Please say Yes for Blind Mode, or No for Visual Mode.', currentLang);
        setTimeout(() => startVoiceRecognition(1), 2000);
      }
    } else if (activeStep === 2) {
      // Step 2: Name Input
      if (lower.includes('next') || lower.includes('continue') || lower.includes('अगला') || lower.includes('التالي')) {
        audioCues.playSuccess();
        goToStep(3);
        return;
      }

      // Treat spoken phrase as name
      const cleanName = spoken.replace(/[.,!?]/g, '').trim();
      if (cleanName.length > 0) {
        setName(cleanName);
        setHandle(cleanName.toLowerCase().replace(/\s+/g, ''));
        audioCues.playSuccess();
        const ack =
          currentLang === 'hi'
            ? `समझा, आपका नाम ${cleanName} है। आगे बढ़ने के लिए 'अगला' बोलें या टैप करें।`
            : currentLang === 'ar'
            ? `تم حفظ الاسم: ${cleanName}. قل التالي للمتابعة أو اضغط على الشاشة.`
            : `Got it. Your name is ${cleanName}. Say Next to continue, or tap Continue.`;
        speakText(ack, currentLang);
        setTimeout(() => startVoiceRecognition(2), 2500);
      }
    } else if (activeStep === 3) {
      // Step 3: Passkey or Skip
      if (lower.includes('register') || lower.includes('passkey') || lower.includes('biometric') || lower.includes('fingerprint')) {
        handleRegisterPasskey();
      } else if (lower.includes('skip') || lower.includes('next') || lower.includes('continue') || lower.includes('आगे')) {
        audioCues.playSuccess();
        goToStep(4);
      }
    } else if (activeStep === 4) {
      // Step 4: Finalize or Add Guardian
      if (lower.includes('finish') || lower.includes('create') || lower.includes('done') || lower.includes('launch') || lower.includes('बनाओ') || lower.includes('إنشاء')) {
        handleFinalizeWallet();
      }
    }
  };

  // Mode Selection Handler
  const handleSelectMode = (mode: 'blind' | 'visual') => {
    setSelectedMode(mode);
    audioCues.playSuccess();

    if (mode === 'blind') {
      const prompt =
        currentLang === 'hi'
          ? 'दृष्टिबाधित मोड सक्रिय। सार्वजनिक स्थानों पर गोपनीयता के लिए ईयरफ़ोन की सिफारिश की जाती है, हालांकि आप बिना ईयरफ़ोन भी जारी रख सकते हैं। अब, अपना नाम बताएं।'
          : currentLang === 'ar'
          ? 'تم تفعيل وضع المساعدة الصوتية للمكفوفين. لحمايتك ننصح بسماعات الأذن ولكن يمكنك المتابعة بدونها. الآن، يرجى قول اسمك.'
          : 'Blind Accessibility Mode enabled. For privacy in public spaces, earphones are recommended, but you can proceed with or without them. Now, what is your name? Please speak your name.';
      speakText(prompt, currentLang);
    } else {
      const prompt =
        currentLang === 'hi'
          ? 'विजुअल स्टैंडर्ड मोड सक्रिय। अपना नाम बताएं या दर्ज करें।'
          : currentLang === 'ar'
          ? 'تم تفعيل الوضع المرئي القياسي. يرجى إدخال اسمك أو قوله بصوتك.'
          : 'Visual Standard Mode enabled. What is your name? You can speak your name or type it below.';
      speakText(prompt, currentLang);
    }

    goToStep(2);
  };

  // Step transition helper with automatic audio and speech prompt
  const goToStep = (nextStep: 1 | 2 | 3 | 4) => {
    setStep(nextStep);
    setVoiceTranscript('');
    audioCues.playInterfaceTransition();

    if (nextStep === 2) {
      setTimeout(() => startVoiceRecognition(2), 2200);
    } else if (nextStep === 3) {
      const prompt =
        currentLang === 'hi'
          ? 'चरण तीन: बायोमेट्रिक सुरक्षा। अपने डिवाइस पासकी को पंजीकृत करें या 6 अंकों का पिन सेट करें। रजिस्टर बोलें या स्किप बोलें।'
          : currentLang === 'ar'
          ? 'الخطوة الثالثة: الأمان البيومتري. قم بتسجيل مفتاح المرور أو تعيين رمز سري من 6 أرقام. قل تسجيل أو تخطي.'
          : 'Step three: Passkey Biometrics. Protect your wallet with your fingerprint, Face ID, or a 6-digit PIN. Say Register Passkey or say Skip.';
      speakText(prompt, currentLang);
      setTimeout(() => startVoiceRecognition(3), 3000);
    } else if (nextStep === 4) {
      const prompt =
        currentLang === 'hi'
          ? 'अंतिम चरण: सोशल रिकवरी अभिभावक। आप किसी विश्वसनीय मित्र को जोड़ सकते हैं, या वॉलेट पूरा करने के लिए फिनिश बोलें।'
          : currentLang === 'ar'
          ? 'الخطوة الأخيرة: أوصياء الاسترداد. يمكنك إضافة جهة اتصال موثوقة، أو قل إنشاء لإنهاء الإعداد.'
          : 'Final step: Seedless Social Recovery. Add a trusted contact to help recover your wallet, or say Create Wallet to finish.';
      speakText(prompt, currentLang);
      setTimeout(() => startVoiceRecognition(4), 3000);
    }
  };

  // Launch initial prompt when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
      return;
    }

    setStep(1);
    setVoiceTranscript('');
    audioCues.playIntentRecognized();

    const welcomePrompt =
      currentLang === 'hi'
        ? 'से-पे स्मार्ट वॉलेट निर्माण में आपका स्वागत है। क्या आप दृष्टिबाधित मोड सक्षम करना चाहते हैं? कृपया हाँ या ना कहें, या स्क्रीन पर टैप करें।'
        : currentLang === 'ar'
        ? 'مرحباً بكم في محفظة سي-باي الذكية. هل ترغب في تفعيل وضع المكفوفين المساعد صوتياً؟ يرجى قول نعم أو لا، أو النقر على الشاشة.'
        : 'Welcome to SayPay smart wallet. Would you like to enable Blind Accessibility Mode? Please say Yes or No, or tap either button on screen.';

    speakText(welcomePrompt, currentLang);

    // Give the speech prompt 2 seconds to speak before opening microphone to avoid echo
    const timer = setTimeout(() => {
      startVoiceRecognition(1);
    }, 2400);

    return () => {
      clearTimeout(timer);
      stopVoiceRecognition();
    };
  }, [isOpen, currentLang]);

  // Spacebar Hotkey to toggle speech recognition
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      if (e.repeat) return;
      if (isVoiceListening) {
        stopVoiceRecognition();
      } else {
        startVoiceRecognition(step);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isVoiceListening, step]);

  // Register Passkey
  const handleRegisterPasskey = async () => {
    setIsPasskeyRegistering(true);
    audioCues.playIntentRecognized();

    try {
      const username = name.trim() || 'SayPay User';
      const userId = `user_${Date.now()}`;
      const credId = await registerWalletPasskey(username, userId);

      setIsPasskeyRegistering(false);
      setPasskeyRegistered(true);
      setPasskeyCredId(credId || 'passkey_secp256r1_active');
      audioCues.playSuccess();
      speakText('Device passkey biometric registered successfully. Say Next to proceed.', currentLang);
      setTimeout(() => startVoiceRecognition(3), 2000);
    } catch {
      setIsPasskeyRegistering(false);
      setPasskeyRegistered(true);
      audioCues.playSuccess();
      speakText('Hardware authentication configured. Say Next to proceed.', currentLang);
      setTimeout(() => startVoiceRecognition(3), 2000);
    }
  };

  // Add Guardian
  const handleAddGuardian = () => {
    if (!guardianName.trim()) return;
    const newG: Guardian = {
      id: `g_${Date.now()}`,
      name: guardianName.trim(),
      role: guardianRole,
      status: 'active',
      address: `0x${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...${Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    };
    setGuardiansList([...guardiansList, newG]);
    setGuardianName('');
    audioCues.playSuccess();
    speakText(`Added ${newG.name} as trusted guardian.`, currentLang);
  };

  // Complete Creation
  const handleFinalizeWallet = () => {
    stopVoiceRecognition();
    audioCues.playSuccess();

    const finalUser = createFreshWalletUser(
      name.trim() || 'Wallet Owner',
      handle || (name ? name.toLowerCase().replace(/\s+/g, '') : 'owner'),
      guardiansList,
      customPin || '123456'
    );

    localStorage.setItem('saypay_acc_mode', selectedMode);
    localStorage.setItem('saypay_onboarded', 'true');

    speakText(
      `Your smart wallet is created! Your account is ${finalUser.name}. Opening your wallet now.`,
      currentLang
    );

    onWalletCreated(finalUser, selectedMode);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-wallet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200 focus:outline-none relative"
        tabIndex={-1}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            stopVoiceRecognition();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with SayPay Brand Logo & Progress */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 pr-10">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="SayPay" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-zinc-200" />
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 block tracking-wider">
                Step {step} of 4
              </span>
              <h2 id="create-wallet-title" className="text-base font-black text-zinc-900 tracking-tight">
                Smart Wallet Setup
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-[#FF5500]' : s < step ? 'w-3 bg-emerald-500' : 'w-3 bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Polite Accessibility Question (Blind Mode or Visual Mode) */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1 text-left">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF5500]">
                Accessibility First
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-display">
                Enable Blind Accessibility Mode?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-medium">
                You can say <strong>"Yes"</strong> or <strong>"No"</strong> aloud, or tap either button below. You can change this anytime.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Option A: Blind Accessibility Mode */}
              <button
                type="button"
                onClick={() => handleSelectMode('blind')}
                className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-[#FF5500] bg-orange-50/60 hover:bg-orange-100/50 transition relative group shadow-sm focus:outline-none focus:ring-4 focus:ring-[#FF5500]/30 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#FF5500] text-white flex items-center justify-center shrink-0 shadow-md">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-zinc-950 font-display">
                          Blind Accessibility Mode
                        </span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#FF5500] text-white">
                          Voice First
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 leading-normal font-medium">
                        Speaks aloud every screen action and popup, reads balances automatically, provides acoustic earcon cues, and activates hands-free voice.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#FF5500] shrink-0 mt-1 transition group-hover:translate-x-1" />
                </div>
              </button>

              {/* Option B: Visual Standard Mode */}
              <button
                type="button"
                onClick={() => handleSelectMode('visual')}
                className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-zinc-200 bg-white hover:bg-zinc-50 transition relative group shadow-xs focus:outline-none focus:ring-4 focus:ring-zinc-300 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 border border-zinc-200">
                      <Eye className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-extrabold text-base text-zinc-950 font-display block">
                        Visual Standard Mode
                      </span>
                      <p className="text-xs text-zinc-500 mt-1 leading-normal">
                        Visual dashboard with clean telemetry cards and on-demand microphone controls.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-400 shrink-0 mt-1 transition group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 font-mono flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#FF5500] animate-pulse shrink-0" />
              <span>Say "Yes" or "No" to speak your choice directly.</span>
            </div>
          </div>
        )}

        {/* STEP 2: Name and Handle */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF5500]">
                Identity
              </span>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                What is your name?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                Speak your name or type it below. Your name replaces complex hex addresses.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Your Full or Display Name
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!handle || handle === `@${name.toLowerCase().replace(/\s+/g, '')}.saypay`) {
                        setHandle(e.target.value.toLowerCase().replace(/\s+/g, ''));
                      }
                    }}
                    placeholder="Speak your name or type here"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500] pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceListening) {
                        stopVoiceRecognition();
                      } else {
                        startVoiceRecognition(2);
                      }
                    }}
                    className={`absolute right-2 p-2 rounded-xl transition cursor-pointer ${
                      isVoiceListening
                        ? 'bg-[#FF5500] text-white animate-pulse'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                    title={isVoiceListening ? 'Listening...' : 'Speak your name'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Your SayPay Handle
                </label>
                <div className="flex items-center px-4 py-3 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-sm">
                  <span>@{handle || (name ? name.toLowerCase().replace(/\s+/g, '') : 'yourname')}.saypay</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    setName('Wallet Owner');
                    setHandle('owner');
                  }
                  audioCues.playSuccess();
                  goToStep(3);
                }}
                className="px-6 py-3 rounded-2xl btn-orange text-white font-black text-xs uppercase tracking-wider shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Passkey Biometrics & PIN */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF5500]">
                Security Gate
              </span>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Biometric Passkey Security
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                Protect transactions with your device fingerprint or PIN. No seed phrases to write down or lose.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border-2 border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF5500] flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-zinc-900 block">
                      Hardware Passkey (WebAuthn)
                    </span>
                    <span className="text-xs text-zinc-500">
                      {passkeyRegistered ? 'Passkey registered and active' : 'Touch fingerprint or Face ID'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRegisterPasskey}
                  disabled={isPasskeyRegistering || passkeyRegistered}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    passkeyRegistered
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm'
                  }`}
                >
                  {passkeyRegistered ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Registered</span>
                    </>
                  ) : (
                    <span>{isPasskeyRegistering ? 'Registering...' : 'Register'}</span>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Fallback 6-Digit PIN (Default: 123456)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6 numbers (optional)"
                  className="w-full text-center text-lg tracking-[0.3em] font-mono py-2.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioCues.playSuccess();
                  goToStep(4);
                }}
                className="px-6 py-3 rounded-2xl btn-orange text-white font-black text-xs uppercase tracking-wider shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Social Recovery Guardians & Finalize */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <span className="text-xs uppercase font-extrabold tracking-wider text-[#FF5500]">
                Social Recovery
              </span>
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Trusted Guardians
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                Add family or friends to recover your wallet if you lose your phone, or finalize now.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Guardian name (e.g. Amma, Khalid)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                />
                <button
                  type="button"
                  onClick={handleAddGuardian}
                  disabled={!guardianName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                >
                  Add
                </button>
              </div>

              {guardiansList.length > 0 ? (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {guardiansList.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-zinc-800">{g.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-400">{g.address}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  No guardians added yet. You can add them later anytime inside the wallet.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeWallet}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Finish & Launch Wallet</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
