import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  ArrowDownLeft,
  Users,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Eye,
  Sliders,
  ChevronRight,
  User,
  Radio,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage, detectLanguage } from '../utils/i18n';
import { parseVoiceIntent, ParsedIntentResult } from '../utils/intentParser';
import {
  DEMO_USERS,
  WalletUser,
  TransactionRecord,
  Contact,
  walletSync,
  SyncEvent,
} from '../utils/walletState';
import { ModeOnboardingModal } from './ModeOnboardingModal';
import { SendModal } from './SendModal';
import { ReceiveModal } from './ReceiveModal';
import { ContactsModal } from './ContactsModal';
import { GuardiansModal } from './GuardiansModal';

interface FunctionalWalletPageProps {
  onBackToLanding: () => void;
  initialLang?: SupportedLanguage;
}

export const FunctionalWalletPage: React.FC<FunctionalWalletPageProps> = ({
  onBackToLanding,
  initialLang = 'en',
}) => {
  // 1. User & Wallet Identity (Supports instant switching between "You" and "Friend Rahul")
  const [activeUserId, setActiveUserId] = useState<'user_main' | 'user_friend'>('user_main');
  const [userState, setUserState] = useState<WalletUser>(DEMO_USERS.user_main);

  // 2. Mode & Accessibility Preferences
  const [accessibilityMode, setAccessibilityMode] = useState<'blind' | 'visual'>(() => {
    return (localStorage.getItem('saypay_acc_mode') as 'blind' | 'visual') || 'blind';
  });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('saypay_onboarded') !== 'true';
  });
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // 3. Modals & Dialogs
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isGuardiansOpen, setIsGuardiansOpen] = useState(false);
  const [sendPreFill, setSendPreFill] = useState<{ contact?: string; amount?: number }>({});

  // 4. Voice State & Continuous Navigation
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('Tap Mic or hold Spacebar to speak');
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const recognitionRef = useRef<any>(null);

  // 5. Transaction History
  const [transactions, setTransactions] = useState<TransactionRecord[]>([
    {
      id: 'tx_init_1',
      type: 'receive',
      amount: 2.5,
      currency: 'Sepolia ETH',
      counterparty: 'Sepolia Faucet',
      counterpartyAddress: '0x88f4...912a',
      timestamp: Date.now() - 3600000 * 2,
      status: 'confirmed',
      txHash: '0x3f9a...c812',
    },
    {
      id: 'tx_init_2',
      type: 'send',
      amount: 0.1,
      currency: 'Sepolia ETH',
      counterparty: 'Amma',
      counterpartyAddress: '0x892a...12bc',
      timestamp: Date.now() - 3600000 * 24,
      status: 'confirmed',
      txHash: '0x7b11...90fe',
    },
  ]);

  // 6. Incoming Notification Banner
  const [incomingAlert, setIncomingAlert] = useState<{
    show: boolean;
    from: string;
    amount: number;
    txHash: string;
  } | null>(null);

  // Synchronize active user state
  useEffect(() => {
    setUserState(DEMO_USERS[activeUserId]);
  }, [activeUserId]);

  // Save mode preference
  const handleSelectMode = (mode: 'blind' | 'visual') => {
    setAccessibilityMode(mode);
    localStorage.setItem('saypay_acc_mode', mode);
    localStorage.setItem('saypay_onboarded', 'true');
    setShowOnboarding(false);

    if (mode === 'blind') {
      const msg = `Voice-Assisted Mode enabled. Welcome ${userState.name}. Your balance is ${userState.balanceETH.toFixed(4)} Sepolia ETH. Tap the mic or press Spacebar anytime to speak.`;
      setVoiceFeedback(msg);
      setAriaAnnouncement(msg);
      speakText(msg, lang);
    }
  };

  // Sound sync
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioCues.setSoundEnabled(next);
    if (next) {
      audioCues.playSuccess();
    }
  };

  // Real-Time Cross-Device / Cross-Tab Listener
  useEffect(() => {
    const unsubscribe = walletSync.subscribe((event: SyncEvent) => {
      if (event.type === 'PAYMENT_SENT') {
        // If this payment was sent to me or my alias
        const isForMe =
          (activeUserId === 'user_friend' && event.fromUser === 'user_main') ||
          (activeUserId === 'user_main' && event.fromUser === 'user_friend');

        if (isForMe) {
          // Play loud incoming chime!
          audioCues.playIncomingPayment();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00E575', '#00C853', '#FFFFFF'],
          });

          // Credit balance in real time
          setUserState((prev) => ({
            ...prev,
            balanceETH: prev.balanceETH + event.amount,
          }));

          // Add to transactions
          const newTx: TransactionRecord = {
            id: `tx_${Date.now()}`,
            type: 'receive',
            amount: event.amount,
            currency: 'Sepolia ETH',
            counterparty: event.fromName,
            counterpartyAddress: event.toAddress,
            timestamp: event.timestamp,
            status: 'confirmed',
            txHash: event.txHash,
          };
          setTransactions((prev) => [newTx, ...prev]);

          // Set alert popup
          setIncomingAlert({
            show: true,
            from: event.fromName,
            amount: event.amount,
            txHash: event.txHash,
          });

          // Spoken notification for blind user
          const incomingSpeech =
            lang === 'hi'
              ? `आपको ${event.fromName} से ${event.amount} टेस्ट ईथर प्राप्त हुए हैं!`
              : lang === 'ar'
              ? `لقد استلمت ${event.amount} إيثيريوم من ${event.fromName}!`
              : `Incoming payment! You received ${event.amount} test ETH from ${event.fromName}!`;

          setVoiceFeedback(incomingSpeech);
          setAriaAnnouncement(incomingSpeech);
          speakText(incomingSpeech, lang);

          setTimeout(() => {
            setIncomingAlert(null);
          }, 8000);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeUserId, lang]);

  // Voice Recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'ar' ? 'ar-SA' : 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          audioCues.playListeningStarted();
          setVoiceFeedback('Listening to your voice...');
        };

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };

        recognition.onerror = () => {
          setIsListening(false);
          setVoiceFeedback('Could not hear clearly. Tap mic to retry.');
        };

        recognition.onend = () => {
          setIsListening(false);
          if (transcript.trim()) {
            handleProcessCommand(transcript);
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [lang, transcript]);

  // Process natural voice commands
  const handleProcessCommand = (spokenText: string) => {
    const result = parseVoiceIntent(spokenText);
    const detected = result.detectedLang;
    if (detected !== lang) {
      setLang(detected);
    }

    switch (result.intent) {
      case 'check_balance': {
        audioCues.playIntentRecognized();
        const balSpeech =
          detected === 'hi'
            ? `आपका कुल बैलेंस ${userState.balanceETH.toFixed(4)} टेस्ट ईथर है।`
            : detected === 'ar'
            ? `رصيدك الإجمالي هو ${userState.balanceETH.toFixed(4)} إيثيريوم تجريبي.`
            : `Your total balance is ${userState.balanceETH.toFixed(4)} Sepolia ETH, valued at ${(
                userState.balanceETH * userState.ethRateUSD
              ).toFixed(2)} dollars.`;

        setVoiceFeedback(balSpeech);
        setAriaAnnouncement(balSpeech);
        speakText(balSpeech, detected);
        break;
      }

      case 'send': {
        audioCues.playIntentRecognized();
        setSendPreFill({ contact: result.contact, amount: result.amount });
        setIsSendOpen(true);
        break;
      }

      case 'receive': {
        audioCues.playIntentRecognized();
        setIsReceiveOpen(true);
        const rxSpeech =
          detected === 'hi'
            ? `आपका क्यूआर कोड और सेपोलिया पता स्क्रीन पर तैयार है।`
            : detected === 'ar'
            ? `رمز الاستجابة السريعة وعنوانك جاهزان الآن.`
            : `Your QR code and Sepolia receiving address are ready.`;
        setVoiceFeedback(rxSpeech);
        speakText(rxSpeech, detected);
        break;
      }

      case 'guardians': {
        audioCues.playIntentRecognized();
        setIsGuardiansOpen(true);
        const gSpeech =
          detected === 'hi'
            ? `आपके तीन गार्जियन सक्रिय हैं। अम्मा, राहुल, और विधिक सलाहकार।`
            : detected === 'ar'
            ? `لديك ثلاثة أوصياء نشطين لحماية حسابك.`
            : `You have three active guardians: Amma, Rahul, and Legal Counsel. Two signatures required for recovery.`;
        setVoiceFeedback(gSpeech);
        speakText(gSpeech, detected);
        break;
      }

      case 'contacts': {
        audioCues.playIntentRecognized();
        setIsContactsOpen(true);
        const cSpeech =
          detected === 'hi'
            ? `संपर्क सूची खोली गई है। आप अम्मा, राहुल, या ज़ैद को चुन सकते हैं।`
            : detected === 'ar'
            ? `تم فتح قائمة جهات الاتصال الموثوقة.`
            : `Opening your trusted contacts book.`;
        setVoiceFeedback(cSpeech);
        speakText(cSpeech, detected);
        break;
      }

      case 'history': {
        audioCues.playIntentRecognized();
        const lastTx = transactions[0];
        const hSpeech = lastTx
          ? `Your latest transaction was ${lastTx.type === 'send' ? 'sending' : 'receiving'} ${
              lastTx.amount
            } ETH with ${lastTx.counterparty}. Status confirmed.`
          : 'You have no recent transactions.';
        setVoiceFeedback(hSpeech);
        speakText(hSpeech, detected);
        break;
      }

      case 'cancel': {
        audioCues.playWarning();
        setIsSendOpen(false);
        setIsReceiveOpen(false);
        setIsContactsOpen(false);
        setIsGuardiansOpen(false);
        const cMsg = 'Action cancelled.';
        setVoiceFeedback(cMsg);
        speakText(cMsg, detected);
        break;
      }

      case 'help': {
        audioCues.playIntentRecognized();
        const helpMsg =
          'You can say: Check balance, Send 0.1 ETH to Rahul, Show my QR code, View guardians, or What was my last transaction.';
        setVoiceFeedback(helpMsg);
        speakText(helpMsg, detected);
        break;
      }

      case 'switch_mode': {
        const nextMode = accessibilityMode === 'blind' ? 'visual' : 'blind';
        handleSelectMode(nextMode);
        break;
      }

      default: {
        audioCues.playWarning();
        const unkMsg = `Understood: "${spokenText}". Say "help" to hear supported voice commands.`;
        setVoiceFeedback(unkMsg);
        speakText(unkMsg, detected);
        break;
      }
    }
  };

  // Keyboard shortcut (Spacebar to hold-and-speak for blind users)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) {
        if (!isListening) {
          e.preventDefault();
          toggleMic();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening]);

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      setTranscript('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // If already running, restart
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current.start(), 100);
        }
      } else {
        // Fallback simulation for unsupported browsers
        simulateSpokenInput('Send 0.1 ETH to Rahul');
      }
    }
  };

  // Simulator helper for instant testing
  const simulateSpokenInput = (text: string) => {
    setTranscript(text);
    audioCues.playListeningStarted();
    setVoiceFeedback(`Processing: "${text}"`);
    setTimeout(() => {
      handleProcessCommand(text);
    }, 700);
  };

  // Final execution of send transaction
  const handleConfirmSend = (recipient: string, address: string, amount: number) => {
    audioCues.playSuccess();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00E575', '#00C853', '#FFFFFF'],
    });

    // Debit balance
    setUserState((prev) => ({
      ...prev,
      balanceETH: Math.max(0, prev.balanceETH - amount),
    }));

    // Add local transaction record
    const txHash = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random()
      .toString(16)
      .slice(2, 6)}`;
    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}`,
      type: 'send',
      amount,
      currency: 'Sepolia ETH',
      counterparty: recipient,
      counterpartyAddress: address,
      timestamp: Date.now(),
      status: 'confirmed',
      txHash,
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Broadcast in real-time across tabs/phones!
    walletSync.broadcast({
      type: 'PAYMENT_SENT',
      fromUser: activeUserId,
      fromName: userState.name,
      toContactName: recipient,
      toAddress: address,
      amount,
      txHash,
      timestamp: Date.now(),
    });

    setIsSendOpen(false);

    // Spoken announcement
    const successSpeech =
      lang === 'hi'
        ? `${recipient} को ${amount} ईथर सफलतापूर्वक भेजे गए।`
        : lang === 'ar'
        ? `تم إرسال ${amount} إيثيريوم بنجاح إلى ${recipient}.`
        : `Successfully sent ${amount} test ETH to ${recipient}. Sepolia block confirmed.`;

    setVoiceFeedback(successSpeech);
    setAriaAnnouncement(successSpeech);
    speakText(successSpeech, lang);
  };

  const isRTL = lang === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#00E575] selection:text-slate-950 ${
        accessibilityMode === 'blind' ? 'text-lg' : 'text-base'
      }`}
    >
      {/* Hidden Live Region for Screen Readers */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand + Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 group focus:outline-none"
              title="Return to Landing Page"
            >
              <div className="w-8 h-8 rounded-xl bg-[#00E575] flex items-center justify-center font-black text-slate-950 text-sm shadow-sm group-hover:scale-105 transition">
                S
              </div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">SayPay</span>
            </button>

            {/* Testnet Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-[#00E575] animate-ping" />
              <span>Sepolia Testnet</span>
            </span>
          </div>

          {/* Right Controls: User Switcher, Mode Toggle, Sound */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Dual-User Switcher (Demo Phone-To-Phone) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
              <button
                onClick={() => {
                  audioCues.playSuccess();
                  setActiveUserId('user_main');
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                  activeUserId === 'user_main'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Alen's Wallet"
              >
                <User className="w-3 h-3 text-[#00A850]" />
                <span>You (Alen)</span>
              </button>

              <button
                onClick={() => {
                  audioCues.playSuccess();
                  setActiveUserId('user_friend');
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                  activeUserId === 'user_friend'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Friend Rahul's Wallet"
              >
                <Radio className="w-3 h-3 text-blue-500" />
                <span>Friend (Rahul)</span>
              </button>
            </div>

            {/* Accessibility Mode Switcher */}
            <button
              onClick={() => {
                const next = accessibilityMode === 'blind' ? 'visual' : 'blind';
                handleSelectMode(next);
              }}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                accessibilityMode === 'blind'
                  ? 'border-[#00E575] bg-emerald-50 text-emerald-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              title={accessibilityMode === 'blind' ? 'Voice-Assisted Mode' : 'Visual Standard Mode'}
              aria-label="Toggle Accessibility Mode"
            >
              {accessibilityMode === 'blind' ? (
                <>
                  <Mic className="w-4 h-4 text-[#00A850]" />
                  <span className="hidden md:inline">Voice Mode</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="hidden md:inline">Visual Mode</span>
                </>
              )}
            </button>

            {/* Language Switch */}
            <select
              value={lang}
              onChange={(e) => {
                const newL = e.target.value as SupportedLanguage;
                setLang(newL);
                audioCues.playIntentRecognized();
              }}
              className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-2 py-1.5 focus:outline-none"
              aria-label="Select language"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="ar">العربية</option>
            </select>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
              title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
              aria-label="Toggle Sound"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00A850]" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Incoming Payment Banner (Live Real-Time Notification) */}
        {incomingAlert && (
          <div className="p-4 rounded-3xl bg-emerald-500 text-slate-950 font-bold shadow-xl border-2 border-emerald-400 flex items-center justify-between animate-bounce-short">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6 text-[#00A850]" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-950">
                  Real-Time Payment Received!
                </div>
                <div className="text-base font-black">
                  +{incomingAlert.amount} Sepolia ETH from {incomingAlert.from}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3. Hero Portfolio Card (Trust Wallet Light Aesthetics) */}
        <section
          aria-labelledby="portfolio-heading"
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden group"
        >
          {/* Subtle gradient accent bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00E575] via-emerald-400 to-[#00E575]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span id="portfolio-heading" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Smart Vault Balance
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  +4.2% (24h)
                </span>
              </div>

              {/* Numerical Balance */}
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-950 tracking-tight font-mono">
                  {userState.balanceETH.toFixed(4)}
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#00A850]">ETH</span>
              </div>

              {/* Fiat conversion */}
              <div className="text-sm font-semibold text-slate-500 mt-1">
                &asymp; ${(userState.balanceETH * userState.ethRateUSD).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USD &bull; Sepolia Testnet
              </div>
            </div>

            {/* Address Pill + Read Aloud */}
            <div className="flex flex-col sm:items-end gap-2">
              <button
                onClick={() => {
                  audioCues.playSuccess();
                  navigator.clipboard.writeText(userState.address);
                  const copiedMsg = 'Account address copied.';
                  setVoiceFeedback(copiedMsg);
                  speakText(copiedMsg, lang);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-semibold flex items-center gap-2 transition"
                title="Copy Address"
              >
                <span>{userState.address.slice(0, 6)}...{userState.address.slice(-4)}</span>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  audioCues.playIntentRecognized();
                  const readout = `Your balance is ${userState.balanceETH.toFixed(4)} test Ether, equivalent to ${(
                    userState.balanceETH * userState.ethRateUSD
                  ).toFixed(2)} dollars.`;
                  setVoiceFeedback(readout);
                  speakText(readout, lang);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#00A850] text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-end"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Read Balance Aloud</span>
              </button>
            </div>
          </div>

          {/* 4 Primary Action Squircles (Trust Wallet style) */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-100">
            {/* Action 1: Send */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setSendPreFill({});
                setIsSendOpen(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-[#00E575]"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#00E575] text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">Send</span>
            </button>

            {/* Action 2: Receive */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setIsReceiveOpen(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-[#00E575]"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <ArrowDownLeft className="w-6 h-6 text-[#00A850]" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">Receive</span>
            </button>

            {/* Action 3: Contacts */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setIsContactsOpen(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-[#00E575]"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <Users className="w-6 h-6 text-slate-700" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">Contacts</span>
            </button>

            {/* Action 4: Guardians */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setIsGuardiansOpen(true);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-[#00E575]"
            >
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">Guardians</span>
            </button>
          </div>
        </section>

        {/* 4. Giant Voice Command Center (Core Accessibility Feature) */}
        <section
          aria-labelledby="voice-center-title"
          className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm text-center relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#00A850]" />
            <h2 id="voice-center-title" className="text-xs font-extrabold uppercase tracking-wider text-[#00A850]">
              Continuous Voice Navigation Center
            </h2>
          </div>

          {/* Central Pulsing Microphone Button */}
          <div className="py-2">
            <button
              onClick={toggleMic}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center mx-auto transition shadow-xl relative focus:outline-none focus:ring-4 focus:ring-[#00E575]/50 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/40 ring-4 ring-rose-300'
                  : 'btn-lime text-slate-950 shadow-emerald-500/30 hover:scale-105'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-10 h-10" />
                  <span className="text-[10px] font-black uppercase mt-1">Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10" />
                  <span className="text-[10px] font-black uppercase mt-1">Tap or Space</span>
                </>
              )}
            </button>
          </div>

          {/* Live Status / Speech Transcript Pill */}
          <div className="mt-4 max-w-lg mx-auto">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 min-h-[46px] flex items-center justify-center">
              {transcript ? (
                <span className="text-slate-900 font-bold">&quot;{transcript}&quot;</span>
              ) : (
                <span className="text-slate-500">{voiceFeedback}</span>
              )}
            </div>
          </div>

          {/* Quick Clickable Voice Samples (for fast interactive testing) */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Try saying:</span>
            <button
              onClick={() => simulateSpokenInput('Send 0.1 ETH to Rahul')}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575]/20 hover:text-slate-950 border border-slate-200 text-xs font-medium text-slate-700 transition"
            >
              &quot;Send 0.1 ETH to Rahul&quot;
            </button>
            <button
              onClick={() => simulateSpokenInput('Check my balance')}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575]/20 hover:text-slate-950 border border-slate-200 text-xs font-medium text-slate-700 transition"
            >
              &quot;Check my balance&quot;
            </button>
            <button
              onClick={() => simulateSpokenInput('Show my QR code')}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575]/20 hover:text-slate-950 border border-slate-200 text-xs font-medium text-slate-700 transition"
            >
              &quot;Show my QR code&quot;
            </button>
            <button
              onClick={() => simulateSpokenInput('Who are my guardians')}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575]/20 hover:text-slate-950 border border-slate-200 text-xs font-medium text-slate-700 transition"
            >
              &quot;Who are my guardians&quot;
            </button>
          </div>
        </section>

        {/* 5. Activity & Transaction Feed */}
        <section
          aria-labelledby="activity-heading"
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 id="activity-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Recent On-Chain Activity
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Sepolia Testnet</span>
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition bg-white"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                      tx.type === 'send'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tx.type === 'send' ? (
                      <ArrowUpRight className="w-5 h-5 text-amber-700" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {tx.type === 'send' ? `Sent to ${tx.counterparty}` : `Received from ${tx.counterparty}`}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <span>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-700 font-bold">Confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm sm:text-base font-extrabold font-mono ${
                      tx.type === 'send' ? 'text-slate-900' : 'text-emerald-700'
                    }`}
                  >
                    {tx.type === 'send' ? '-' : '+'}
                    {tx.amount.toFixed(4)} ETH
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate max-w-[100px] sm:max-w-xs">
                    {tx.txHash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Modals */}
      <ModeOnboardingModal
        isOpen={showOnboarding}
        currentLang={lang}
        onSelectMode={handleSelectMode}
        onClose={() => setShowOnboarding(false)}
      />

      <SendModal
        isOpen={isSendOpen}
        contacts={userState.contacts}
        currentLang={lang}
        initialContact={sendPreFill.contact}
        initialAmount={sendPreFill.amount}
        availableBalanceETH={userState.balanceETH}
        ethRateUSD={userState.ethRateUSD}
        onClose={() => setIsSendOpen(false)}
        onConfirmSend={handleConfirmSend}
      />

      <ReceiveModal
        isOpen={isReceiveOpen}
        address={userState.address}
        userName={userState.name}
        currentLang={lang}
        onClose={() => setIsReceiveOpen(false)}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        contacts={userState.contacts}
        currentLang={lang}
        onClose={() => setIsContactsOpen(false)}
        onSelectForSend={(contact) => {
          setIsContactsOpen(false);
          setSendPreFill({ contact: contact.name });
          setIsSendOpen(true);
        }}
      />

      <GuardiansModal
        isOpen={isGuardiansOpen}
        guardians={userState.guardians}
        currentLang={lang}
        onClose={() => setIsGuardiansOpen(false)}
        onAnnounce={(msg) => {
          setAriaAnnouncement(msg);
          setVoiceFeedback(msg);
        }}
      />
    </div>
  );
};
