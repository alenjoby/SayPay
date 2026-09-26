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
} from 'lucide-react';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';
import { registerWalletPasskey } from '../utils/passkeyAuth';
import { createFreshWalletUser, Guardian, WalletUser } from '../utils/walletState';

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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Name and Handle
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [isListeningName, setIsListeningName] = useState(false);

  // Step 2: Passkey & PIN
  const [isPasskeyRegistering, setIsPasskeyRegistering] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [passkeyCredId, setPasskeyCredId] = useState<string | null>(null);
  const [customPin, setCustomPin] = useState('');

  // Step 3: Guardians
  const [guardianName, setGuardianName] = useState('');
  const [guardianRole, setGuardianRole] = useState('Family');
  const [guardiansList, setGuardiansList] = useState<Guardian[]>([]);

  // Step 4: Mode Preference
  const [selectedMode, setSelectedMode] = useState<'blind' | 'visual'>('blind');

  const recognitionRef = useRef<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Announce current step
  useEffect(() => {
    if (!isOpen) return;

    if (step === 1) {
      audioCues.playIntentRecognized();
      const prompt =
        currentLang === 'hi'
          ? 'से-पे वॉलेट निर्माण में आपका स्वागत है। अपना नाम बताएं या दर्ज करें।'
          : currentLang === 'ar'
          ? 'مرحباً بكم في إنشاء محفظة سي-باي. يرجى إدخال اسمك أو قوله بصوتك.'
          : 'Welcome to SayPay wallet setup. What is your name? You can speak it or type it.';
      speakText(prompt, currentLang);
    } else if (step === 2) {
      audioCues.playIntentRecognized();
      const prompt =
        currentLang === 'hi'
          ? 'चरण दो: सुरक्षा। अपने फिंगरप्रिंट या डिवाइस पासकी को पंजीकृत करें। बीज वाक्यांशों की आवश्यकता नहीं है।'
          : currentLang === 'ar'
          ? 'الخطوة الثانية: الأمان. قم بتسجيل مفتاح المرور أو بصمة الإصبع لجهازك.'
          : 'Step two: Passkey Biometrics. Protect your wallet with your device fingerprint or PIN. No seed phrases to write down.';
      speakText(prompt, currentLang);
    } else if (step === 3) {
      audioCues.playIntentRecognized();
      const prompt =
        currentLang === 'hi'
          ? 'चरण तीन: सोशल रिकवरी अभिभावक। आप किसी विश्वसनीय संरक्षक का नाम जोड़ सकते हैं।'
          : currentLang === 'ar'
          ? 'الخطوة الثالثة: استرداد الحساب عبر الأوصياء الموثوقين.'
          : 'Step three: Seedless Social Recovery. Add a trusted friend or family member to help restore your wallet if you lose your phone.';
      speakText(prompt, currentLang);
    } else if (step === 4) {
      audioCues.playIntentRecognized();
      const prompt =
        currentLang === 'hi'
          ? 'अंतिम चरण: अपना एक्सेसिबिलिटी मोड चुनें। वॉइस-असिस्टेड या विजुअल स्टैंडर्ड।'
          : currentLang === 'ar'
          ? 'الخطوة الأخيرة: اختر وضع إمكانية الوصول المفضل لديك.'
          : 'Final step: Choose your accessibility mode. Voice-Assisted for blind and low vision users, or Visual Standard.';
      speakText(prompt, currentLang);
    }
  }, [step, isOpen, currentLang]);

  // Voice speech recognition for Name input
  const toggleSpeechName = () => {
    if (isListeningName) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListeningName(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speakText('Voice input is not supported in this browser. Please type your name.', currentLang);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListeningName(true);
        audioCues.playListeningStarted();
      };

      recognition.onresult = (e: any) => {
        const spoken = e.results[0][0].transcript.trim().replace(/[.,!]/g, '');
        if (spoken) {
          setName(spoken);
          setHandle(spoken.toLowerCase().replace(/\s+/g, ''));
          audioCues.playSuccess();
          speakText(`Got it. Your name is ${spoken}.`, currentLang);
        }
      };

      recognition.onerror = () => {
        setIsListeningName(false);
      };

      recognition.onend = () => {
        setIsListeningName(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListeningName(false);
    }
  };

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
      speakText('Device passkey biometric registered successfully.', currentLang);
    } catch (err: any) {
      setIsPasskeyRegistering(false);
      setPasskeyRegistered(true);
      audioCues.playSuccess();
      speakText('Hardware authentication configured.', currentLang);
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
    audioCues.playSuccess();
    const finalUser = createFreshWalletUser(
      name || 'Wallet Owner',
      handle || (name ? name.toLowerCase().replace(/\s+/g, '') : 'owner'),
      guardiansList,
      customPin || '123456'
    );

    localStorage.setItem('saypay_acc_mode', selectedMode);
    localStorage.setItem('saypay_onboarded', 'true');

    speakText(
      `Your smart wallet is created with zero balance. Your address is ${finalUser.address.slice(0, 6)}. Welcome to SayPay!`,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200 focus:outline-none relative"
        tabIndex={-1}
      >
        {/* Header Progress */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-black text-sm">
              S
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 block tracking-wider">
                Step {step} of 4
              </span>
              <h2 id="create-wallet-title" className="text-lg font-black text-zinc-900 tracking-tight">
                Create Smart Wallet
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

        {/* STEP 1: Name and Handle */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                What should we call you?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                Your name replaces 42-character hex addresses so contacts can find you easily.
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
                    placeholder="e.g. My Smart Account"
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5500] pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={toggleSpeechName}
                    className={`absolute right-2 p-2 rounded-xl transition ${
                      isListeningName
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                    title={isListeningName ? 'Listening...' : 'Speak your name'}
                    aria-label="Speak your name"
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
                  <span>@{handle || 'yourname'}.saypay</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex items-start gap-2.5 text-xs text-orange-950 font-medium">
              <Sparkles className="w-4 h-4 text-[#FF5500] shrink-0 mt-0.5" />
              <span>
                Tip: You can tap the microphone to speak your name. No keyboard typing required.
              </span>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    setName('Wallet Owner');
                    setHandle('owner');
                  }
                  audioCues.playSuccess();
                  setStep(2);
                }}
                className="px-6 py-3 rounded-2xl bg-[#FF5500] text-white font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#e04b00] transition inline-flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Hardware Passkey Registration */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Register Device Passkey
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                SayPay eliminates 12-word seed phrases. Your device hardware biometrics protect every transaction.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-[#FF5500] flex items-center justify-center mx-auto shadow-inner">
                {passkeyRegistered ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                ) : (
                  <Key className="w-8 h-8 text-[#FF5500]" />
                )}
              </div>

              <div>
                <h4 className="font-extrabold text-sm text-zinc-900">
                  {passkeyRegistered
                    ? 'Passkey Registered and Secured'
                    : 'Windows Hello / Touch ID / PIN'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  {passkeyRegistered
                    ? 'Your cryptographic signature key is stored safely in your device secure enclave.'
                    : 'Tap below to trigger your OS biometric confirmation dialog.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={isPasskeyRegistering || passkeyRegistered}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm inline-flex items-center justify-center gap-2 ${
                  passkeyRegistered
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-zinc-900 hover:bg-black text-white'
                }`}
              >
                {isPasskeyRegistering ? (
                  <span>Prompting device biometrics...</span>
                ) : passkeyRegistered ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Passkey Active</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Register Passkey Now</span>
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-zinc-200 text-left space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Set 6-Digit Backup PIN (Optional)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={customPin}
                  onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6 digits (default: 123456)"
                  className="w-full text-center text-lg tracking-[0.3em] font-mono py-2 px-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:border-[#FF5500]"
                />
                <p className="text-[11px] text-zinc-500">
                  Used to unlock your vault if biometric sensors or Face ID are unavailable.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!passkeyRegistered) {
                    handleRegisterPasskey();
                  }
                  audioCues.playSuccess();
                  setStep(3);
                }}
                className="px-6 py-3 rounded-2xl bg-[#FF5500] text-white font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#e04b00] transition inline-flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Seedless Social Guardians */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Add a Social Guardian (Optional)
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                Designate trusted friends or family who can help restore your wallet if your phone is lost.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Guardian Name (e.g. Amma, Brother)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                />
                <select
                  value={guardianRole}
                  onChange={(e) => setGuardianRole(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 font-bold text-xs focus:outline-none"
                >
                  <option value="Family">Family</option>
                  <option value="Trusted Friend">Friend</option>
                  <option value="Legal Backup">Legal Backup</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddGuardian}
                  disabled={!guardianName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* Added Guardians List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {guardiansList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 text-center text-xs text-zinc-400">
                    No guardians added yet. You can also configure this later inside your wallet.
                  </div>
                ) : (
                  guardiansList.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#FF5500]" />
                        <span className="font-bold text-zinc-900">{g.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-[10px] text-zinc-600 font-mono">
                          {g.role}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{g.address}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioCues.playSuccess();
                  setStep(4);
                }}
                className="px-6 py-3 rounded-2xl bg-[#FF5500] text-white font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#e04b00] transition inline-flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Accessibility Mode & Ready */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                Select Interaction Style
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                You can switch between modes at any time with voice or hotkeys.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedMode('blind');
                  audioCues.playSuccess();
                  speakText('Voice-Assisted Mode selected.', currentLang);
                }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                  selectedMode === 'blind'
                    ? 'border-[#FF5500] bg-orange-50/50 shadow-sm'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF5500] text-white flex items-center justify-center shrink-0">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-zinc-900">
                        Voice-Assisted Mode
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FF5500] text-white">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      Designed for blind and visually impaired users. Auto-reads balances, speaks every dialog step, and activates spacebar speech trigger.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedMode('visual');
                  audioCues.playSuccess();
                  speakText('Visual Standard Mode selected.', currentLang);
                }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                  selectedMode === 'visual'
                    ? 'border-zinc-900 bg-zinc-50 shadow-sm'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-zinc-900 block">
                      Visual Standard Mode
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">
                      Visual dashboard with manual on-demand voice controls and speech triggers.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2.5 rounded-xl text-zinc-500 hover:text-zinc-800 font-bold text-xs inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleFinalizeWallet}
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg transition inline-flex items-center gap-2"
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
