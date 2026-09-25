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
  BookOpen,
  Headphones,
  UserPlus,
  AlertTriangle,
  ArrowLeft,
  Info,
  Settings,
  ChevronDown,
  Layers,
  Coins,
  TrendingUp,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage, detectLanguage } from '../utils/i18n';
import { parseVoiceIntent, ParsedIntentResult } from '../utils/intentParser';
import {
  WalletUser,
  TransactionRecord,
  Contact,
  walletSync,
  SyncEvent,
  getStoredUser,
  saveStoredUser,
  getStoredTransactions,
  saveStoredTransactions,
} from '../utils/walletState';
import { ModeOnboardingModal } from './ModeOnboardingModal';
import { SendModal } from './SendModal';
import { ReceiveModal } from './ReceiveModal';
import { ContactsModal } from './ContactsModal';
import { GuardiansModal } from './GuardiansModal';
import { AccessibilitySettingsModal, AccessibilitySettings } from './AccessibilitySettingsModal';

interface FunctionalWalletPageProps {
  onBackToLanding: () => void;
  initialLang?: SupportedLanguage;
}

export const FunctionalWalletPage: React.FC<FunctionalWalletPageProps> = ({
  onBackToLanding,
  initialLang = 'en',
}) => {
  // 1. User & Wallet Identity (Clean Web3 Multi-Account Selector)
  const [activeUserId, setActiveUserId] = useState<'user_main' | 'user_friend'>('user_main');
  const [userState, setUserState] = useState<WalletUser>(() => getStoredUser('user_main'));
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // 2. Mode & Accessibility Preferences
  const [accessibilityMode, setAccessibilityMode] = useState<'blind' | 'visual'>(() => {
    return (localStorage.getItem('saypay_acc_mode') as 'blind' | 'visual') || 'blind';
  });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('saypay_onboarded') !== 'true';
  });
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);
  const [showBlindRules, setShowBlindRules] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Full Granular Accessibility Settings (W3C WCAG AAA)
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('saypay_acc_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      autoReadAloud: true,
      earconsEnabled: true,
      highContrast: true,
      fontSize: 'large',
      speechRate: 0.95,
      spokenLanguage: initialLang,
      hapticFeedback: true,
      spacebarHotkey: true,
    };
  });

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

  // 5. Persistent Transaction History (Database)
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() =>
    getStoredTransactions('user_main')
  );

  // 6. Incoming Notification Banner
  const [incomingAlert, setIncomingAlert] = useState<{
    show: boolean;
    from: string;
    amount: number;
    txHash: string;
  } | null>(null);

  // 7. Interactive UI micro-states
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<'all' | 'send' | 'receive'>('all');

  // Synchronize active user state from local DB on user switch
  useEffect(() => {
    const loaded = getStoredUser(activeUserId);
    setUserState(loaded);
    const loadedTxs = getStoredTransactions(activeUserId);
    setTransactions(loadedTxs);
  }, [activeUserId]);

  // Persist user and transactions whenever they change
  useEffect(() => {
    saveStoredUser(userState);
  }, [userState]);

  useEffect(() => {
    saveStoredTransactions(activeUserId, transactions);
  }, [activeUserId, transactions]);

  // Save mode preference
  const handleSelectMode = (mode: 'blind' | 'visual') => {
    setAccessibilityMode(mode);
    localStorage.setItem('saypay_acc_mode', mode);
    localStorage.setItem('saypay_onboarded', 'true');
    setShowOnboarding(false);

    if (mode === 'blind') {
      const msg = `Voice-Assisted Mode enabled. Welcome ${userState.name}. Your balance is ${userState.balanceETH.toFixed(
        4
      )} Sepolia ETH. Tap the mic or press Spacebar anytime to speak.`;
      setVoiceFeedback(msg);
      setAriaAnnouncement(msg);
      speakText(msg, lang);
    }
  };

  const handleUpdateSettings = (newSettings: AccessibilitySettings) => {
    setAccessibilitySettings(newSettings);
    localStorage.setItem('saypay_acc_settings', JSON.stringify(newSettings));
    audioCues.setSoundEnabled(newSettings.earconsEnabled);
  };

  // Add Contact Handler
  const handleAddContact = (newContact: Contact) => {
    const updatedContacts = [newContact, ...userState.contacts];
    setUserState((prev) => ({
      ...prev,
      contacts: updatedContacts,
    }));
  };

  // Delete Contact Handler
  const handleDeleteContact = (contactId: string) => {
    const updated = userState.contacts.filter((c) => c.id !== contactId);
    setUserState((prev) => ({
      ...prev,
      contacts: updated,
    }));
  };

  // Real-Time Cross-Device / Cross-Tab Listener
  useEffect(() => {
    const unsubscribe = walletSync.subscribe((event: SyncEvent) => {
      if (event.type === 'PAYMENT_SENT') {
        const isForMe =
          (activeUserId === 'user_friend' && event.fromUser === 'user_main') ||
          (activeUserId === 'user_main' && event.fromUser === 'user_friend');

        if (isForMe) {
          if (accessibilitySettings.earconsEnabled) {
            audioCues.playIncomingPayment();
          }

          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#00E575', '#00C853', '#0F172A', '#38BDF8'],
          });

          // Credit balance directly in database & memory
          setUserState((prev) => {
            const nextBal = prev.balanceETH + event.amount;
            const updatedUser = { ...prev, balanceETH: nextBal };
            saveStoredUser(updatedUser);
            return updatedUser;
          });

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

          setTransactions((prev) => {
            const updated = [newTx, ...prev];
            saveStoredTransactions(activeUserId, updated);
            return updated;
          });

          setIncomingAlert({
            show: true,
            from: event.fromName,
            amount: event.amount,
            txHash: event.txHash,
          });

          const incomingSpeech =
            lang === 'hi'
              ? `आपको ${event.fromName} से ${event.amount} टेस्ट ईथर प्राप्त हुए हैं!`
              : lang === 'ar'
              ? `لقد استلمت ${event.amount} إيثيريوم من ${event.fromName}!`
              : `Incoming payment! You received ${event.amount} test ETH from ${event.fromName}!`;

          setVoiceFeedback(incomingSpeech);
          setAriaAnnouncement(incomingSpeech);
          if (accessibilitySettings.autoReadAloud) {
            speakText(incomingSpeech, lang);
          }

          setTimeout(() => {
            setIncomingAlert(null);
          }, 8000);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeUserId, lang, accessibilitySettings]);

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
          if (accessibilitySettings.earconsEnabled) {
            audioCues.playListeningStarted();
          }
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
  }, [lang, transcript, accessibilitySettings]);

  // Process natural voice commands
  const handleProcessCommand = (spokenText: string) => {
    const result = parseVoiceIntent(spokenText);
    const detected = result.detectedLang;
    if (detected !== lang) {
      setLang(detected);
    }

    switch (result.intent) {
      case 'check_balance': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setSendPreFill({ contact: result.contact, amount: result.amount });
        setIsSendOpen(true);
        break;
      }

      case 'receive': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
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
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        const helpMsg =
          'You can say: Check balance, Send 0.1 ETH to Rahul, Show my QR code, View guardians, Show contacts, or What was my last transaction.';
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
        if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
        const unkMsg = `Understood: "${spokenText}". Say "help" to hear supported voice commands.`;
        setVoiceFeedback(unkMsg);
        speakText(unkMsg, detected);
        break;
      }
    }
  };

  // Keyboard shortcut (Spacebar to hold-and-speak for blind users)
  useEffect(() => {
    if (!accessibilitySettings.spacebarHotkey) return;

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
  }, [isListening, accessibilitySettings.spacebarHotkey]);

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
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current.start(), 100);
        }
      } else {
        simulateSpokenInput('Send 0.1 ETH to Rahul');
      }
    }
  };

  const simulateSpokenInput = (text: string) => {
    setTranscript(text);
    if (accessibilitySettings.earconsEnabled) audioCues.playListeningStarted();
    setVoiceFeedback(`Processing: "${text}"`);
    setTimeout(() => {
      handleProcessCommand(text);
    }, 700);
  };

  // Real Payment Execution (Debits sender DB, broadcasts to recipient DB)
  const handleConfirmSend = (recipient: string, address: string, amount: number) => {
    if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#00E575', '#00C853', '#0F172A', '#38BDF8'],
    });

    const newBalance = Math.max(0, userState.balanceETH - amount);

    // Save updated sender in persistent DB
    const updatedUser: WalletUser = {
      ...userState,
      balanceETH: newBalance,
    };
    setUserState(updatedUser);
    saveStoredUser(updatedUser);

    // If recipient is our friend Rahul, update his stored DB record as well
    if (activeUserId === 'user_main' && recipient.toLowerCase().includes('rahul')) {
      const friendData = getStoredUser('user_friend');
      friendData.balanceETH += amount;
      saveStoredUser(friendData);

      const friendTxs = getStoredTransactions('user_friend');
      const friendRxRecord: TransactionRecord = {
        id: `tx_${Date.now()}_rx`,
        type: 'receive',
        amount,
        currency: 'Sepolia ETH',
        counterparty: userState.name,
        counterpartyAddress: userState.address,
        timestamp: Date.now(),
        status: 'confirmed',
        txHash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      };
      saveStoredTransactions('user_friend', [friendRxRecord, ...friendTxs]);
    }

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

    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    saveStoredTransactions(activeUserId, updatedTxs);

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

    const successSpeech =
      lang === 'hi'
        ? `${recipient} को ${amount} ईथर सफलतापूर्वक भेजे गए।`
        : lang === 'ar'
        ? `تم إرسال ${amount} إيثيريوم بنجاح إلى ${recipient}.`
        : `Successfully sent ${amount} test ETH to ${recipient}. Sepolia block confirmed.`;

    setVoiceFeedback(successSpeech);
    setAriaAnnouncement(successSpeech);
    if (accessibilitySettings.autoReadAloud) {
      speakText(successSpeech, lang);
    }
  };

  // Filter transactions based on active filter tab
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true;
    return tx.type === txFilter;
  });

  const isRTL = lang === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#00E575] selection:text-slate-950 ${
        accessibilitySettings.fontSize === 'extra_large'
          ? 'text-xl'
          : accessibilitySettings.fontSize === 'large'
          ? 'text-lg'
          : 'text-base'
      }`}
    >
      {/* Hidden Live Region for Screen Readers */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* 1. Global Floating Pill Navigation Bar */}
      <div className="sticky top-3 z-40 px-3 sm:px-6">
        <header className="max-w-6xl mx-auto bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl px-4 sm:px-6 py-3 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-3">
            {/* Brand + Network Indicator */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
                title="Return to Landing Page"
              >
                <div className="w-8 h-8 rounded-xl bg-[#00E575] flex items-center justify-center font-black text-slate-950 text-sm shadow-sm group-hover:scale-105 transition">
                  S
                </div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight font-display">
                  SayPay
                </span>
              </button>

              {/* Sepolia Live Badge with Gas Indicator */}
              <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#00E575] animate-ping" />
                <span>Sepolia Testnet</span>
                <span className="text-[10px] text-slate-500 border-l border-slate-300 pl-2 font-mono">12 Gwei</span>
              </div>
            </div>

            {/* Right Controls: Web3 Account Dropdown, Settings, Mode Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-bold text-slate-900 transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-[#00E575]" />
                  <span className="font-display">{userState.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">({userState.address.slice(0, 4)}...{userState.address.slice(-3)})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Switch Testnet Identity
                    </div>
                    <button
                      onClick={() => {
                        audioCues.playSuccess();
                        setActiveUserId('user_main');
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 cursor-pointer ${
                        activeUserId === 'user_main'
                          ? 'bg-[#00E575]/15 text-slate-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#00E575] text-slate-950 flex items-center justify-center text-[10px] font-black">
                          A
                        </div>
                        <div>
                          <div className="font-bold">Alen (Primary Account)</div>
                          <div className="text-[10px] font-mono text-slate-400">0x71C8...4E92</div>
                        </div>
                      </div>
                      {activeUserId === 'user_main' && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>

                    <button
                      onClick={() => {
                        audioCues.playSuccess();
                        setActiveUserId('user_friend');
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 cursor-pointer ${
                        activeUserId === 'user_friend'
                          ? 'bg-[#00E575]/15 text-slate-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                          R
                        </div>
                        <div>
                          <div className="font-bold">Rahul (Simulated Peer)</div>
                          <div className="text-[10px] font-mono text-slate-400">0x3A9F...05d1</div>
                        </div>
                      </div>
                      {activeUserId === 'user_friend' && <Check className="w-4 h-4 text-emerald-600" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Accessibility Settings Trigger */}
              <button
                onClick={() => {
                  audioCues.playIntentRecognized();
                  setIsSettingsOpen(true);
                }}
                className="p-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Accessibility Settings"
                aria-label="Open Accessibility Settings"
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline text-xs font-bold">Settings</span>
              </button>

              {/* Accessibility Mode Switcher */}
              <button
                onClick={() => {
                  const next = accessibilityMode === 'blind' ? 'visual' : 'blind';
                  handleSelectMode(next);
                }}
                className={`p-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  accessibilityMode === 'blind'
                    ? 'border-[#00E575] bg-[#00E575]/15 text-emerald-950 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
                title={accessibilityMode === 'blind' ? 'Voice-Assisted Mode' : 'Visual Standard Mode'}
                aria-label="Toggle Accessibility Mode"
              >
                {accessibilityMode === 'blind' ? (
                  <>
                    <Mic className="w-4 h-4 text-[#00A850]" />
                    <span className="hidden sm:inline font-bold">Voice-Assisted</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-slate-600" />
                    <span className="hidden sm:inline">Visual Mode</span>
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
                className="bg-white border border-slate-200 text-xs font-bold text-slate-800 rounded-2xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                aria-label="Select language"
              >
                <option value="en">EN</option>
                <option value="hi">हिंदी</option>
                <option value="ar">العربية</option>
              </select>
            </div>
          </div>
        </header>
      </div>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Incoming Payment Banner (Live Real-Time Notification) */}
        {incomingAlert && (
          <div className="p-4 rounded-3xl bg-[#00E575] text-slate-950 font-bold shadow-lg border border-emerald-400 flex items-center justify-between animate-bounce-short">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-emerald-600 flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-slate-800">
                  Payment Received
                </div>
                <div className="text-base font-black font-display">
                  +{incomingAlert.amount} ETH from {incomingAlert.from}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Hero Balance + Tokens + Voice (7 Cols on Desktop) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Hero Balance Card */}
            <section
              aria-labelledby="portfolio-heading"
              className="tw-card p-6 sm:p-8 relative overflow-hidden group shadow-sm bg-white"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#00E575] via-emerald-400 to-teal-500" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span id="portfolio-heading" className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-display">
                      Total Balance
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                      Sepolia Testnet
                    </span>
                  </div>

                  {/* Primary Monospace Balance */}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                      {userState.balanceETH.toFixed(4)}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 font-display">ETH</span>
                  </div>

                  {/* Fiat Conversion + 24h PnL badge */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-slate-600">
                      &asymp; ${(userState.balanceETH * userState.ethRateUSD).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      USD
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-xs">
                      <TrendingUp className="w-3 h-3 text-emerald-700" />
                      <span>+$184.20 (+2.24%) Today</span>
                    </span>
                  </div>
                </div>

                {/* Address Pill + Read Aloud Controls */}
                <div className="flex flex-col sm:items-end gap-2.5">
                  <button
                    onClick={() => {
                      audioCues.playSuccess();
                      navigator.clipboard.writeText(userState.address);
                      setCopiedAddress(true);
                      setTimeout(() => setCopiedAddress(false), 2000);
                      const copiedMsg = 'Account address copied.';
                      setVoiceFeedback(copiedMsg);
                      speakText(copiedMsg, lang);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-mono text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                    title="Copy Address"
                  >
                    <span>{userState.address.slice(0, 8)}...{userState.address.slice(-6)}</span>
                    {copiedAddress ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </span>
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      audioCues.playIntentRecognized();
                      const readout = `Your balance is ${userState.balanceETH.toFixed(4)} test Ether, valued at ${(
                        userState.balanceETH * userState.ethRateUSD
                      ).toFixed(2)} dollars.`;
                      setVoiceFeedback(readout);
                      speakText(readout, lang);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#00E575]/15 hover:bg-[#00E575]/25 border border-[#00E575]/30 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-end cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Read Balance</span>
                  </button>
                </div>
              </div>

              {/* 4 Primary Action Squircles */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-100">
                {/* Action 1: Send */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setSendPreFill({});
                    setIsSendOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-[#00E575] cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl btn-lime text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 group-hover:shadow-lg transition">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">Send</span>
                </button>

                {/* Action 2: Receive */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsReceiveOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-slate-300 transition">
                    <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">Receive</span>
                </button>

                {/* Action 3: Contacts */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsContactsOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-slate-300 transition">
                    <Users className="w-6 h-6 text-slate-700" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">Contacts</span>
                </button>

                {/* Action 4: Guardians */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsGuardiansOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50 transition group focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-slate-300 transition">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 font-display">Guardians</span>
                </button>
              </div>
            </section>

            {/* 2. Crypto Assets & Tokens Breakdown */}
            <section
              aria-labelledby="assets-heading"
              className="tw-card p-6 sm:p-7 relative overflow-hidden shadow-sm bg-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <h2 id="assets-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                    Tokens
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+2.45% (24h)</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Token 1: Ethereum (ETH) */}
                <div
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setSendPreFill({});
                    setIsSendOpen(true);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 256 417">
                        <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fillOpacity="0.9" />
                        <path d="M127.962 0L0 212.32l127.962 75.639V0z" fillOpacity="0.7" />
                        <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fillOpacity="0.9" />
                        <path d="M127.962 416.905v-104.72L0 236.585z" fillOpacity="0.7" />
                        <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fillOpacity="0.5" />
                        <path d="M0 212.32l127.96 75.638v-133.8z" fillOpacity="0.3" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 font-display">Ethereum</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                          ETH
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                          Sepolia
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        ${userState.ethRateUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-emerald-600 font-bold ml-1">+2.45%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                        {userState.balanceETH.toFixed(4)} ETH
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        ${(userState.balanceETH * userState.ethRateUSD).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        USD
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Token 2: USDC (USD Coin) */}
                <div
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setSendPreFill({});
                    setIsSendOpen(true);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm group-hover:scale-105 transition">
                      $
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 font-display">USD Coin</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                          USDC
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                          ERC-20
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        $1.00 <span className="text-emerald-600 font-bold ml-1">+0.01%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                        1,250.00 USDC
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        $1,250.00 USD
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Token 3: Wrapped Bitcoin (WBTC) */}
                <div
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setSendPreFill({});
                    setIsSendOpen(true);
                  }}
                  className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70 transition flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-sm font-mono font-black text-sm group-hover:scale-105 transition">
                      B
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900 font-display">Wrapped BTC</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                          WBTC
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold">
                          Sepolia
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        $67,420.00 <span className="text-emerald-600 font-bold ml-1">+4.18%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                        0.0450 WBTC
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        $3,033.90 USD
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Streamlined Voice Control */}
            <section
              aria-labelledby="voice-center-title"
              className="tw-card p-6 text-center shadow-sm bg-white"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-emerald-600" />
                  <h2 id="voice-center-title" className="text-xs font-extrabold uppercase tracking-wider text-slate-700 font-display">
                    Voice Control
                  </h2>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                  <span className="px-1 py-0.2 rounded bg-white border border-slate-300 text-[9px] font-black">SPACE</span>
                  <span>Hold or tap to speak</span>
                </div>
              </div>

              {/* Central Pulsing Microphone Button with Audio Wave Rings */}
              <div className="py-3 relative flex items-center justify-center">
                {/* Animated Equalizer Waveform Bars */}
                <div className="flex items-center gap-1.5 h-10 mr-4">
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-1' : 'h-2 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-2' : 'h-3 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-3' : 'h-4 opacity-30'}`} />
                </div>

                <button
                  onClick={toggleMic}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition shadow-lg relative focus:outline-none focus:ring-4 focus:ring-[#00E575]/50 cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/40 ring-4 ring-rose-300'
                      : 'btn-lime text-slate-950 shadow-[#00E575]/30 hover:scale-105 voice-aura-active'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase mt-0.5">Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase mt-0.5 font-display">Speak</span>
                    </>
                  )}
                </button>

                {/* Right Side Equalizer Bars */}
                <div className="flex items-center gap-1.5 h-10 ml-4">
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-3' : 'h-4 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-2' : 'h-3 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#00E575] ${isListening ? 'wave-1' : 'h-2 opacity-30'}`} />
                </div>
              </div>

              {/* Live Status / Speech Transcript Box */}
              <div className="max-w-md mx-auto mt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 min-h-[48px] flex items-center justify-center">
                  {transcript ? (
                    <span className="text-slate-900 font-bold">&quot;{transcript}&quot;</span>
                  ) : (
                    <span className="text-slate-500">{voiceFeedback}</span>
                  )}
                </div>
              </div>

              {/* 3 Quick Clickable Voice Samples */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Try saying:</span>
                <button
                  onClick={() => simulateSpokenInput('Send 0.1 ETH to Rahul')}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575] hover:text-slate-950 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  &quot;Send 0.1 ETH to Rahul&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Check my balance')}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575] hover:text-slate-950 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  &quot;Check my balance&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Show my QR code')}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#00E575] hover:text-slate-950 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  &quot;Show my QR code&quot;
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Dedicated Contacts Card + Filterable Activity Feed (5 Cols on Desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Dedicated Trusted Contacts Widget */}
            <section
              aria-labelledby="contacts-widget-heading"
              className="tw-card p-6 shadow-sm bg-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h2 id="contacts-widget-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                    Address Book ({userState.contacts.length})
                  </h2>
                </div>
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsContactsOpen(true);
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Contacts Quick List */}
              <div className="space-y-2.5">
                {userState.contacts.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${c.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {c.relationship}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[130px] sm:max-w-[160px]">
                          {c.address}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          audioCues.playIntentRecognized();
                          speakText(`Contact ${c.name}, ${c.relationship}.`, lang);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                      </button>

                      <button
                        onClick={() => {
                          audioCues.playSuccess();
                          setSendPreFill({ contact: c.name });
                          setIsSendOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl btn-lime text-slate-950 text-[11px] font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add contact quick button */}
              <button
                onClick={() => {
                  audioCues.playIntentRecognized();
                  setIsContactsOpen(true);
                }}
                className="w-full mt-3 py-2.5 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 hover:text-slate-900 text-xs font-bold transition flex items-center justify-center gap-1.5 bg-slate-50/50 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Contact</span>
              </button>
            </section>

            {/* Filterable Recent Activity Feed */}
            <section
              aria-labelledby="activity-heading"
              className="tw-card p-6 shadow-sm bg-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <h2 id="activity-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">
                    Recent Activity
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-[#00E575] animate-pulse" />
                  <span>Sepolia Live</span>
                </div>
              </div>

              {/* Interactive Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 mb-3">
                {(['all', 'send', 'receive'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => {
                      audioCues.playIntentRecognized();
                      setTxFilter(filterType);
                    }}
                    className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                      txFilter === filterType
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {filterType === 'all' ? 'All' : filterType === 'send' ? 'Sent' : 'Received'}
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium">
                    No transactions found.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition bg-white space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                              tx.type === 'send'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-[#00E575]/15 text-emerald-800'
                            }`}
                          >
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="w-4 h-4 text-slate-700" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">
                              {tx.type === 'send' ? `Sent to ${tx.counterparty}` : `Received from ${tx.counterparty}`}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                              <span>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>&bull;</span>
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                                <span>Confirmed</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-xs sm:text-sm font-extrabold font-mono ${
                              tx.type === 'send' ? 'text-slate-900' : 'text-emerald-600'
                            }`}
                          >
                            {tx.type === 'send' ? '-' : '+'}
                            {tx.amount.toFixed(4)} ETH
                          </div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            ${(tx.amount * userState.ethRateUSD).toFixed(2)} USD
                          </div>
                        </div>
                      </div>

                      {/* Hash & Etherscan Details row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400">
                        <div className="flex items-center gap-1 truncate max-w-[170px]">
                          <span>Tx:</span>
                          <span className="truncate">{tx.txHash}</span>
                          <button
                            onClick={() => {
                              audioCues.playSuccess();
                              navigator.clipboard.writeText(tx.txHash);
                              setCopiedTxId(tx.id);
                              setTimeout(() => setCopiedTxId(null), 2000);
                              const msg = 'Transaction hash copied.';
                              setVoiceFeedback(msg);
                              speakText(msg, lang);
                            }}
                            className="p-1 hover:text-slate-900 transition cursor-pointer"
                            title="Copy Tx Hash"
                          >
                            {copiedTxId === tx.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <a
                          href={`https://sepolia.etherscan.io/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
                        >
                          <span>Etherscan</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ModeOnboardingModal
        isOpen={showOnboarding}
        currentLang={lang}
        onSelectMode={handleSelectMode}
        onClose={() => setShowOnboarding(false)}
      />

      <AccessibilitySettingsModal
        isOpen={isSettingsOpen}
        settings={accessibilitySettings}
        onUpdateSettings={handleUpdateSettings}
        onClose={() => setIsSettingsOpen(false)}
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
        onAddContact={handleAddContact}
        onDeleteContact={handleDeleteContact}
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
