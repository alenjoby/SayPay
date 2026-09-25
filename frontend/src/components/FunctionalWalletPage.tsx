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
            colors: ['#119da4', '#0c7489', '#d7d9ce'],
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
      colors: ['#119da4', '#0c7489', '#d7d9ce'],
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

  const isRTL = lang === 'ar';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#d7d9ce] text-[#040404] font-sans selection:bg-[#119da4] selection:text-white ${
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

      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[rgba(19,80,91,0.18)] px-4 sm:px-8 py-3.5 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand + Network Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2.5 group focus:outline-none"
              title="Return to Landing Page"
            >
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#119da4] to-[#0c7489] flex items-center justify-center font-black text-white text-sm shadow-md group-hover:scale-105 transition">
                S
              </div>
              <span className="font-extrabold text-lg text-[#040404] tracking-tight font-display">
                SayPay
              </span>
            </button>

            {/* Sepolia Live Badge */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7d9ce]/40 border border-[#13505b]/20 text-[11px] font-mono font-bold text-[#13505b]">
              <span className="w-2 h-2 rounded-full bg-[#119da4] animate-ping" />
              <span>Sepolia Testnet</span>
            </span>
          </div>

          {/* Right Controls: Web3 Account Dropdown, Blind Rules, Settings, Mode Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real Web3 Account Selector (Clean Trust Wallet / MetaMask Style) */}
            <div className="relative">
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="px-3.5 py-1.5 rounded-2xl bg-[#d7d9ce]/30 hover:bg-[#d7d9ce]/60 border border-[rgba(19,80,91,0.2)] text-xs font-bold text-[#040404] transition flex items-center gap-2 shadow-sm"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#119da4]" />
                <span className="font-display">{userState.name}</span>
                <span className="font-mono text-[10px] text-[#13505b]">({userState.address.slice(0, 4)}...{userState.address.slice(-3)})</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#13505b] transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showAccountDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-[rgba(19,80,91,0.2)] p-2 z-50 animate-fade-in">
                  <div className="px-3 py-2 text-[10px] font-bold text-[#13505b] uppercase tracking-wider border-b border-[#d7d9ce]/60">
                    Switch Testnet Identity
                  </div>
                  <button
                    onClick={() => {
                      audioCues.playSuccess();
                      setActiveUserId('user_main');
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 ${
                      activeUserId === 'user_main'
                        ? 'bg-[#119da4]/15 text-[#040404] font-black'
                        : 'hover:bg-[#d7d9ce]/30 text-[#13505b]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#119da4] text-white flex items-center justify-center text-[10px] font-bold">
                        A
                      </div>
                      <div>
                        <div className="font-bold">Alen (Primary Account)</div>
                        <div className="text-[10px] font-mono text-[#13505b]">0x71C8...4E92</div>
                      </div>
                    </div>
                    {activeUserId === 'user_main' && <Check className="w-4 h-4 text-[#119da4]" />}
                  </button>

                  <button
                    onClick={() => {
                      audioCues.playSuccess();
                      setActiveUserId('user_friend');
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 ${
                      activeUserId === 'user_friend'
                        ? 'bg-[#119da4]/15 text-[#040404] font-black'
                        : 'hover:bg-[#d7d9ce]/30 text-[#13505b]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-[#0c7489] text-white flex items-center justify-center text-[10px] font-bold">
                        R
                      </div>
                      <div>
                        <div className="font-bold">Rahul (Simulated Peer)</div>
                        <div className="text-[10px] font-mono text-[#13505b]">0x3A9F...05d1</div>
                      </div>
                    </div>
                    {activeUserId === 'user_friend' && <Check className="w-4 h-4 text-[#119da4]" />}
                  </button>
                </div>
              )}
            </div>

            {/* Blind Mode Rules & Protocols Button */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setShowBlindRules(!showBlindRules);
              }}
              className="px-3 py-1.5 rounded-2xl border border-[rgba(19,80,91,0.2)] bg-white hover:bg-[#d7d9ce]/30 text-[#040404] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              title="Blind Accessibility Protocols"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#119da4]" />
              <span className="hidden md:inline">Blind Protocols</span>
            </button>

            {/* Accessibility Settings Drawer Trigger */}
            <button
              onClick={() => {
                audioCues.playIntentRecognized();
                setIsSettingsOpen(true);
              }}
              className="p-2 rounded-2xl border border-[rgba(19,80,91,0.2)] bg-white hover:bg-[#d7d9ce]/30 text-[#040404] transition flex items-center gap-1.5 shadow-sm"
              title="Accessibility Settings"
              aria-label="Open Accessibility Settings"
            >
              <Settings className="w-4 h-4 text-[#119da4]" />
              <span className="hidden lg:inline text-xs font-bold">Settings</span>
            </button>

            {/* Accessibility Mode Switcher */}
            <button
              onClick={() => {
                const next = accessibilityMode === 'blind' ? 'visual' : 'blind';
                handleSelectMode(next);
              }}
              className={`p-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 ${
                accessibilityMode === 'blind'
                  ? 'border-[#119da4] bg-[#119da4]/15 text-[#040404] shadow-sm'
                  : 'border-[rgba(19,80,91,0.2)] bg-white text-[#13505b] hover:bg-[#d7d9ce]/30'
              }`}
              title={accessibilityMode === 'blind' ? 'Voice-Assisted Mode' : 'Visual Standard Mode'}
              aria-label="Toggle Accessibility Mode"
            >
              {accessibilityMode === 'blind' ? (
                <>
                  <Mic className="w-4 h-4 text-[#119da4]" />
                  <span className="hidden sm:inline font-bold">Voice-Assisted</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-[#13505b]" />
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
              className="bg-white border border-[rgba(19,80,91,0.2)] text-xs font-bold text-[#040404] rounded-2xl px-2.5 py-1.5 focus:outline-none"
              aria-label="Select language"
            >
              <option value="en">EN</option>
              <option value="hi">हिंदी</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. Blind Mode Operating Rules Drawer */}
      {showBlindRules && (
        <section className="bg-[#13505b] text-white border-b border-[#0c7489] px-4 py-5 animate-fade-in shadow-xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#119da4] text-white font-black text-[10px] uppercase">
                  W3C WCAG AAA Standards
                </span>
                <h3 className="text-base font-black font-display">SayPay Blind User Operating Rules</h3>
              </div>
              <p className="text-xs text-[#d7d9ce] max-w-2xl leading-relaxed">
                Blind users navigate 100% through earcon audio chimes, verbal read-backs, and zero hexadecimal verification. Here are the 5 core rules built into this wallet:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="p-3 rounded-xl bg-[#0c7489]/50 border border-[#119da4]/30 text-xs space-y-1">
                <span className="font-extrabold text-[#d7d9ce] block">1. Zero Silent Changes</span>
                <span className="text-white/80 text-[11px] block">
                  Every state change or deposit triggers both an audible chime and speech readout.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c7489]/50 border border-[#119da4]/30 text-xs space-y-1">
                <span className="font-extrabold text-[#d7d9ce] block">2. Spoken Read-Back</span>
                <span className="text-white/80 text-[11px] block">
                  AI reads exact recipient, amount in words, and fees before user authorizes.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c7489]/50 border border-[#119da4]/30 text-xs space-y-1">
                <span className="font-extrabold text-[#d7d9ce] block">3. Human Names Only</span>
                <span className="text-white/80 text-[11px] block">
                  42-character hex addresses are never spoken or required to be typed.
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c7489]/50 border border-[#119da4]/30 text-xs space-y-1">
                <span className="font-extrabold text-[#d7d9ce] block">4. Seedless Recovery</span>
                <span className="text-white/80 text-[11px] block">
                  2-of-3 social guardians replace 12-word seed phrases with 2-minute veto window.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowBlindRules(false)}
              className="text-xs text-[#d7d9ce] hover:text-white shrink-0 font-bold self-end md:self-start"
            >
              ✕ Close
            </button>
          </div>
        </section>
      )}

      {/* 3. Main Full-Width Responsive Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Incoming Payment Banner (Live Real-Time Notification) */}
        {incomingAlert && (
          <div className="p-4 rounded-3xl bg-[#119da4] text-white font-bold shadow-xl border-2 border-white/40 flex items-center justify-between animate-bounce-short">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#119da4] flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6 text-[#119da4]" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-[#d7d9ce]">
                  Real-Time Payment Received!
                </div>
                <div className="text-base font-black font-display">
                  +{incomingAlert.amount} Sepolia ETH from {incomingAlert.from}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-3.5 py-1.5 rounded-xl bg-[#040404] text-white text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 2-Column Responsive Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Portfolio Hero Card + Voice Center (7 Cols on Desktop) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Hero Portfolio Vault Card */}
            <section
              aria-labelledby="portfolio-heading"
              className="tw-card p-6 sm:p-8 relative overflow-hidden group shadow-lg"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#119da4] via-[#0c7489] to-[#13505b]" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span id="portfolio-heading" className="text-xs font-extrabold text-[#13505b] uppercase tracking-wider">
                      Vault Net Worth
                    </span>
                    <span className="text-[11px] font-bold text-[#0c7489] bg-[#119da4]/15 px-2.5 py-0.5 rounded-full border border-[#119da4]/30">
                      Sepolia Testnet
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-[#13505b] bg-[#d7d9ce]/60 px-2 py-0.5 rounded-full">
                      12 Gwei
                    </span>
                  </div>

                  {/* Primary Monospace Balance */}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl sm:text-5xl font-black text-[#040404] tracking-tight font-mono">
                      {userState.balanceETH.toFixed(4)}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-[#119da4] font-display">ETH</span>
                  </div>

                  {/* Fiat Conversion + 24h PnL badge */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-sm font-semibold text-[#13505b]">
                      &asymp; ${(userState.balanceETH * userState.ethRateUSD).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      USD
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
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
                      const copiedMsg = 'Account address copied to clipboard.';
                      setVoiceFeedback(copiedMsg);
                      speakText(copiedMsg, lang);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#d7d9ce]/30 hover:bg-[#d7d9ce]/60 border border-[rgba(19,80,91,0.2)] text-[#040404] font-mono text-xs font-semibold flex items-center gap-2 transition shadow-sm"
                    title="Copy Address"
                  >
                    <span>{userState.address.slice(0, 8)}...{userState.address.slice(-6)}</span>
                    <Copy className="w-3.5 h-3.5 text-[#13505b]" />
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
                    className="px-3.5 py-2 rounded-xl bg-[#119da4]/15 hover:bg-[#119da4]/25 border border-[#119da4]/30 text-[#0c7489] text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-end"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#119da4]" />
                    <span>Read Balance Aloud</span>
                  </button>
                </div>
              </div>

              {/* 4 Primary Action Squircles */}
              <div className="grid grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-[#d7d9ce]/60">
                {/* Action 1: Send */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setSendPreFill({});
                    setIsSendOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[#d7d9ce]/25 transition group focus:outline-none focus:ring-2 focus:ring-[#119da4]"
                >
                  <div className="w-14 h-14 rounded-2xl btn-cyan text-white flex items-center justify-center shadow-md group-hover:scale-105 group-hover:shadow-lg transition">
                    <Send className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#040404] font-display">Send</span>
                </button>

                {/* Action 2: Receive */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsReceiveOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[#d7d9ce]/25 transition group focus:outline-none focus:ring-2 focus:ring-[#119da4]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[rgba(19,80,91,0.2)] text-[#0c7489] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-[#119da4] transition">
                    <ArrowDownLeft className="w-6 h-6 text-[#119da4]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#040404] font-display">Receive</span>
                </button>

                {/* Action 3: Contacts */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsContactsOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[#d7d9ce]/25 transition group focus:outline-none focus:ring-2 focus:ring-[#119da4]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[rgba(19,80,91,0.2)] text-[#13505b] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-[#119da4] transition">
                    <Users className="w-6 h-6 text-[#13505b]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#040404] font-display">Contacts</span>
                </button>

                {/* Action 4: Guardians */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsGuardiansOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-[#d7d9ce]/25 transition group focus:outline-none focus:ring-2 focus:ring-[#119da4]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-[rgba(19,80,91,0.2)] text-[#0c7489] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:border-[#119da4] transition">
                    <ShieldCheck className="w-6 h-6 text-[#119da4]" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#040404] font-display">Guardians</span>
                </button>
              </div>
            </section>

            {/* 2. Crypto Assets & Tokens Breakdown */}
            <section
              aria-labelledby="assets-heading"
              className="tw-card p-6 sm:p-7 relative overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#d7d9ce]/60 mb-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-[#119da4]" />
                  <h2 id="assets-heading" className="text-sm font-extrabold text-[#040404] uppercase tracking-wider font-display">
                    Asset Holdings & Tokens
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0c7489] bg-[#119da4]/10 px-2.5 py-1 rounded-full border border-[#119da4]/20">
                  <TrendingUp className="w-3.5 h-3.5 text-[#119da4]" />
                  <span>+2.45% (24h)</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Token 1: Ethereum (ETH) */}
                <div className="p-3.5 rounded-2xl border border-[rgba(19,80,91,0.12)] hover:border-[#119da4] hover:bg-[#d7d9ce]/15 transition flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#119da4] to-[#13505b] flex items-center justify-center text-white shadow-md">
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
                        <span className="font-extrabold text-sm text-[#040404] font-display">Ethereum</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#119da4]/15 text-[#0c7489] font-mono font-bold">
                          ETH
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d7d9ce]/60 text-[#13505b] font-semibold">
                          Sepolia
                        </span>
                      </div>
                      <div className="text-xs text-[#13505b] font-medium mt-0.5">
                        ${userState.ethRateUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-emerald-700 font-bold ml-1">+2.45%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-[#040404]">
                        {userState.balanceETH.toFixed(4)} ETH
                      </div>
                      <div className="text-xs font-semibold text-[#13505b]">
                        ${(userState.balanceETH * userState.ethRateUSD).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        USD
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border border-[#119da4]/30 hover:bg-[#119da4] hover:text-white text-[#0c7489] text-xs font-bold transition"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Token 2: USDC (USD Coin) */}
                <div className="p-3.5 rounded-2xl border border-[rgba(19,80,91,0.12)] hover:border-[#119da4] hover:bg-[#d7d9ce]/15 transition flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0c7489] to-[#13505b] flex items-center justify-center text-white shadow-md font-bold text-sm">
                      $
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-[#040404] font-display">USD Coin</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#119da4]/15 text-[#0c7489] font-mono font-bold">
                          USDC
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d7d9ce]/60 text-[#13505b] font-semibold">
                          ERC-20
                        </span>
                      </div>
                      <div className="text-xs text-[#13505b] font-medium mt-0.5">
                        $1.00 <span className="text-emerald-700 font-bold ml-1">+0.01%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-[#040404]">
                        1,250.00 USDC
                      </div>
                      <div className="text-xs font-semibold text-[#13505b]">
                        $1,250.00 USD
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border border-[#119da4]/30 hover:bg-[#119da4] hover:text-white text-[#0c7489] text-xs font-bold transition"
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Token 3: Wrapped Bitcoin (WBTC) */}
                <div className="p-3.5 rounded-2xl border border-[rgba(19,80,91,0.12)] hover:border-[#119da4] hover:bg-[#d7d9ce]/15 transition flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#040404] flex items-center justify-center text-amber-400 shadow-md font-mono font-black text-sm">
                      &#8383;
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-[#040404] font-display">Wrapped BTC</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#119da4]/15 text-[#0c7489] font-mono font-bold">
                          WBTC
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#d7d9ce]/60 text-[#13505b] font-semibold">
                          Sepolia
                        </span>
                      </div>
                      <div className="text-xs text-[#13505b] font-medium mt-0.5">
                        $67,420.00 <span className="text-emerald-700 font-bold ml-1">+4.18%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono text-sm sm:text-base font-black text-[#040404]">
                        0.0450 WBTC
                      </div>
                      <div className="text-xs font-semibold text-[#13505b]">
                        $3,033.90 USD
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        audioCues.playIntentRecognized();
                        setSendPreFill({});
                        setIsSendOpen(true);
                      }}
                      className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl border border-[#119da4]/30 hover:bg-[#119da4] hover:text-white text-[#0c7489] text-xs font-bold transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Continuous Voice Command Cockpit */}
            <section
              aria-labelledby="voice-center-title"
              className="tw-card p-6 sm:p-8 text-center relative overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#119da4]" />
                <h2 id="voice-center-title" className="text-xs font-extrabold uppercase tracking-wider text-[#0c7489]">
                  Continuous Voice Command Center
                </h2>
              </div>
              <p className="text-xs text-[#13505b] max-w-md mx-auto mb-4">
                Hands-free speech cockpit with autonomous language routing and earcon auditory confirmation.
              </p>

              {/* Central Pulsing Microphone Button with Audio Wave Rings */}
              <div className="py-4 relative flex items-center justify-center">
                {/* Animated Equalizer Waveform Bars (visible when active) */}
                <div className="flex items-center gap-1.5 h-12 mr-4">
                  <div className={`w-1 rounded-full bg-[#119da4] ${isListening ? 'wave-1' : 'h-2 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#0c7489] ${isListening ? 'wave-2' : 'h-3 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#13505b] ${isListening ? 'wave-3' : 'h-4 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#119da4] ${isListening ? 'wave-4' : 'h-3 opacity-30'}`} />
                </div>

                <button
                  onClick={toggleMic}
                  aria-label={isListening ? 'Stop listening' : 'Start listening'}
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center transition shadow-2xl relative focus:outline-none focus:ring-4 focus:ring-[#119da4]/50 ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/40 ring-4 ring-rose-300'
                      : 'btn-cyan text-white shadow-[#119da4]/30 hover:scale-105 voice-aura-active'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-9 h-9" />
                      <span className="text-[10px] font-black uppercase mt-1">Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-9 h-9" />
                      <span className="text-[10px] font-black uppercase mt-1 font-display">Speak</span>
                    </>
                  )}
                </button>

                {/* Right Side Equalizer Bars */}
                <div className="flex items-center gap-1.5 h-12 ml-4">
                  <div className={`w-1 rounded-full bg-[#119da4] ${isListening ? 'wave-4' : 'h-3 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#13505b] ${isListening ? 'wave-3' : 'h-4 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#0c7489] ${isListening ? 'wave-2' : 'h-3 opacity-30'}`} />
                  <div className={`w-1 rounded-full bg-[#119da4] ${isListening ? 'wave-1' : 'h-2 opacity-30'}`} />
                </div>
              </div>

              {/* Spacebar hotkey badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7d9ce]/40 border border-[#13505b]/20 text-[11px] font-mono font-bold text-[#13505b] mb-3">
                <span className="px-1.5 py-0.5 rounded bg-white border border-[#13505b]/30 text-[10px] font-black">SPACE</span>
                <span>Tap or hold Spacebar anywhere to speak</span>
              </div>

              {/* Live Status / Speech Transcript Pill */}
              <div className="max-w-lg mx-auto">
                <div className="p-4 rounded-2xl bg-[#d7d9ce]/25 border border-[#d7d9ce] text-xs sm:text-sm font-semibold text-[#040404] min-h-[52px] flex items-center justify-center shadow-inner">
                  {transcript ? (
                    <span className="text-[#040404] font-bold">&quot;{transcript}&quot;</span>
                  ) : (
                    <span className="text-[#13505b]">{voiceFeedback}</span>
                  )}
                </div>
              </div>

              {/* Quick Clickable Voice Samples */}
              <div className="mt-5 pt-4 border-t border-[#d7d9ce]/60 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-[#13505b] font-bold">Try saying:</span>
                <button
                  onClick={() => simulateSpokenInput('Send 0.1 ETH to Rahul')}
                  className="px-3 py-1.5 rounded-full bg-[#d7d9ce]/30 hover:bg-[#119da4] hover:text-white border border-[rgba(19,80,91,0.2)] text-xs font-semibold text-[#13505b] transition"
                >
                  &quot;Send 0.1 ETH to Rahul&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Check my balance')}
                  className="px-3 py-1.5 rounded-full bg-[#d7d9ce]/30 hover:bg-[#119da4] hover:text-white border border-[rgba(19,80,91,0.2)] text-xs font-semibold text-[#13505b] transition"
                >
                  &quot;Check my balance&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Show my QR code')}
                  className="px-3 py-1.5 rounded-full bg-[#d7d9ce]/30 hover:bg-[#119da4] hover:text-white border border-[rgba(19,80,91,0.2)] text-xs font-semibold text-[#13505b] transition"
                >
                  &quot;Show my QR code&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Show contacts')}
                  className="px-3 py-1.5 rounded-full bg-[#d7d9ce]/30 hover:bg-[#119da4] hover:text-white border border-[rgba(19,80,91,0.2)] text-xs font-semibold text-[#13505b] transition"
                >
                  &quot;Show contacts&quot;
                </button>
                <button
                  onClick={() => simulateSpokenInput('Who are my guardians')}
                  className="px-3 py-1.5 rounded-full bg-[#d7d9ce]/30 hover:bg-[#119da4] hover:text-white border border-[rgba(19,80,91,0.2)] text-xs font-semibold text-[#13505b] transition"
                >
                  &quot;Who are my guardians&quot;
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Dedicated Contacts Card + Recent Activity Feed (5 Cols on Desktop) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Dedicated Trusted Contacts Widget */}
            <section
              aria-labelledby="contacts-widget-heading"
              className="tw-card p-6 shadow-lg"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#d7d9ce]/60 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#119da4]" />
                  <h2 id="contacts-widget-heading" className="text-sm font-extrabold text-[#040404] uppercase tracking-wider font-display">
                    Address Book ({userState.contacts.length})
                  </h2>
                </div>
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsContactsOpen(true);
                  }}
                  className="text-xs font-bold text-[#0c7489] hover:text-[#119da4] flex items-center gap-1"
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
                    className="p-3 rounded-2xl border border-[rgba(19,80,91,0.12)] hover:border-[#119da4] hover:bg-[#d7d9ce]/20 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${c.avatarBg} text-white flex items-center justify-center font-bold text-xs shadow-sm`}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-[#040404]">{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#d7d9ce]/50 text-[#13505b] font-semibold">
                            {c.relationship}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#13505b]/70 block truncate max-w-[130px] sm:max-w-[160px]">
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
                        className="p-1.5 rounded-lg text-[#13505b] hover:text-[#040404] hover:bg-[#d7d9ce]/40 transition"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#119da4]" />
                      </button>

                      <button
                        onClick={() => {
                          audioCues.playSuccess();
                          setSendPreFill({ contact: c.name });
                          setIsSendOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl btn-teal text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3 text-[#119da4]" />
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
                className="w-full mt-3 py-2.5 rounded-2xl border border-dashed border-[#13505b]/30 hover:border-[#119da4] text-[#13505b] hover:text-[#040404] text-xs font-bold transition flex items-center justify-center gap-1.5 bg-[#d7d9ce]/15"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#119da4]" />
                <span>Add or View All Contacts</span>
              </button>
            </section>

            {/* Recent Activity Feed */}
            <section
              aria-labelledby="activity-heading"
              className="tw-card p-6 shadow-lg"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#d7d9ce]/60 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#13505b]" />
                  <h2 id="activity-heading" className="text-sm font-extrabold text-[#040404] uppercase tracking-wider font-display">
                    Recent Activity
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#13505b]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sepolia Live</span>
                </div>
              </div>

              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl border border-[rgba(19,80,91,0.12)] hover:border-[#119da4]/40 transition bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                            tx.type === 'send'
                              ? 'bg-[#13505b]/10 text-[#13505b]'
                              : 'bg-[#119da4]/15 text-[#0c7489]'
                          }`}
                        >
                          {tx.type === 'send' ? (
                            <ArrowUpRight className="w-4 h-4 text-[#13505b]" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-[#119da4]" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-[#040404]">
                            {tx.type === 'send' ? `Sent to ${tx.counterparty}` : `Received from ${tx.counterparty}`}
                          </div>
                          <div className="text-[11px] font-mono text-[#13505b]/80 flex items-center gap-1.5">
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
                            tx.type === 'send' ? 'text-[#040404]' : 'text-[#0c7489]'
                          }`}
                        >
                          {tx.type === 'send' ? '-' : '+'}
                          {tx.amount.toFixed(4)} ETH
                        </div>
                        <div className="text-[10px] font-semibold text-[#13505b]">
                          ${(tx.amount * userState.ethRateUSD).toFixed(2)} USD
                        </div>
                      </div>
                    </div>

                    {/* Hash & Etherscan Details row */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#d7d9ce]/40 text-[10px] font-mono text-[#13505b]">
                      <div className="flex items-center gap-1 truncate max-w-[170px]">
                        <span>Tx:</span>
                        <span className="truncate">{tx.txHash}</span>
                        <button
                          onClick={() => {
                            audioCues.playSuccess();
                            navigator.clipboard.writeText(tx.txHash);
                            const msg = 'Transaction hash copied.';
                            setVoiceFeedback(msg);
                            speakText(msg, lang);
                          }}
                          className="p-1 hover:text-[#119da4] transition"
                          title="Copy Tx Hash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <a
                        href={`https://sepolia.etherscan.io/`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#0c7489] hover:text-[#119da4] font-semibold"
                      >
                        <span>Etherscan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
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
