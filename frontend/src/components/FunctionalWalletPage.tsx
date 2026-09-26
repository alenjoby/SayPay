import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  EyeOff,
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
  ArrowDownUp,
  Award,
  Plus,
  Lock,
  Unlock,
  Key,
  RotateCcw,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage, detectLanguage, onSpeechStateChange, isCurrentlySpeaking, stopSpeaking } from '../utils/i18n';
import { parseVoiceIntent, ParsedIntentResult } from '../utils/intentParser';
import { understandCommand, sendBlocker, toEth } from '../utils/intentApi';
import { useSayPayVault } from '../chain';
import {
  WalletUser,
  TransactionRecord,
  Contact,
  TokenItem,
  NFTItem,
  TokenApproval,
  MarketTrend,
  MARKET_TRENDS,
  hasUserCreatedWallet,
  setHasUserCreatedWallet,
  walletSync,
  SyncEvent,
  getStoredUser,
  saveStoredUser,
  getStoredTransactions,
  saveStoredTransactions,
} from '../utils/walletState';
import { ModeOnboardingModal } from './ModeOnboardingModal';
import { CreateWalletModal } from './CreateWalletModal';
import { FundWalletModal } from './FundWalletModal';
import { SwapModal } from './SwapModal';
import { SendModal } from './SendModal';
import { ReceiveModal } from './ReceiveModal';
import { ContactsModal, ContactsVoiceAction } from './ContactsModal';
import { GuardiansModal } from './GuardiansModal';
import { AccessibilitySettingsModal, AccessibilitySettings } from './AccessibilitySettingsModal';
import { HeadphoneSafetyModal } from './HeadphoneSafetyModal';
import { VoiceResultCard, VoiceCard } from './VoiceResultCard';
import { headphoneSafety, HeadphoneStatus } from '../utils/headphoneDetector';
import { PasskeySignatureResult, signTransactionWithPasskey } from '../utils/passkeyAuth';
import logoImg from '../../Assets/logo.png';

// ---- Voice language switch ------------------------------------------------
// The recogniser writes a language name in the language it is listening in,
// so each language is listed in English, Arabic and Hindi spellings.
const LANGUAGE_NAMES: Record<SupportedLanguage, string[]> = {
  ar: ['arabic', 'arabi', 'arbi', 'عربي', 'العربي', 'العربية', 'عربية', 'अरबी', 'अरेबिक', 'अरबिक'],
  hi: ['hindi', 'हिंदी', 'हिन्दी', 'هندي', 'الهندي', 'الهندية', 'هندية', 'हिंदी में'],
  en: ['english', 'inglish', 'angrezi', 'انجليزي', 'إنجليزي', 'الانجليزي', 'الإنجليزي', 'الانجليزية', 'الإنجليزية',
       'انجلش', 'إنجلش', 'انقلش', 'इंग्लिश', 'अंग्रेजी', 'अंग्रेज़ी'],
};
const SWITCH_WORDS = ['change', 'switch', 'language', 'speak', 'talk', 'set to', 'use', 'turn', 'mein', 'me baat',
  'badlo', 'bhasha', 'لغة', 'اللغة', 'غير', 'بدل', 'تكلم', 'كلمني', 'भाषा', 'बदलो', 'बदल', 'चेंज', 'स्विच', 'में बात'];
const LANGUAGE_CHANGED: Record<SupportedLanguage, string> = {
  en: 'Language changed to English.',
  ar: 'تم تغيير اللغة إلى العربية.',
  hi: 'भाषा बदलकर हिंदी कर दी गई है।',
};

/** "change to Arabic" -> 'ar'. Null unless it is clearly a language switch (never a payment). */
function languageSwitchTarget(text: string): SupportedLanguage | null {
  const t = ` ${text.toLowerCase().replace(/[.,!?؟।]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (/[0-9٠-٩०-९]/.test(t)) return null; // has an amount: not a language command
  const hits = (Object.keys(LANGUAGE_NAMES) as SupportedLanguage[]).filter((l) =>
    LANGUAGE_NAMES[l].some((w) => t.includes(` ${w} `) || t.includes(` ${w}`) || t.includes(`${w} `))
  );
  if (hits.length !== 1) return null;
  const words = t.trim().split(' ').length;
  const cue = SWITCH_WORDS.some((w) => t.includes(w));
  return cue || words <= 2 ? hits[0] : null;
}

interface FunctionalWalletPageProps {
  onBackToLanding: () => void;
  /** Tell the rest of the site (landing page) about a language change. */
  onLangChange?: (lang: SupportedLanguage) => void;
  initialLang?: SupportedLanguage;
  openCreateWalletDirectly?: boolean;
}

export const FunctionalWalletPage: React.FC<FunctionalWalletPageProps> = ({
  onBackToLanding,
  initialLang = 'en',
  openCreateWalletDirectly = false,
  onLangChange,
}) => {
  // 1. User & Wallet Identity (Clean Web3 Multi-Account Selector)
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    if (hasUserCreatedWallet()) {
      return 'user_created';
    }
    return 'user_main';
  });
  const [userState, setUserState] = useState<WalletUser>(() => {
    if (hasUserCreatedWallet()) {
      return getStoredUser('user_created');
    }
    return getStoredUser('user_main');
  });
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // 2. Mode & Accessibility Preferences
  const [accessibilityMode, setAccessibilityMode] = useState<'blind' | 'visual'>(() => {
    return (localStorage.getItem('saypay_acc_mode') as 'blind' | 'visual') || 'blind';
  });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isCreateWalletOpen, setIsCreateWalletOpen] = useState<boolean>(() => {
    if (openCreateWalletDirectly) return true;
    return !hasUserCreatedWallet() && localStorage.getItem('saypay_onboarded') !== 'true';
  });
  const [isFundOpen, setIsFundOpen] = useState<boolean>(false);
  const [isSwapOpen, setIsSwapOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'nfts' | 'approvals' | 'trending' | 'activity'>('crypto');
  const [lang, setLang] = useState<SupportedLanguage>(initialLang);
  // Once the user picks a language (dropdown or "change to Arabic"), stop
  // auto-switching to whatever language each command seems to be in.
  const langChosenRef = useRef(false);
  const chooseLang = (l: SupportedLanguage) => {
    langChosenRef.current = true;
    setLang(l);
  };
  useEffect(() => {
    onLangChange?.(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const [showBlindRules, setShowBlindRules] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Vault Security / App Lock State
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinAttempts, setPinAttempts] = useState<number>(0);

  const handleCloseCreateWallet = () => {
    setIsCreateWalletOpen(false);
    if (openCreateWalletDirectly) {
      if (onBackToLanding) {
        onBackToLanding();
        return;
      }
    }
    setIsLocked(true);
  };
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState<number>(0);
  const [isAuthenticatingPasskey, setIsAuthenticatingPasskey] = useState<boolean>(false);

  // Custom PIN Setup and Change State
  const [isSettingNewPin, setIsSettingNewPin] = useState<boolean>(false);
  const [newPinCode, setNewPinCode] = useState<string>('');
  const [confirmPinCode, setConfirmPinCode] = useState<string>('');
  const [pinFormError, setPinFormError] = useState<string>('');
  const [pinFormSuccess, setPinFormSuccess] = useState<string>('');

  // Rate Limiting and Brute Force Lockout Timer (SEC-02)
  useEffect(() => {
    if (lockoutTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeRemaining]);

  // Compulsory Earphone Safety State
  const [headphoneStatus, setHeadphoneStatus] = useState<HeadphoneStatus>(() => headphoneSafety.getStatus());
  const [showHeadphoneModal, setShowHeadphoneModal] = useState<boolean>(false);
  const [showEarphoneBanner, setShowEarphoneBanner] = useState<boolean>(() => !headphoneSafety.getStatus().isConnected);
  const [showMobileNavMenu, setShowMobileNavMenu] = useState<boolean>(false);
  const [modalVoiceTrigger, setModalVoiceTrigger] = useState<'confirm' | 'cancel' | 'fingerprint' | null>(null);

  // Stealth Screen Curtain Privacy Shield State (Shoulder-Surfing Immunity)
  const [isPrivacyModeActive, setIsPrivacyModeActive] = useState<boolean>(false);

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
  const [contactPreFill, setContactPreFill] = useState<string | undefined>(undefined);
  const [voiceCard, setVoiceCard] = useState<VoiceCard | null>(null);
  // The open modal <dialog> (topmost), if any: the voice bar is rendered inside it.
  const [voiceBarHost, setVoiceBarHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const open = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
      setVoiceBarHost(open.length ? open[open.length - 1] : null);
    };
    const obs = new MutationObserver(update);
    obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    update();
    return () => obs.disconnect();
  }, []);

  // Auto-hide voice result card after 9 seconds
  useEffect(() => {
    if (!voiceCard) return;
    const t = setTimeout(() => setVoiceCard(null), 9000);
    return () => clearTimeout(t);
  }, [voiceCard]);

  // 4. Voice State & Continuous Navigation
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState('Press Space or tap the mic to speak');
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  // Security events and errors go to the alert region; everything else is polite (spec).
  const [alertAnnouncement, setAlertAnnouncement] = useState('');
  // Typed fallback: every voice action also works by typing (spec).
  const [typedCommand, setTypedCommand] = useState('');
  // Clear, wait ~100 ms, then set, so a repeated message is announced again (spec).
  const announce = (text: string, urgent = false) => {
    const set = urgent ? setAlertAnnouncement : setAriaAnnouncement;
    set('');
    setTimeout(() => set(text), 100);
  };
  const recognitionRef = useRef<any>(null);
  // Latest transcript and command handler, read when recognition ends. The
  // recognition callbacks are created in an effect, so reading state there
  // directly would see an old render (and act on the previous sentence).
  const latestTranscriptRef = useRef('');
  const processCommandRef = useRef<(text: string) => void | Promise<void>>(() => {});

  // ---- Mic controller ------------------------------------------------------
  // One tracked state instead of blind start/stop retries (which failed silently
  // when Chrome was still stopping). 'hold' = Space held: listen until release.
  // 'auto' = tap / hands-free re-listen: Chrome ends by itself after a pause.
  type MicState = 'idle' | 'starting' | 'listening' | 'stopping';
  const micStateRef = useRef<MicState>('idle');
  const micSessionRef = useRef({ done: true, released: false, discard: false });
  const micRestartRef = useRef<'hold' | 'auto' | null>(null);
  const micFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tap Space (or the mic) once: keep listening until it is pressed again.
  const micLatchedRef = useRef(false);

  /** Run what was heard, once per listening session (the fastest of: final result after release, onend, fallback). */
  const finishListening = (session = micSessionRef.current) => {
    if (session.done) return;
    session.done = true;
    micLatchedRef.current = false;
    if (micFallbackTimer.current) clearTimeout(micFallbackTimer.current);
    const heard = latestTranscriptRef.current.trim();
    latestTranscriptRef.current = '';
    if (session.discard || !heard) {
      setIsProcessingVoice(false);
      if (!session.discard) setVoiceFeedback('Press Space or tap the mic to speak');
      return;
    }
    setIsProcessingVoice(true);
    Promise.resolve(processCommandRef.current(heard)).finally(() => setIsProcessingVoice(false));
  };

  const beginListening = (mode: 'hold' | 'auto') => {
    const rec = recognitionRef.current;
    stopSpeaking();
    if (rec && micStateRef.current === 'stopping') {
      // The previous command is still being finished: let it finish, then start again.
      micRestartRef.current = mode;
      return;
    }
    if (rec && mode === 'hold' && micStateRef.current !== 'idle' && !rec.continuous) {
      // Space pressed during a hands-free session, which Chrome would end at the
      // first pause: drop it and restart in hold mode.
      micSessionRef.current.discard = true;
      micRestartRef.current = 'hold';
      micStateRef.current = 'stopping';
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
      return;
    }
    micSessionRef.current = { done: false, released: false, discard: false };
    latestTranscriptRef.current = '';
    setTranscript('');
    if (!rec) {
      setVoiceFeedback('Speech recognition is not available in this browser. Type the command instead.');
      return;
    }
    if (micStateRef.current === 'idle') {
      rec.continuous = mode === 'hold';
      try {
        rec.start();
        micStateRef.current = 'starting';
      } catch {
        micStateRef.current = 'idle';
      }
    }
    // 'starting' / 'listening' in the same mode: already on; this session simply continues.
  };

  /** Space released / mic tapped off: act on the words as soon as they are final. */
  const releaseListening = () => {
    const rec = recognitionRef.current;
    const session = micSessionRef.current;
    if (!rec || session.done) return;
    session.released = true;
    setIsProcessingVoice(true);
    setVoiceFeedback('Processing speech command...');
    if (micStateRef.current === 'starting' || micStateRef.current === 'listening') {
      micStateRef.current = 'stopping';
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    // Chrome can take 1-2 s to report the end; don't make the user wait for it.
    micFallbackTimer.current = setTimeout(() => finishListening(session), 1200);
  };

  /** Cut the mic without running what it heard (e.g. the app itself starts talking). */
  const cancelListening = () => {
    micSessionRef.current.discard = true;
    const rec = recognitionRef.current;
    if (rec && micStateRef.current !== 'idle') {
      micStateRef.current = 'stopping';
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    }
  };

  // 5. Persistent Transaction History (Database)
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() =>
    getStoredTransactions(hasUserCreatedWallet() ? 'user_created' : 'user_main')
  );

  // Synchronize state when switching accounts
  useEffect(() => {
    const u = getStoredUser(activeUserId);
    setUserState(u);
    setTransactions(getStoredTransactions(activeUserId));
  }, [activeUserId]);

  // Dynamic Total USD Calculation
  const totalBalanceUSD = (userState.tokens && userState.tokens.length > 0)
    ? userState.tokens.reduce((acc, tok) => acc + (tok.balance * tok.priceUSD), 0)
    : userState.balanceETH * userState.ethRateUSD;

  // Anti-Silent-Interface Telemetry Engine (Eliminates Silent Screen Rebuilds)
  const [latestInterfaceEvent, setLatestInterfaceEvent] = useState<string>('Wallet ready');
  const notifyInterfaceChange = (
    description: string,
    type: 'tab' | 'modal' | 'balance' | 'tx' | 'status' | 'alert' = 'tab'
  ) => {
    setLatestInterfaceEvent(description);
    if (type === 'balance' || type === 'tx') {
      if (accessibilitySettings.earconsEnabled) audioCues.playIncomingPayment();
    } else if (type === 'alert') {
      if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
    } else {
      if (accessibilitySettings.earconsEnabled) audioCues.playInterfaceTransition();
    }

    const fullMessage = `Interface updated: ${description}`;
    announce(fullMessage, type === 'alert');
    if (accessibilityMode === 'blind') {
      speakText(fullMessage, lang);
    }
  };

  const switchTab = (tab: 'crypto' | 'nfts' | 'approvals' | 'trending' | 'activity') => {
    setActiveTab(tab);
    const descriptions: Record<string, string> = {
      crypto: `Crypto tab: portfolio value is $${totalBalanceUSD.toFixed(2)} USD`,
      nfts: `NFTs tab: ${userState.nfts?.length || 0} badges in collection`,
      approvals: `Approvals tab: ${userState.approvals?.length || 0} active token approvals`,
      trending: 'Trending tab: live crypto market rates',
      activity: `Activity tab: ${transactions.length} transaction records`,
    };
    notifyInterfaceChange(descriptions[tab] || `${tab} tab opened`, 'tab');
  };

  const [contactsVoiceAction, setContactsVoiceAction] = useState<ContactsVoiceAction>(null);

  const openSendModal = (preFill?: { contact?: string; amount?: number }) => {
    setIsSendOpen(true);
    if (preFill) setSendPreFill(preFill);
    notifyInterfaceChange('Send payment window opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt = preFill?.contact
      ? `Send Money opened. Ready to send ${preFill.amount || 0.1} Sepolia ETH to ${preFill.contact}. Say 'Confirm' or 'Fingerprint' to send, or say 'Cancel'.`
      : `Send Money opened. Available balance is ${userState.balanceETH.toFixed(4)} Sepolia ETH. Say an amount and recipient, like 'Send 0.05 ETH to Alice', or say 'Cancel'.`;
    speakAndFollowUp(prompt, lang);
  };
  const closeSendModal = () => {
    setIsSendOpen(false);
    notifyInterfaceChange('Send payment window closed, returned to overview', 'modal');
    speakAndFollowUp('Send window closed. Returned to wallet overview.', lang);
  };

  const openReceiveModal = () => {
    setIsReceiveOpen(true);
    notifyInterfaceChange('Receive window opened with QR code', 'modal');
    audioCues.playIntentRecognized();
    const ending = userState.address.slice(-4).split('').join(' ');
    const prompt = `Receive Money opened. Your public address ends in ${ending}. Say 'Copy address' to copy, or say 'Close'.`;
    speakAndFollowUp(prompt, lang);
  };
  const closeReceiveModal = () => {
    setIsReceiveOpen(false);
    notifyInterfaceChange('Receive window closed, returned to overview', 'modal');
    speakAndFollowUp('Receive window closed. Returned to wallet overview.', lang);
  };

  const openSwapModal = () => {
    setIsSwapOpen(true);
    notifyInterfaceChange('Swap tokens window opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt = 'Token Swap opened. Say an amount to exchange, like "Swap 0.01 ETH for USDC", or say "Close".';
    speakAndFollowUp(prompt, lang);
  };
  const closeSwapModal = () => {
    setIsSwapOpen(false);
    notifyInterfaceChange('Swap window closed, returned to overview', 'modal');
    speakAndFollowUp('Swap window closed. Returned to wallet overview.', lang);
  };

  const openFundModal = () => {
    setIsFundOpen(true);
    notifyInterfaceChange('Fund wallet cash deposit window opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt = 'Deposit Faucet opened. Say "Deposit 0.1 ETH" to add mock testnet cash, or say "Close".';
    speakAndFollowUp(prompt, lang);
  };
  const closeFundModal = () => {
    setIsFundOpen(false);
    notifyInterfaceChange('Fund window closed, returned to overview', 'modal');
    speakAndFollowUp('Deposit window closed. Returned to wallet overview.', lang);
  };

  const openContactsModal = (initialName?: string) => {
    setIsContactsOpen(true);
    if (initialName) setContactPreFill(initialName);
    notifyInterfaceChange('Contacts address book opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt =
      lang === 'hi'
        ? `एड्रेस बुक खुल गई है। आपके पास ${userState.contacts.length} संपर्क हैं। नया संपर्क जोड़ने के लिए 'ऐड कांटेक्ट' कहें, या 'बंद करो' कहें।`
        : lang === 'ar'
        ? `تم فتح دفتر العناوين. لديك ${userState.contacts.length} جهات اتصال. يمكنك قول 'إضافة جهة اتصال'، أو البحث بالاسم، أو قول 'إغلاق'.`
        : `Address Book opened. You have ${userState.contacts.length} saved contacts. You can say 'Add contact', say a name to search, or say 'Close'.`;
    speakAndFollowUp(prompt, lang);
  };
  const closeContactsModal = () => {
    setIsContactsOpen(false);
    setContactPreFill(undefined);
    setContactsVoiceAction(null);
    notifyInterfaceChange('Contacts window closed, returned to overview', 'modal');
    speakAndFollowUp('Address book closed. Returned to wallet overview.', lang);
  };

  const openGuardiansModal = () => {
    setIsGuardiansOpen(true);
    notifyInterfaceChange('Social recovery guardians window opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt = `Social Guardians opened. You have ${userState.guardians.length} guardians configured. Two signatures required for recovery. Say 'Add guardian' or say 'Close'.`;
    speakAndFollowUp(prompt, lang);
  };
  const closeGuardiansModal = () => {
    setIsGuardiansOpen(false);
    notifyInterfaceChange('Guardians window closed, returned to overview', 'modal');
    speakAndFollowUp('Guardians window closed. Returned to wallet overview.', lang);
  };

  const openSettingsModal = () => {
    setIsSettingsOpen(true);
    notifyInterfaceChange('Accessibility settings window opened', 'modal');
    audioCues.playIntentRecognized();
    const prompt = 'Accessibility Settings opened. Say "Faster speech", "Slower speech", or say "Close".';
    speakAndFollowUp(prompt, lang);
  };
  const closeSettingsModal = () => {
    setIsSettingsOpen(false);
    notifyInterfaceChange('Settings window closed, returned to overview', 'modal');
    speakAndFollowUp('Settings window closed. Returned to wallet overview.', lang);
  };

  // 6. Incoming Notification Banner
  const [incomingAlert, setIncomingAlert] = useState<{
    show: boolean;
    from: string;
    amount: number;
    txHash: string;
  } | null>(null);

  // 6b. Reversible Payment Grace Window State (NN/g Heuristic #5: Error Prevention)
  const [pendingUndoTx, setPendingUndoTx] = useState<{
    id: string;
    recipient: string;
    address: string;
    amount: number;
    sigResult?: PasskeySignatureResult;
    countdown: number;
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
      const current = headphoneSafety.getStatus();
      if (!current.isConnected) {
        setShowHeadphoneModal(true);
      }

      const msg = `Voice-Assisted Mode enabled. Welcome ${userState.name}. Your balance is ${userState.balanceETH.toFixed(
        4
      )} ETH. Tap the mic or press Spacebar anytime to speak.`;
      setVoiceFeedback(msg);
      setAriaAnnouncement(msg);
      speakText(msg, lang);
    }
  };

  // Earphone Advisory in Blind Mode (Non-blocking)
  useEffect(() => {
    const unsubStatus = headphoneSafety.onStatusChange((status) => {
      setHeadphoneStatus(status);
      if (status.isConnected) {
        setShowHeadphoneModal(false);
        setShowEarphoneBanner(false);
      }
    });

    const unsubDisconnect = headphoneSafety.onDisconnect(() => {
      if (accessibilityMode === 'blind') {
        setShowEarphoneBanner(true);
        setVoiceFeedback('Privacy advisory: Earphones disconnected.');
        setAriaAnnouncement('Privacy notice: Earphones disconnected.');
      }
    });

    return () => {
      unsubStatus();
      unsubDisconnect();
    };
  }, [accessibilityMode]);

  // Voice Loop Helper: Speaks and automatically listens in Blind Mode
  const startListening = () => beginListening('auto');

  const speakAndFollowUp = (
    msg: string,
    spokenLang: SupportedLanguage = lang,
    shouldPromptListen: boolean = true
  ) => {
    setVoiceFeedback(msg);
    announce(msg);

    speakText(msg, spokenLang, () => {
      if (accessibilityMode === 'blind' && shouldPromptListen) {
        setTimeout(() => {
          if (micStateRef.current === 'idle' && !isCurrentlySpeaking()) {
            startListening();
          }
        }, 250);
      }
    });
  };

  // ---- On-chain wallet (SayPayVault, see src/chain/README.md) -------------
  // If no contract deployment is found, the wallet stays in its simulated mode.

  // Chain messages can arrive milliseconds apart (Pending, Confirmed, Sent):
  // queue them so each one is spoken instead of cutting the previous one off.
  const chainSpeech = useRef<{ queue: string[]; speaking: boolean }>({ queue: [], speaking: false });
  const speakQueued = (text: string) => {
    const q = chainSpeech.current;
    q.queue.push(text);
    if (q.speaking) return;
    const next = () => {
      const t = q.queue.shift();
      if (!t) {
        q.speaking = false;
        return;
      }
      q.speaking = true;
      speakText(t, lang, next);
    };
    next();
  };

  const chain = useSayPayVault({
    lang,
    nameOf: (addr) =>
      userState.contacts.find((c) => c.address.toLowerCase() === addr.toLowerCase())?.name ?? null,
    onAnnounce: (a) => {
      setVoiceFeedback(a.text);
      announce(a.text, a.urgent);
      speakQueued(a.text);
    },
    sounds: accessibilitySettings.earconsEnabled,
  });

  // The main account's balance is the vault's balance on chain.
  useEffect(() => {
    // The on-chain wallet is the main / created account; 'Savings' stays simulated.
    if (!chain.status || activeUserId === 'user_friend') return;
    const onChain = Number(chain.status.balanceEth);
    setUserState((prev) => {
      const ethToken = prev.tokens?.find((t) => t.id === 't_eth');
      if (Math.abs(prev.balanceETH - onChain) < 1e-12 && (!ethToken || Math.abs(ethToken.balance - onChain) < 1e-12)) {
        return prev;
      }
      // The screen shows the ETH row of the token list, so update both.
      return {
        ...prev,
        balanceETH: onChain,
        tokens: prev.tokens?.map((t) => (t.id === 't_eth' ? { ...t, balance: onChain } : t)),
      };
    });
  }, [chain.status?.balanceEth, activeUserId]);

  useEffect(() => {
    if (chain.error) console.info('[SayPay chain] not connected, using the simulated wallet:', chain.error);
  }, [chain.error]);

  /** Fingerprint prompt for an owner action other than a send (ping, recovery). */
  const approveWithPasskey = (action: string) => async () =>
    (await signTransactionWithPasskey(`saypay:${action}:${Date.now()}`, action, 0)).success;

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
    if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
    const msg = `Saved contact ${newContact.name} to your address book.`;
    speakAndFollowUp(msg, lang);
  };

  // Delete Contact Handler
  const handleDeleteContact = (contactId: string) => {
    const target = userState.contacts.find((c) => c.id === contactId);
    const updated = userState.contacts.filter((c) => c.id !== contactId);
    setUserState((prev) => ({
      ...prev,
      contacts: updated,
    }));
    if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
    const msg = target ? `Removed ${target.name} from your contacts.` : 'Removed contact from your contacts.';
    speakAndFollowUp(msg, lang);
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
            colors: ['#FF5500', '#FF7733', '#09090B', '#3B82F6'],
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

  // Voice Recognition setup (Active for both Blind and Visual modes)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'ar' ? 'ar-SA' : 'en-US';

        recognition.onstart = () => {
          micStateRef.current = micStateRef.current === 'stopping' ? 'stopping' : 'listening';
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
          latestTranscriptRef.current = current;
          setTranscript(current);
          // Act on the final words right away instead of waiting for Chrome's slower onend:
          // after Space is released, or in tap / hands-free mode (one sentence per session).
          const last = event.results[event.results.length - 1];
          if (last?.isFinal && (micSessionRef.current.released || !recognition.continuous)) finishListening();
        };

        recognition.onerror = (event: any) => {
          const err = event?.error;
          if (err === 'aborted' || err === 'no-speech') return; // onend follows
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            setVoiceFeedback('Microphone blocked. Allow the microphone, or type the command instead.');
          } else {
            setVoiceFeedback('Could not hear clearly. Press Space or tap the mic to retry.');
          }
        };

        recognition.onend = () => {
          micStateRef.current = 'idle';
          setIsListening(false);
          finishListening();
          const again = micRestartRef.current;
          micRestartRef.current = null;
          if (again) beginListening(again);
        };

        recognitionRef.current = recognition;

        return () => {
          micSessionRef.current.discard = true;
          micStateRef.current = 'idle';
          try {
            recognition.abort();
          } catch (e) {}
        };
      }
    }
  }, [lang, accessibilitySettings]);

  // Half-Duplex Audio Engine (UX-01): Mute speech recognition while TTS is speaking
  useEffect(() => {
    const unsubscribe = onSpeechStateChange((isSpeaking) => {
      // Don't cut a user who is holding Space: their words win over the app's speech.
      if (isSpeaking && micStateRef.current !== 'idle' && !isSpaceHeldRef.current && !micLatchedRef.current) {
        cancelListening();
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Helper: Revoke smart contract approval
  const handleRevokeApproval = (approvalId: string, spenderName: string) => {
    const updatedApprovals = (userState.approvals || []).filter((a) => a.id !== approvalId);
    const updatedUser = { ...userState, approvals: updatedApprovals };
    setUserState(updatedUser);
    saveStoredUser(updatedUser);
    audioCues.playSuccess();
    const msg = `Approval revoked for ${spenderName}. Your tokens are secured.`;
    speakAndFollowUp(msg, lang);
  };

  // Helper: Claim Pioneer Genesis NFT Badge
  const handleClaimNFT = () => {
    const newNFT: NFTItem = {
      id: `nft_${Date.now()}`,
      name: 'SayPay Genesis Pioneer #042',
      collection: 'SayPay Early Access Badges',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
      description: 'Verifiable proof of participation in voice-first accessibility research on Sepolia.',
      audioDescription: 'Geometric orange and black hexagonal hologram badge with engraved audio soundwaves, signifying pioneer access to SayPay voice smart wallet.',
      contractAddress: '0x498a...291b',
      tokenId: '#042',
    };
    const updatedUser = { ...userState, nfts: [newNFT, ...(userState.nfts || [])] };
    setUserState(updatedUser);
    saveStoredUser(updatedUser);
    audioCues.playSuccess();
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    speakAndFollowUp('Claimed SayPay Genesis Pioneer NFT badge. Audio description is available.', lang);
  };

  // Helper: Finalize Wallet Created
  const handleWalletCreated = (newUser: WalletUser, mode: 'blind' | 'visual') => {
    setActiveUserId(newUser.id);
    setUserState(newUser);
    setTransactions([]);
    setAccessibilityMode(mode);
    setIsCreateWalletOpen(false);
    setIsLocked(false);
    audioCues.playSuccess();
    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });

    const welcomeMsg =
      mode === 'blind'
        ? `SayPay wallet created and unlocked! Welcome ${newUser.name}. You are on the Crypto tab. Available tabs are: Crypto, NFTs, Approvals, Trending, and Activity. You also have Send, Receive, Swap, Fund, Contacts, and Guardians. Ask 'What tabs are there?' or say 'Go to Send' anytime.`
        : `SayPay wallet created! Welcome ${newUser.name}.`;
    setVoiceFeedback(welcomeMsg);
    announce(welcomeMsg);
    speakText(welcomeMsg, lang);
    notifyInterfaceChange('Wallet created and unlocked on Crypto tab', 'tab');
  };

  // Stealth Screen Curtain Privacy Shield Handlers
  const enablePrivacyMode = () => {
    setIsPrivacyModeActive(true);
    audioCues.playSuccess();
    const msg =
      lang === 'hi'
        ? 'गोपनीयता मोड सक्रिय किया गया। स्क्रीन पर्दा चालू है और डिस्प्ले पूरी तरह से बंद है।'
        : lang === 'ar'
        ? 'تم تفعيل وضع الخصوصية والستار الأسود لحمايتك من المتطفلين.'
        : 'Privacy Mode activated. Screen curtain is active. Display is completely dark for shoulder-surfing security. Voice control is listening.';
    setVoiceFeedback(msg);
    setAriaAnnouncement(msg);
    speakText(msg, lang);
  };

  const disablePrivacyMode = () => {
    setIsPrivacyModeActive(false);
    audioCues.playSuccess();
    const msg =
      lang === 'hi'
        ? 'गोपनीयता मोड बंद किया गया। स्क्रीन डिस्प्ले वापस सक्रिय है।'
        : lang === 'ar'
        ? 'تم إيقاف وضع الخصوصية واستعادة الشاشة بنجاح.'
        : 'Privacy Mode deactivated. Visual display restored.';
    setVoiceFeedback(msg);
    setAriaAnnouncement(msg);
    speakText(msg, lang);
  };

  // Vault Login Security Handlers (SEC-02 Rate Limiting)
  const handleUnlockWithPasskey = async () => {
    setIsAuthenticatingPasskey(true);
    setPinError('');
    try {
      const authResult = await signTransactionWithPasskey(
        'saypay_vault_login',
        'vault',
        0
      );
      if (authResult.success) {
        setIsLocked(false);
        setPinAttempts(0);
        setLockoutTimeRemaining(0);
        audioCues.playSuccess();
        const welcome =
          accessibilityMode === 'blind'
            ? `Vault unlocked with biometric passkey. Welcome back, ${userState.name}. You are on the Crypto tab. Your portfolio balance is $${totalBalanceUSD.toFixed(2)} USD. Available tabs are: Crypto, NFTs, Approvals, Trending, and Activity. Ask 'What tabs are there?' or say 'Go to Send' anytime.`
            : `Vault unlocked with biometric passkey. Welcome back, ${userState.name}.`;
        setVoiceFeedback(welcome);
        announce(welcome);
        speakText(welcome, lang);
        notifyInterfaceChange('Vault unlocked with biometric passkey on Crypto tab', 'status');
      } else {
        setPinError(authResult.error || 'Passkey authentication cancelled');
        audioCues.playWarning();
      }
    } catch (err: any) {
      setPinError('Passkey authentication cancelled. Use PIN 123456.');
      audioCues.playWarning();
    } finally {
      setIsAuthenticatingPasskey(false);
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinCode.length !== 6) {
      setPinFormError('PIN must be exactly 6 digits.');
      return;
    }
    if (newPinCode !== confirmPinCode) {
      setPinFormError('PINs do not match. Please re-enter.');
      return;
    }
    const updated = { ...userState, pinCode: newPinCode };
    setUserState(updated);
    saveStoredUser(updated);
    audioCues.playSuccess();
    const msg = 'New 6-digit PIN successfully created and saved.';
    setPinFormSuccess(msg);
    setPinFormError('');
    speakText(msg, lang);
    setTimeout(() => {
      setIsSettingNewPin(false);
      setPinInput(newPinCode);
      setNewPinCode('');
      setConfirmPinCode('');
      setPinFormSuccess('');
    }, 1000);
  };

  const handleUnlockWithPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutTimeRemaining > 0) {
      const msg = `Vault temporarily locked. Wait ${lockoutTimeRemaining} seconds or authenticate with biometric passkey.`;
      setPinError(msg);
      speakText(msg, lang);
      return;
    }

    const expectedPin = userState.pinCode || '123456';
    if (pinInput === expectedPin) {
      setIsLocked(false);
      setPinInput('');
      setPinError('');
      setPinAttempts(0);
      setLockoutTimeRemaining(0);
      audioCues.playSuccess();
      const welcome =
        accessibilityMode === 'blind'
          ? `Vault unlocked. Welcome back, ${userState.name}. You are on the Crypto tab. Your portfolio balance is $${totalBalanceUSD.toFixed(2)} USD. Available tabs are: Crypto, NFTs, Approvals, Trending, and Activity. Ask 'What tabs are there?' or say 'Go to Send' anytime.`
          : `Vault unlocked. Welcome back, ${userState.name}.`;
      setVoiceFeedback(welcome);
      announce(welcome);
      speakText(welcome, lang);
      notifyInterfaceChange('Vault unlocked with PIN on Crypto tab', 'status');
    } else {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      audioCues.playWarning();

      if (nextAttempts >= 3) {
        const lockSeconds = nextAttempts >= 5 ? 60 : 30;
        setLockoutTimeRemaining(lockSeconds);
        const lockMsg = `Security lockout: ${nextAttempts} failed attempts. Vault locked for ${lockSeconds} seconds. Use biometric passkey to unlock immediately.`;
        setPinError(lockMsg);
        setAriaAnnouncement(lockMsg);
        speakText(lockMsg, lang);
      } else {
        const remaining = 3 - nextAttempts;
        const errMsg = `Invalid PIN. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before security lockout. Test PIN is 123456.`;
        setPinError(errMsg);
        setAriaAnnouncement(errMsg);
        speakText(errMsg, lang);
      }
    }
  };

  // Process natural voice commands
  const handleProcessCommand = async (spokenText: string) => {
    const lower = spokenText.toLowerCase();

    // "Change to Arabic" / "Hindi mein baat karo" / "غير اللغة للإنجليزي": switch the whole app.
    const newLang = languageSwitchTarget(spokenText);
    if (newLang) {
      chooseLang(newLang);
      if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
      speakAndFollowUp(LANGUAGE_CHANGED[newLang], newLang);
      return;
    }

    // Wallet-safety commands for the contract (each asks for the fingerprint).
    if (chain.vault) {
      const has = (words: string[]) => words.some((w) => lower.includes(w));
      if (has(['cancel recovery', 'stop recovery', 'recovery cancel', 'الغي الاسترجاع', 'وقف الاسترجاع',
               'रिकवरी कैंसल', 'रिकवरी रद्द', 'रिकवरी रोको'])) {
        await chain.cancelRecovery(approveWithPasskey('cancelRecovery'));
        return;
      }
      if (has(['finish recovery', 'complete recovery', 'كمل الاسترجاع', 'اكمل الاسترجاع', 'रिकवरी पूरी'])) {
        await chain.executeRecovery(approveWithPasskey('executeRecovery'));
        return;
      }
      if (has(["i'm here", 'i am here', 'im here', "i'm alive", 'i am alive', 'أنا موجود', 'انا موجود',
               'मैं यहाँ हूँ', 'मैं यहां हूं', 'main yahan hoon', 'mai yaha hu'])) {
        await chain.ping(approveWithPasskey('ping'));
        return;
      }
    }

    // Reversible Payment Cancel / Undo Voice Trigger (UX-04)
    if (
      lower.includes('undo') ||
      lower.includes('cancel payment') ||
      lower.includes('stop payment') ||
      lower.includes('रद्द') ||
      lower.includes('تراجع')
    ) {
      if (pendingUndoTx) {
        handleCancelPendingTx();
        return;
      }
    }

    // Privacy Screen Curtain Voice Commands
    if (
      lower.includes('privacy mode') ||
      lower.includes('curtain mode') ||
      lower.includes('screen curtain') ||
      lower.includes('hide screen') ||
      lower.includes('black screen') ||
      lower.includes('गोपनीयता मोड') ||
      lower.includes('وضع الخصوصية')
    ) {
      if (
        lower.includes('off') ||
        lower.includes('disable') ||
        lower.includes('stop') ||
        lower.includes('exit') ||
        lower.includes('show screen') ||
        lower.includes('restore') ||
        lower.includes('बंद') ||
        lower.includes('إيقاف')
      ) {
        disablePrivacyMode();
      } else {
        enablePrivacyMode();
      }
      return;
    }

    if (lower.includes('show screen') || lower.includes('restore screen') || lower.includes('exit privacy')) {
      disablePrivacyMode();
      return;
    }

    // Querying available tabs, navigation options, or general help
    if (
      lower.includes('what tabs') ||
      lower.includes('all tabs') ||
      lower.includes('which tabs') ||
      lower.includes('list tabs') ||
      lower.includes('show tabs') ||
      lower.includes('what can i do') ||
      lower.includes('where can i go') ||
      lower.includes('what are the options') ||
      lower.includes('what options') ||
      lower.includes('available options') ||
      lower.includes('help me navigate') ||
      lower.includes('navigation options') ||
      lower.includes('menu options') ||
      lower === 'tabs' ||
      lower === 'help' ||
      lower === 'options' ||
      lower.includes('टैब') ||
      lower.includes('विकल्प') ||
      lower.includes('मदद') ||
      lower.includes('تبويب') ||
      lower.includes('خيارات') ||
      lower.includes('قائمة')
    ) {
      if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
      const tabMsg =
        lang === 'hi'
          ? 'से-पे स्मार्ट वॉलेट में पाँच मुख्य टैब हैं: क्रिप्टो, एनएफटी, अप्रूवल, ट्रेंडिंग और एक्टिविटी। साथ ही आप सेंड, रिसीव, स्वैप, फंड, कांटेक्ट्स और गार्डियन विंडो खोल सकते हैं। किसी भी टैब पर जाने के लिए बोलें, जैसे: गो टू सेंड या गो टू एक्टिविटी।'
          : lang === 'ar'
          ? 'تحتوي محفظة سي-باي على خمسة تبويبات رئيسية: العملات المشفرة، والمقتنيات، والموافقات، والأسعار، والنشاط. يمكنك أيضاً فتح نوافذ الإرسال، الاستلام، التبديل، الإيداع، جهات الاتصال، والأوصياء. للانتقال، قل مثلاً: اذهب إلى الإرسال أو افتح النشاط.'
          : 'SayPay smart wallet has five main tabs: Crypto for your balances, NFTs for badges, Approvals for permissions, Trending for market rates, and Activity for your history. You can also open Send, Receive, Swap, Fund, Contacts, or Guardians. Just say: Go to Send, or Open Activity.';
      setVoiceFeedback(tabMsg);
      announce(tabMsg);
      speakAndFollowUp(tabMsg, lang);
      return;
    }

    // Direct voice navigation: Crypto Tab
    if (
      lower.includes('go to crypto') ||
      lower.includes('open crypto') ||
      lower.includes('switch to crypto') ||
      lower.includes('show crypto') ||
      lower.includes('view crypto') ||
      lower.includes('crypto tab') ||
      lower === 'crypto' ||
      lower.includes('क्रिप्टो टैब') ||
      lower.includes('تبويب العملات')
    ) {
      switchTab('crypto');
      const msg = `Switched to Crypto tab. Total portfolio value is $${totalBalanceUSD.toFixed(2)}.`;
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // Direct voice navigation: NFTs Tab
    if (
      lower.includes('go to nft') ||
      lower.includes('open nft') ||
      lower.includes('switch to nft') ||
      lower.includes('show nft') ||
      lower.includes('nft tab') ||
      lower.includes('collectibles') ||
      lower.includes('badges') ||
      lower === 'nfts' ||
      lower.includes('एनएफटी') ||
      lower.includes('المقتنيات')
    ) {
      switchTab('nfts');
      const msg = `Switched to NFTs tab. You have ${userState.nfts?.length || 0} collectible badges.`;
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // Direct voice navigation: Approvals Tab
    if (
      lower.includes('go to approval') ||
      lower.includes('open approval') ||
      lower.includes('switch to approval') ||
      lower.includes('show approval') ||
      lower.includes('approval tab') ||
      lower.includes('permissions') ||
      lower.includes('security check') ||
      lower === 'approvals' ||
      lower.includes('अनुमति') ||
      lower.includes('الموافقات')
    ) {
      switchTab('approvals');
      const msg = `Switched to Approvals tab. Showing ${userState.approvals?.length || 0} active token permissions.`;
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // Direct voice navigation: Trending Tab
    if (
      lower.includes('go to trend') ||
      lower.includes('open trend') ||
      lower.includes('switch to trend') ||
      lower.includes('show trend') ||
      lower.includes('trend tab') ||
      lower.includes('market rates') ||
      lower.includes('crypto prices') ||
      lower === 'trending' ||
      lower.includes('ट्रेंडिंग') ||
      lower.includes('الأسعار')
    ) {
      switchTab('trending');
      const msg = 'Switched to Trending tab. Bitcoin is at $88,450, Ethereum is at $2,693.';
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // Direct voice navigation: Activity / History Tab
    if (
      lower.includes('go to activity') ||
      lower.includes('open activity') ||
      lower.includes('switch to activity') ||
      lower.includes('show activity') ||
      lower.includes('activity tab') ||
      lower.includes('go to history') ||
      lower.includes('open history') ||
      lower.includes('show history') ||
      lower.includes('view transactions') ||
      lower === 'activity' ||
      lower === 'history' ||
      lower.includes('एक्टिविटी') ||
      lower.includes('हिस्ट्री') ||
      lower.includes('النشاط') ||
      lower.includes('السجل')
    ) {
      switchTab('activity');
      const msg = `Switched to Activity tab. Showing ${transactions.length} transactions.`;
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // Modal navigation: Send
    if (
      lower.includes('open send') ||
      lower.includes('go to send') ||
      lower.includes('send window') ||
      lower.includes('transfer window') ||
      lower.includes('भेजने की विंडो') ||
      lower.includes('نافذة الإرسال')
    ) {
      setIsSendOpen(true);
      notifyInterfaceChange('Send payment window opened', 'modal');
      const msg = 'Opened Send payment window. Tell me the amount and recipient, or say Close.';
      setVoiceFeedback(msg);
      speakAndFollowUp(msg, lang);
      return;
    }

    // ----------------------------------------------------
    // IN-MODAL SPECIFIC VOICE COMMANDS
    // ----------------------------------------------------
    if (isContactsOpen) {
      if (
        lower.includes('add contact') ||
        lower.includes('new contact') ||
        lower.includes('create contact') ||
        lower.includes('नया संपर्क') ||
        lower.includes('إضافة جهة اتصال')
      ) {
        setContactsVoiceAction({ type: 'open_add' });
        speakAndFollowUp("Add Contact form opened. Speak the contact's name, or say 'Save contact'.", lang);
        return;
      }

      if (
        lower.startsWith('name is ') ||
        lower.startsWith('name ') ||
        lower.startsWith('contact name ') ||
        lower.startsWith('call them ') ||
        lower.startsWith('save this as ') ||
        (lower.startsWith('add ') && !lower.includes('guardian') && !lower.includes('cash') && !lower.includes('fund'))
      ) {
        const rawName = spokenText
          .replace(/^(name is|name|contact name|call them|save this as|add)\s+/i, '')
          .replace(/[.,!?]/g, '')
          .trim();
        if (rawName && !rawName.toLowerCase().includes('contact')) {
          setContactsVoiceAction({ type: 'set_name', value: rawName });
          speakAndFollowUp(`Contact name set to ${rawName}. Say 'Save contact' to save.`, lang);
          return;
        }
      }

      if (
        lower === 'save' ||
        lower === 'save contact' ||
        lower === 'save this' ||
        lower.includes('सेव') ||
        lower.includes('حفظ')
      ) {
        setContactsVoiceAction({ type: 'save' });
        return;
      }

      if (lower.startsWith('search ') || lower.startsWith('find ')) {
        const query = spokenText.replace(/^(search|find)\s+/i, '').replace(/[.,!?]/g, '').trim();
        setContactsVoiceAction({ type: 'search', value: query });
        speakAndFollowUp(`Searching contacts for ${query}.`, lang);
        return;
      }

      if (lower.includes('clear search') || lower.includes('show all')) {
        setContactsVoiceAction({ type: 'search', value: '' });
        speakAndFollowUp('Search cleared. Showing all contacts.', lang);
        return;
      }
    }

    if (isReceiveOpen) {
      if (lower.includes('copy') || lower.includes('copy address') || lower.includes('कॉपी') || lower.includes('نسخ')) {
        navigator.clipboard.writeText(userState.address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
        audioCues.playSuccess();
        speakAndFollowUp('Wallet address copied to clipboard.', lang);
        return;
      }
    }

    if (isSendOpen) {
      if (
        lower === 'confirm' ||
        lower === 'send now' ||
        lower === 'fingerprint' ||
        lower === 'approve' ||
        lower.includes('कन्फर्म') ||
        lower.includes('تأكيد')
      ) {
        setModalVoiceTrigger('fingerprint');
        setTimeout(() => setModalVoiceTrigger(null), 1500);
        return;
      }
    }

    // Modal navigation: Send
    if (
      lower.includes('open send') ||
      lower.includes('go to send') ||
      lower.includes('send window') ||
      lower.includes('transfer window') ||
      lower.includes('भेजने की विंडो') ||
      lower.includes('نافذة الإرسال')
    ) {
      openSendModal();
      return;
    }

    // Modal navigation: Receive
    if (
      lower.includes('open receive') ||
      lower.includes('go to receive') ||
      lower.includes('receive window') ||
      lower.includes('show qr') ||
      lower.includes('qr code') ||
      lower.includes('my address') ||
      lower.includes('पाने की विंडो') ||
      lower.includes('نافذة الاستلام')
    ) {
      openReceiveModal();
      return;
    }

    // Modal navigation: Swap
    if (
      lower.includes('open swap') ||
      lower.includes('go to swap') ||
      lower.includes('swap window') ||
      lower.includes('exchange window')
    ) {
      openSwapModal();
      return;
    }

    // Modal navigation: Fund / Deposit
    if (
      lower.includes('open fund') ||
      lower.includes('go to fund') ||
      lower.includes('fund window') ||
      lower.includes('deposit window') ||
      lower.includes('add cash window') ||
      lower.includes('faucet')
    ) {
      openFundModal();
      return;
    }

    // Modal navigation: Contacts
    if (
      lower.includes('open contact') ||
      lower.includes('go to contact') ||
      lower.includes('show contact') ||
      lower.includes('address book') ||
      lower.includes('contact list') ||
      lower.includes('संपर्क') ||
      lower.includes('جهات الاتصال')
    ) {
      openContactsModal();
      return;
    }

    // Modal navigation: Guardians
    if (
      lower.includes('open guardian') ||
      lower.includes('go to guardian') ||
      lower.includes('social recovery window') ||
      lower.includes('guardian window') ||
      lower.includes('गार्डियन') ||
      lower.includes('الأوصياء')
    ) {
      openGuardiansModal();
      return;
    }

    // Modal navigation: Settings
    if (
      lower.includes('open setting') ||
      lower.includes('go to setting') ||
      lower.includes('accessibility setting') ||
      lower.includes('सेटिंग') ||
      lower.includes('الإعدادات')
    ) {
      openSettingsModal();
      return;
    }

    // Close any open modal
    if (
      lower.includes('close window') ||
      lower.includes('close dialog') ||
      lower.includes('exit window') ||
      lower === 'close' ||
      lower === 'exit' ||
      lower === 'back' ||
      (lower === 'done' && !isContactsOpen) ||
      lower.includes('विंडो बंद करो') ||
      lower.includes('إغلاق النافذة')
    ) {
      if (isSendOpen || isReceiveOpen || isSwapOpen || isFundOpen || isContactsOpen || isGuardiansOpen || isSettingsOpen) {
        setIsSendOpen(false);
        setIsReceiveOpen(false);
        setIsSwapOpen(false);
        setIsFundOpen(false);
        setIsContactsOpen(false);
        setIsGuardiansOpen(false);
        setIsSettingsOpen(false);
        setContactPreFill(undefined);
        setContactsVoiceAction(null);
        notifyInterfaceChange('Window closed. Returned to wallet overview.', 'modal');
        const msg = 'Window closed. Returned to wallet overview.';
        setVoiceFeedback(msg);
        speakAndFollowUp(msg, lang);
        return;
      }
    }

    // SayPay intent model for money commands (local keyword parser as fallback).
    const result = await understandCommand(
      spokenText,
      userState.contacts.map((c) => c.name),
      langChosenRef.current ? lang : undefined
    );
    // After the user chose a language, answer in it whatever language they spoke.
    const detected = langChosenRef.current ? lang : result.detectedLang;
    if (detected !== lang && !langChosenRef.current) {
      setLang(detected);
    }

    const blockedSend = result.intent === 'send' ? sendBlocker(result, userState.balanceETH, userState.ethRateUSD) : null;
    let fallbackReply = '';
    if (result.intent === 'check_balance') {
      fallbackReply =
        detected === 'hi'
          ? `आपका कुल पोर्टफोलियो मूल्य $${totalBalanceUSD.toFixed(2)} डॉलर है, जिसमें ${userState.balanceETH.toFixed(4)} टेस्ट ईथर शामिल हैं।`
          : detected === 'ar'
          ? `إجمالي قيمة محفظتك هو ${totalBalanceUSD.toFixed(2)} دولار، بما في ذلك ${userState.balanceETH.toFixed(4)} إيثيريوم تجريبي.`
          : `Your total portfolio value is $${totalBalanceUSD.toFixed(2)} USD, with ${userState.balanceETH.toFixed(4)} Sepolia ETH.`;
    } else if (result.intent === 'history') {
      const lastTx = transactions[0];
      fallbackReply = lastTx
        ? `Your latest transaction was ${lastTx.type === 'send' ? 'sending' : 'receiving'} ${lastTx.amount} ETH with ${lastTx.counterparty}.`
        : 'You have no recent transactions.';
    }

    setVoiceCard({
      heard: spokenText,
      intent: result.model?.intent ?? result.intent,
      confidence: result.confidence,
      reply: blockedSend ?? result.readback ?? fallbackReply,
      status:
        result.source !== 'model' ? 'fallback'
        : result.needsClarification ? 'ask'
        : blockedSend ? 'blocked'
        : 'ok',
      lang: detected,
    });

    // The model wants to ask first (not sure, or the amount / person is missing):
    // speak its question and do nothing else.
    if (result.source === 'model' && result.needsClarification && result.readback) {
      if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
      speakAndFollowUp(result.readback, detected);
      return;
    }

    switch (result.intent) {
      case 'check_balance': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        const balSpeech =
          detected === 'hi'
            ? `आपका कुल पोर्टफोलियो मूल्य $${totalBalanceUSD.toFixed(2)} डॉलर है, जिसमें ${userState.balanceETH.toFixed(4)} टेस्ट ईथर शामिल हैं। आप आगे क्या करना चाहते हैं?`
            : detected === 'ar'
            ? `إجمالي قيمة محفظتك هو ${totalBalanceUSD.toFixed(2)} دولار، بما في ذلك ${userState.balanceETH.toFixed(4)} إيثيريوم تجريبي. ماذا تود أن تفعل؟`
            : `Your total portfolio value is $${totalBalanceUSD.toFixed(2)} USD, with ${userState.balanceETH.toFixed(4)} Sepolia ETH. What would you like to do next? Say Send, Receive, Swap, or Fund.`;

        speakAndFollowUp(balSpeech, detected);
        break;
      }

      case 'send': {
        if (blockedSend) {
          if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
          speakAndFollowUp(blockedSend, detected);
          // Prefill in ETH (never "50 dirhams" as 50 ETH); an unknown currency leaves it empty.
          setSendPreFill({ contact: result.contact || '', amount: toEth(result.amount, result.unit, userState.ethRateUSD)?.eth });
          setIsSendOpen(true);
          break;
        }

        // Money said in another currency (dollars, dirhams, riyals, rupees...) becomes ETH at the demo rate.
        // (sendBlocker above already stopped units that can't be converted.)
        const converted = toEth(result.amount, result.unit, userState.ethRateUSD);
        const calculatedAmount = converted?.eth ?? result.amount;
        const conversionInfo = converted?.from && result.amount
          ? ` (${result.amount} ${converted.from} converted to ${calculatedAmount} ETH)`
          : '';

        // Strict balance checks
        if (userState.balanceETH <= 0) {
          if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
          const zeroMsg =
            detected === 'hi'
              ? 'आपके वॉलेट में 0 ईथर शेष है। भेजने से पहले फंड जोड़ें।'
              : detected === 'ar'
              ? 'رصيدك الحالي 0 إيثيريوم. يرجى شحن المحفظة أولاً.'
              : 'Cannot send. Your balance is 0 Sepolia ETH. Please fund your wallet first.';
          speakAndFollowUp(zeroMsg, detected);
          setVoiceCard({
            heard: spokenText,
            intent: 'send',
            confidence: result.confidence,
            reply: zeroMsg,
            status: 'blocked',
            lang: detected,
          });
          setSendPreFill({ contact: result.contact || '', amount: calculatedAmount || 0.01 });
          setIsSendOpen(true);
          break;
        }

        if (calculatedAmount !== undefined && calculatedAmount !== null && calculatedAmount > userState.balanceETH) {
          if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
          const insMsg =
            detected === 'hi'
              ? `अपर्याप्त बैलेंस। आप ${calculatedAmount} ईथर नहीं भेज सकते क्योंकि आपका बैलेंस सिर्फ़ ${userState.balanceETH.toFixed(4)} ईथर है।`
              : detected === 'ar'
              ? `الرصيد غير كافٍ. لا يمكنك إرسال ${calculatedAmount} إيثيريوم، رصيدك هو ${userState.balanceETH.toFixed(4)} إيثيريوم.`
              : `Insufficient balance. Cannot send ${calculatedAmount} ETH because your balance is only ${userState.balanceETH.toFixed(4)} ETH.`;
          speakAndFollowUp(insMsg, detected);
          setVoiceCard({
            heard: spokenText,
            intent: 'send',
            confidence: result.confidence,
            reply: insMsg,
            status: 'blocked',
            lang: detected,
          });
          setSendPreFill({ contact: result.contact || '', amount: calculatedAmount });
          setIsSendOpen(true);
          break;
        }

        // Contact matching: check if target contact exists
        const targetContactName = result.contact;
        if (!targetContactName) {
          if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
          const askRecipientMsg =
            detected === 'hi'
              ? 'आप किसे पैसे भेजना चाहते हैं? कृपया संपर्क का नाम बताएं।'
              : detected === 'ar'
              ? 'إلى من تريد إرسال المبلغ؟ يرجى تحديد جهة الاتصال من دفتر العनाوين.'
              : 'Who would you like to send this to? Please specify a contact name from your address book.';
          speakAndFollowUp(askRecipientMsg, detected);
          setVoiceCard({
            heard: spokenText,
            intent: 'send',
            confidence: result.confidence,
            reply: askRecipientMsg,
            status: 'ask',
            lang: detected,
          });
          setSendPreFill({ amount: calculatedAmount });
          setIsSendOpen(true);
          break;
        }

        const matchedContact = userState.contacts.find((c) => c.name.toLowerCase() === targetContactName.toLowerCase());
        if (!matchedContact) {
          // Open Send Modal prefilled with target name so user sees it right on screen
          if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
          setSendPreFill({ contact: targetContactName, amount: calculatedAmount || 0.01 });
          setIsSendOpen(true);
          const notFoundMsg =
            detected === 'hi'
              ? `${targetContactName} आपकी संपर्क सूची में नहीं है। कृपया उनका पता दर्ज करें।`
              : detected === 'ar'
              ? `${targetContactName} ليس في قائمة جهات الاتصال الخاصة بك. يرجى إدخال عنوانه.`
              : `Preparing transfer to ${targetContactName}${conversionInfo}. Note: ${targetContactName} is not saved in your contacts. Please paste their 0x address or select from contacts.`;
          speakAndFollowUp(notFoundMsg, detected);
          setVoiceCard({
            heard: spokenText,
            intent: 'send',
            confidence: result.confidence,
            reply: notFoundMsg,
            status: 'ask',
            lang: detected,
          });
          break;
        }

        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setSendPreFill({ contact: matchedContact.name, amount: calculatedAmount });
        setIsSendOpen(true);

        const sendSpeech =
          detected === 'hi'
            ? `${matchedContact.name} को ${calculatedAmount || 0.1} ईथर भेजने की तैयारी है${conversionInfo}। गैस फीस प्रायोजित है। हस्ताक्षर करने के लिए "फिंगरप्रिंट" बोलें, या रद्द करने के लिए "रद्द" कहें।`
            : detected === 'ar'
            ? `جاهز لإرسال ${calculatedAmount || 0.1} إيثيريوم إلى ${matchedContact.name}${conversionInfo}. قل "بصمة" للتوقيع بمفتاح المرور، أو قل "إلغاء".`
            : `Prepared transfer: Sending ${calculatedAmount || 0.1} Sepolia ETH to ${matchedContact.name}${conversionInfo}. Gas is sponsored. Say "Fingerprint" or "Confirm" to sign with your passkey, or say "Cancel".`;

        speakAndFollowUp(sendSpeech, detected);
        break;
      }

      case 'passkey_sign':
      case 'confirm': {
        if (isSendOpen) {
          if (accessibilitySettings.earconsEnabled) audioCues.playListeningStarted();
          setModalVoiceTrigger('fingerprint');
          setTimeout(() => setModalVoiceTrigger(null), 1500);
        } else {
          speakAndFollowUp('No transaction is pending signature. Say "Send 0.1 ETH to Priya" to start a payment.', detected);
        }
        break;
      }

      case 'earphones_connected': {
        headphoneSafety.confirmEarphonesConnected(true);
        setShowHeadphoneModal(false);
        if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
        const epMsg =
          detected === 'hi'
            ? 'ईयरफ़ोन सत्यापित और सक्रिय हैं। निजी ऑडियो वॉलेट अनलॉक हो गया है। मैं आपकी क्या मदद कर सकता हूँ?'
            : detected === 'ar'
            ? 'تم التحقق من توصيل سماعات الأذن بنجاح. تم فتح المحفظة الصوتية الخاصة.'
            : 'Earphones verified and active. Private audio vault unlocked. How can I assist you?';
        speakAndFollowUp(epMsg, detected);
        break;
      }

      case 'copy_address': {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(userState.address);
        }
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 3000);
        if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
        const copyMsg =
          detected === 'hi'
            ? `आपका वॉलेट पता क्लिपबोर्ड पर कॉपी कर लिया गया है।`
            : detected === 'ar'
            ? `تم نسخ عنوان محفظتك إلى الحافظة بنجاح.`
            : `Your wallet address ending in ${userState.address.slice(-4).split('').join(' ')} has been copied to your clipboard.`;
        speakAndFollowUp(copyMsg, detected);
        break;
      }

      case 'receive': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setIsReceiveOpen(true);
        const rxSpeech =
          detected === 'hi'
            ? `प्राप्त करने की स्क्रीन तैयार है। आपका पता है 0x71C8 समाप्त 4E92 पर। पता कॉपी करने के लिए कहें "कॉपी करें"।`
            : detected === 'ar'
            ? `شاشة الاستلام جاهزة. عنوانك ينتهي بـ 4E92. قل "نسخ" لنسخ العنوان.`
            : `Your receiving QR code and address are ready. Your address ends in ${userState.address.slice(-4).split('').join(' ')}. Say "Copy address" to copy, or say "Cancel" to close.`;
        speakAndFollowUp(rxSpeech, detected);
        break;
      }

      case 'fund': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setIsFundOpen(true);
        const fundSpeech =
          detected === 'hi'
            ? 'फंड विंडो खोली गई है। टेस्टनेट ईथर जोड़ने के लिए "डिपॉज़िट" चुनें।'
            : detected === 'ar'
            ? 'تم فتح نافذة شحن الرصيد. اختر إيداع لإضافة إيثيريوم تجريبي.'
            : 'Opening deposit window. You can deposit mock testnet ETH into your wallet.';
        speakAndFollowUp(fundSpeech, detected);
        break;
      }

      case 'swap': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setIsSwapOpen(true);
        const swapSpeech =
          detected === 'hi'
            ? 'टोकन स्वैप विंडो खोली गई है। आप ईथर को यूएसडीसी में बदल सकते हैं।'
            : detected === 'ar'
            ? 'تم فتح نافذة تبديل العملات. يمكنك مبادلة الإيثيريوم بـ USDC.'
            : 'Opening swap window. You can exchange Sepolia ETH for USDC.';
        speakAndFollowUp(swapSpeech, detected);
        break;
      }

      case 'guardians': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setIsGuardiansOpen(true);
        const gNames = userState.guardians.map((g) => g.name).join(', ');
        const gSpeech =
          detected === 'hi'
            ? `आपके सक्रिय गार्जियन हैं: ${gNames}। रिकवरी के लिए दो हस्ताक्षर आवश्यक हैं।`
            : detected === 'ar'
            ? `الأوصياء النشطون هم: ${gNames}. يلزم توقيعان للاسترداد.`
            : `Opening guardians. You have three active guardians: ${gNames}. Two signatures are required for recovery. Say "Cancel" to return.`;
        speakAndFollowUp(gSpeech, detected);
        break;
      }

      case 'contacts': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        if (result.source === 'model' && result.model?.intent === 'add_contact') {
          setContactPreFill(result.model.name ?? undefined);
          setIsContactsOpen(true);
          speakAndFollowUp(result.readback || 'Who should I save? Say their name.', detected);
          break;
        }
        setContactPreFill(undefined);
        setIsContactsOpen(true);
        const names = userState.contacts.map((c) => c.name).join(', ');
        const cSpeech =
          detected === 'hi'
            ? `संपर्क सूची खोली गई है। आपके पास ${userState.contacts.length} संपर्क हैं: ${names}। किसी को भेजने के लिए कहें "भेजो"।`
            : detected === 'ar'
            ? `تم فتح جهات الاتصال. لديك ${userState.contacts.length} جهات اتصال: ${names}.`
            : `Opening contacts. You have ${userState.contacts.length} saved contacts: ${names}. Say "Send to [name]" to transfer funds.`;
        speakAndFollowUp(cSpeech, detected);
        break;
      }

      case 'settings': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setIsSettingsOpen(true);
        speakAndFollowUp('Opening accessibility settings. You can adjust speech rate, auditory earcons, and contrast.', detected);
        break;
      }

      case 'history': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setActiveTab('activity'); // show the list that is being read out
        const lastTx = transactions[0];
        const hSpeech = lastTx
          ? `Your latest transaction was ${lastTx.type === 'send' ? 'sending' : 'receiving'} ${
              lastTx.amount
            } ETH with ${lastTx.counterparty}. Status confirmed.`
          : 'You have no recent transactions.';
        speakAndFollowUp(hSpeech, detected);
        break;
      }

      case 'cancel': {
        if (pendingUndoTx) {
          handleCancelPendingTx();
          break;
        }
        if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
        setIsSendOpen(false);
        setIsReceiveOpen(false);
        setIsContactsOpen(false);
        setIsGuardiansOpen(false);
        setIsSettingsOpen(false);
        setModalVoiceTrigger('cancel');
        speakAndFollowUp('Action cancelled. Returned to main wallet dashboard.', detected);
        break;
      }

      case 'help': {
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        const helpMsg =
          'You can say: Check balance, Send 0.1 ETH to Priya, Fingerprint to sign, Privacy mode, Copy address, Show QR code, Show contacts, View guardians, or Earphones connected.';
        speakAndFollowUp(helpMsg, detected);
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
        speakAndFollowUp(unkMsg, detected);
        break;
      }
    }
  };

  // Spacebar Push-To-Talk: Hold Spacebar to record, release to stop and submit
  const isSpaceHeldRef = useRef(false);
  const spaceDownAtRef = useRef(0);
  const TAP_MS = 350; // shorter than this = a tap (toggle); longer = hold to talk

  const toggleMic = () => {
    // Tap to start, tap again to send: listens as long as needed in between.
    if (micLatchedRef.current || micStateRef.current !== 'idle') {
      micLatchedRef.current = false;
      releaseListening();
      return;
    }
    beginListening('hold');
    micLatchedRef.current = true;
    setVoiceFeedback('Listening. Tap the mic again when you are done.');
  };

  useEffect(() => {
    if (!accessibilitySettings.spacebarHotkey) return;

    const isInteractiveElement = (target: HTMLElement | null): boolean => {
      if (!target) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.ctrlKey || e.altKey || e.metaKey) return;
      if (isInteractiveElement(e.target as HTMLElement | null)) return; // typing a space
      e.preventDefault(); // never "click" a focused button with Space
      if (e.repeat || isSpaceHeldRef.current) return; // held down: keep listening
      isSpaceHeldRef.current = true;
      if (micLatchedRef.current) {
        // Second tap: stop and run the command (the keyup that follows does nothing).
        micLatchedRef.current = false;
        spaceDownAtRef.current = -1;
        if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
        setTimeout(releaseListening, 200);
        return;
      }
      spaceDownAtRef.current = Date.now();
      setIsProcessingVoice(false);
      beginListening('hold');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !isSpaceHeldRef.current) return;
      // Release is handled wherever focus is now, so the mic can't get stuck on.
      e.preventDefault();
      isSpaceHeldRef.current = false;
      if (spaceDownAtRef.current === -1) return; // this was the second tap: already stopping
      if (Date.now() - spaceDownAtRef.current < TAP_MS) {
        // Quick tap: keep listening until Space is pressed again.
        micLatchedRef.current = true;
        setVoiceFeedback('Listening. Press Space again when you are done.');
        return;
      }
      if (accessibilitySettings.earconsEnabled) audioCues.playIntentRecognized();
      // A short grace period so the last word isn't clipped, then stop.
      setTimeout(releaseListening, 200);
    };

    // Window lost focus while Space was held (Alt+Tab): don't leave the mic on.
    const handleBlur = () => {
      if (!isSpaceHeldRef.current) return;
      isSpaceHeldRef.current = false;
      releaseListening();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [accessibilitySettings.spacebarHotkey, accessibilitySettings.earconsEnabled]);

  processCommandRef.current = handleProcessCommand;

  const simulateSpokenInput = (text: string) => {
    setTranscript(text);
    if (accessibilitySettings.earconsEnabled) audioCues.playListeningStarted();
    setVoiceFeedback(`Processing: "${text}"`);
    setTimeout(() => {
      handleProcessCommand(text);
    }, 200);
  };

  // 5-second Grace Window countdown for reversible payments (NN/g Heuristic #5: Error Prevention)
  useEffect(() => {
    if (!pendingUndoTx) return;

    const timer = setInterval(() => {
      setPendingUndoTx((current) => {
        if (!current) return null;
        if (current.countdown <= 1) {
          finalizeSend(current);
          return null;
        }
        return { ...current, countdown: current.countdown - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingUndoTx?.id, activeUserId, lang, userState.name, userState.address, accessibilitySettings.earconsEnabled]);

  /**
   * Send through the contract. The fingerprint was already given in the Send
   * popup, so it unlocks the device key. The hook announces "Pending",
   * "Confirmed" and "Sent … to Amma" (or why it failed) with their sounds.
   */
  const chainSentIds = useRef(new Set<string>());
  const finalizeSendOnChain = async (pending: {
    id: string;
    recipient: string;
    address: string;
    amount: number;
    sigResult?: PasskeySignatureResult;
  }) => {
    // finalizeSend can run twice for one payment (React dev mode re-runs the
    // countdown's state updater); a second on-chain send would be a real duplicate.
    if (chainSentIds.current.has(pending.id)) return;
    chainSentIds.current.add(pending.id);
    const { recipient, address, amount, sigResult } = pending;
    const hash = await chain.send(address, amount, async () => !!sigResult?.success);
    if (!hash) return;
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 }, colors: ['#FF5500', '#FF7733', '#09090B', '#3B82F6'] });
    const newTx: TransactionRecord = {
      id: `tx_${Date.now()}`,
      type: 'send',
      amount,
      currency: 'Sepolia ETH',
      counterparty: recipient,
      counterpartyAddress: address,
      timestamp: Date.now(),
      status: 'confirmed',
      txHash: hash,
      note: `On-chain via SayPayVault (${sigResult?.method || 'passkey'})`,
    };
    setTransactions((prev) => {
      const updated = [newTx, ...prev];
      saveStoredTransactions(activeUserId, updated);
      return updated;
    });
  };

  const finalizeSend = (pending: {
    id: string;
    recipient: string;
    address: string;
    amount: number;
    sigResult?: PasskeySignatureResult;
  }) => {
    const { recipient, address, amount, sigResult } = pending;

    // Strict balance guard
    if (amount <= 0 || amount > userState.balanceETH || userState.balanceETH <= 0) {
      if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
      const cancelSpeech = 'Transfer cancelled: Insufficient balance in wallet.';
      setVoiceFeedback(cancelSpeech);
      setAriaAnnouncement(cancelSpeech);
      speakAndFollowUp(cancelSpeech, lang);
      return;
    }

    // Real transaction on the SayPayVault contract (main account, contract deployed).
    if (chain.vault && activeUserId !== 'user_friend') {
      void finalizeSendOnChain(pending);
      return;
    }

    if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#FF5500', '#FF7733', '#09090B', '#3B82F6'],
    });

    setUserState((prev) => {
      const newBalance = Math.max(0, Number((prev.balanceETH - amount).toFixed(6)));
      const updatedUser: WalletUser = {
        ...prev,
        balanceETH: newBalance,
      };
      saveStoredUser(updatedUser);
      return updatedUser;
    });

    const txHash =
      sigResult?.signatureHex?.slice(0, 18) ||
      `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`;

    // If recipient is our secondary savings account or Priya, update stored record as well
    if (activeUserId === 'user_main' && (recipient.toLowerCase().includes('savings') || recipient.toLowerCase().includes('priya'))) {
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
        txHash,
        note: `Passkey Biometrics Verified (${sigResult?.method || 'WebAuthn Hardware'})`,
      };
      saveStoredTransactions('user_friend', [friendRxRecord, ...friendTxs]);
    }

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
      note: `Hardware Biometrics Approved (${sigResult?.method || 'WebAuthn Passkey'})`,
    };

    setTransactions((prev) => {
      const updatedTxs = [newTx, ...prev];
      saveStoredTransactions(activeUserId, updatedTxs);
      return updatedTxs;
    });

    // Broadcast in real-time across tabs/phones
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

    const successSpeech =
      lang === 'hi'
        ? `सफलतापूर्वक भेजा गया! ${recipient} को ${amount} ईथर का भुगतान आपके पासकी द्वारा हस्ताक्षरित और सेपोलिया पर पुष्टि कर दिया गया है।`
        : lang === 'ar'
        ? `تم بنجاح! تم توقيع وإرسال ${amount} إيثيريوم إلى ${recipient} باستخدام مفتاح المرور وتأكيد الكتلة.`
        : `Transaction confirmed and broadcast! ${amount} Sepolia ETH sent to ${recipient}. Signed with your hardware passkey on smart contract.`;

    speakAndFollowUp(successSpeech, lang);
  };

  const handleCancelPendingTx = () => {
    if (!pendingUndoTx) return;
    setPendingUndoTx(null);
    if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
    const cancelSpeech =
      lang === 'hi'
        ? 'भुगतान रद्द कर दिया गया। आपके खाते से कोई राशि नहीं काटी गई।'
        : lang === 'ar'
        ? 'تم إلغاء العملية بنجاح ولم يتم خصم أي رصيد.'
        : 'Payment cancelled. Zero funds were debited from your vault.';
    setVoiceFeedback(cancelSpeech);
    setAriaAnnouncement(cancelSpeech);
    speakAndFollowUp(cancelSpeech, lang);
  };

  // Reversible Payment Staging (NN/g Heuristic #5: Error Prevention)
  const handleConfirmSend = (
    recipient: string,
    address: string,
    amount: number,
    sigResult?: PasskeySignatureResult
  ) => {
    if (amount <= 0 || amount > userState.balanceETH || userState.balanceETH <= 0) {
      if (accessibilitySettings.earconsEnabled) audioCues.playWarning();
      const err = `Cannot send. Insufficient balance: you have ${userState.balanceETH.toFixed(4)} ETH.`;
      setVoiceFeedback(err);
      setAriaAnnouncement(err);
      speakAndFollowUp(err, lang);
      return;
    }

    setIsSendOpen(false);
    if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();

    const pending = {
      id: `pending_${Date.now()}`,
      recipient,
      address,
      amount,
      sigResult,
      countdown: 5,
    };
    setPendingUndoTx(pending);

    const graceSpeech =
      lang === 'hi'
        ? `${recipient} को ${amount} ईथर भेजने की तैयारी है। आपके पास रद्द करने के लिए 5 सेकंड हैं। "रद्द" कहें या अनडू बटन दबाएं।`
        : lang === 'ar'
        ? `تمت جدولة إرسال ${amount} إيثيريوم إلى ${recipient}. لديك 5 ثوانٍ للإلغاء. قل "إلغاء" أو اضغط على تراجع.`
        : `Payment of ${amount} Sepolia ETH scheduled to ${recipient}. 5 seconds to undo. Say "Cancel" or tap Undo.`;

    setVoiceFeedback(graceSpeech);
    setAriaAnnouncement(graceSpeech);
    speakAndFollowUp(graceSpeech, lang);
  };

  // Filter transactions based on active filter tab
  const filteredTransactions = transactions.filter((tx) => {
    if (txFilter === 'all') return true;
    return tx.type === txFilter;
  });

  const isRTL = lang === 'ar';

  // Vault Security / App Lock Gate (Unified Normal Light Theme)
  if (isLocked && !isCreateWalletOpen) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col justify-between font-sans selection:bg-[#FF5500] selection:text-white"
      >
        {/* Top Header */}
        <header className="p-4 sm:p-6 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            <div className="h-4 w-px bg-zinc-200" />
            <img src={logoImg} alt="SayPay" className="h-6 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-[11px] font-mono text-zinc-600 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
            <span>Sepolia Vault Protected</span>
          </div>
        </header>

        {/* Central Lock Box */}
        <main className="max-w-md mx-auto w-full px-4 py-8">
          <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            {/* Glowing Lock Ring */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-[#FF5500]/15 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shadow-sm">
                <Lock className="w-8 h-8 text-[#FF5500]" />
              </div>
            </div>

            <div>
              <div className="flex justify-center mb-2">
                <img src={logoImg} alt="SayPay" className="h-8 w-auto object-contain" />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Hardware passkey and biometric security gate
              </p>
            </div>

            {/* Active User Account Badge */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {userState.name.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900">{userState.name}</div>
                  <div className="text-[10px] font-mono text-zinc-500">
                    {userState.address.slice(0, 6)}...{userState.address.slice(-4)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                className="text-[10px] font-bold text-[#FF5500] hover:underline cursor-pointer"
              >
                Switch
              </button>
            </div>

            {/* Account dropdown if opened on lock screen */}
            {showAccountDropdown && (
              <div className="text-left bg-white rounded-2xl border border-zinc-200 p-2 shadow-xl space-y-1">
                <button
                  onClick={() => {
                    setActiveUserId('user_main');
                    setShowAccountDropdown(false);
                  }}
                  className="w-full p-2 text-xs rounded-xl hover:bg-zinc-50 text-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">Primary Vault (Main)</span>
                  {activeUserId === 'user_main' && <Check className="w-3.5 h-3.5 text-[#FF5500]" />}
                </button>
                <button
                  onClick={() => {
                    setActiveUserId('user_friend');
                    setShowAccountDropdown(false);
                  }}
                  className="w-full p-2 text-xs rounded-xl hover:bg-zinc-50 text-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">Savings Account (Secondary)</span>
                  {activeUserId === 'user_friend' && <Check className="w-3.5 h-3.5 text-[#FF5500]" />}
                </button>
                {hasUserCreatedWallet() && (
                  <button
                    onClick={() => {
                      setActiveUserId('user_created');
                      setShowAccountDropdown(false);
                    }}
                    className="w-full p-2 text-xs rounded-xl hover:bg-zinc-50 text-zinc-800 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">{getStoredUser('user_created').name} (My Wallet)</span>
                    {activeUserId === 'user_created' && <Check className="w-3.5 h-3.5 text-[#FF5500]" />}
                  </button>
                )}
              </div>
            )}

            {/* Passkey Biometric Button */}
            <div className="space-y-3">
              <button
                onClick={handleUnlockWithPasskey}
                disabled={isAuthenticatingPasskey}
                className="w-full py-3.5 px-4 rounded-2xl btn-orange text-white font-bold text-sm shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>
                  {isAuthenticatingPasskey ? 'Verifying Passkey...' : 'Unlock with Passkey / Biometrics'}
                </span>
              </button>

              <button
                onClick={() => {
                  audioCues.playIntentRecognized();
                  speakText('SayPay Vault is locked. Use Face ID, fingerprint, or enter six digit PIN 123456.', lang);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Listen to Security Audio Instructions</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-mono">
              <div className="h-px bg-zinc-200 flex-1" />
              <span>OR ENTER PIN</span>
              <div className="h-px bg-zinc-200 flex-1" />
            </div>

            {/* PIN Form or Set New PIN Form */}
            {isSettingNewPin ? (
              <form onSubmit={handleSaveNewPin} className="space-y-3 text-left">
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200">
                  <div className="text-xs font-bold text-zinc-900 mb-0.5">Set Your 6-Digit PIN</div>
                  <div className="text-[11px] text-zinc-600">
                    Create a personal backup PIN to protect and unlock your vault.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    New PIN (6 digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6 digits"
                    className="w-full text-center text-lg tracking-[0.3em] font-mono py-2.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:border-[#FF5500] focus:bg-white transition"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPinCode}
                    onChange={(e) => setConfirmPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter 6 digits"
                    className="w-full text-center text-lg tracking-[0.3em] font-mono py-2.5 px-4 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:border-[#FF5500] focus:bg-white transition"
                  />
                </div>

                {pinFormError && (
                  <div className="text-xs text-red-600 font-semibold">{pinFormError}</div>
                )}
                {pinFormSuccess && (
                  <div className="text-xs text-emerald-600 font-semibold">{pinFormSuccess}</div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingNewPin(false);
                      setPinFormError('');
                    }}
                    className="py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newPinCode.length < 6 || confirmPinCode.length < 6}
                    className="py-2.5 rounded-xl btn-orange text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                  >
                    Save PIN
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleUnlockWithPin} className="space-y-3">
                {/* Lockout Active Warning Pill */}
                {lockoutTimeRemaining > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Security Lockout: {lockoutTimeRemaining}s</span>
                  </div>
                )}

                {/* 6 Visual Masked Bullet Dots */}
                <div className="flex items-center justify-center gap-3 py-1">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                        idx < pinInput.length
                          ? 'bg-[#FF5500] border-2 border-[#FF5500] scale-110 shadow-sm shadow-orange-500/50'
                          : 'border-2 border-zinc-300 bg-transparent'
                      }`}
                    />
                  ))}
                </div>

                <input
                  type="password"
                  maxLength={6}
                  disabled={lockoutTimeRemaining > 0}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit PIN"
                  className="w-full text-center text-xl tracking-[0.4em] font-mono py-3 px-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:border-[#FF5500] focus:bg-white disabled:opacity-30 transition"
                />

                {pinError && (
                  <div className="text-xs text-red-600 font-semibold">{pinError}</div>
                )}

                <button
                  type="submit"
                  disabled={pinInput.length < 6 || lockoutTimeRemaining > 0}
                  className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
                >
                  {lockoutTimeRemaining > 0 ? `Locked (${lockoutTimeRemaining}s)` : 'Unlock with PIN'}
                </button>
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1">
                  <span>Default: <strong className="text-zinc-800">123456</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingNewPin(true);
                      setNewPinCode('');
                      setConfirmPinCode('');
                      setPinFormError('');
                    }}
                    className="text-[#FF5500] font-bold hover:underline cursor-pointer"
                  >
                    + Create or Change PIN
                  </button>
                </div>
              </form>
            )}

            {/* Create New Wallet Link */}
            <div className="pt-2 border-t border-zinc-100">
              <button
                onClick={() => setIsCreateWalletOpen(true)}
                className="text-xs font-bold text-[#FF5500] hover:underline cursor-pointer"
              >
                Do not have a wallet? Create new smart wallet
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-[11px] text-zinc-400 font-mono">
          EIP-4337 Account Abstraction &bull; WebAuthn Biometrics &bull; Zero Private Keys Exposed
        </footer>

        {/* Create Wallet Modal if opened from Lock Screen */}
        <CreateWalletModal
          isOpen={isCreateWalletOpen}
          currentLang={lang}
          onWalletCreated={handleWalletCreated}
          onClose={handleCloseCreateWallet}
        />
      </div>
    );
  }

  // The voice bar must stay on top of every popup. Popups are modal <dialog>s, which the
  // browser draws above everything else (z-index can't beat them) and which make the page
  // behind them inert, so while one is open the bar is moved inside it.
  const voiceBar = (
        <div className="fixed bottom-6 inset-x-0 z-[70] flex flex-col items-center px-4 pointer-events-none">
          <VoiceResultCard card={voiceCard} listening={isListening} processing={isProcessingVoice} transcript={transcript} />
          <div className="pointer-events-auto max-w-lg w-full bg-zinc-950/95 text-white rounded-3xl p-2.5 shadow-2xl border border-zinc-800 backdrop-blur-xl flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 pl-1 overflow-hidden">
              <button
                onClick={toggleMic}
                aria-label={isListening ? 'Stop listening' : 'Start voice command'}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                  isListening
                    ? 'bg-[#FF5500] text-white animate-pulse'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-[#FF5500]'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice command'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <div className="text-xs truncate font-medium">
                <div className="text-white truncate font-display font-bold">
                  {transcript || voiceFeedback}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  Space: tap to talk, tap again to send
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 pr-2 flex-shrink-0">
              <button
                onClick={() => simulateSpokenInput('Check my balance')}
                className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 transition cursor-pointer"
              >
                Balance
              </button>
              <button
                onClick={() => simulateSpokenInput('Send 0.1 ETH to Priya')}
                className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 transition cursor-pointer"
              >
                Send ETH
              </button>
            </div>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = typedCommand.trim();
              if (!text) return;
              setTypedCommand('');
              setTranscript(text);
              handleProcessCommand(text);
            }}
          >
            <label htmlFor="typed-command" className="sr-only">
              Type a command instead of speaking
            </label>
            <input
              id="typed-command"
              type="text"
              dir="auto"
              autoComplete="off"
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
              placeholder="Or type: Send 0.1 ETH to Priya"
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#FF5500] hover:bg-[#e64d00] text-white text-sm font-bold transition cursor-pointer flex-shrink-0"
            >
              Run command
            </button>
          </form>
          </div>
        </div>
  );

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-[#FF5500] selection:text-white ${
        accessibilitySettings.fontSize === 'extra_large'
          ? 'text-xl'
          : accessibilitySettings.fontSize === 'large'
          ? 'text-lg'
          : 'text-base'
      }`}
    >
      {/* Hidden Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true">
        {alertAnnouncement}
      </div>

      {/* 1. Global Floating Pill Navigation Bar */}
      <div className="sticky top-3 z-40 px-3 sm:px-6">
        <header className="max-w-6xl mx-auto bg-white/95 backdrop-blur-xl border border-zinc-200/80 rounded-3xl px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm transition-all">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Group: Brand Logo & Landing Link & Earphone Status & Zero Silent Changes */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-2 group focus:outline-none cursor-pointer"
                title="SayPay Smart Vault"
              >
                <img src={logoImg} alt="SayPay" className="h-8 w-auto object-contain group-hover:scale-105 transition" />
              </button>

              <div className="h-4 w-px bg-zinc-200 hidden md:block" />

              <button
                onClick={onBackToLanding}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200 text-xs font-bold text-zinc-700 transition cursor-pointer"
                title="Return to Landing Page"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
                <span>Landing</span>
              </button>

              {/* Earphones Privacy Indicator (Non-blocking) */}
              {accessibilityMode === 'blind' && (
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setShowHeadphoneModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition cursor-pointer ${
                    headphoneStatus.isConnected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                  title="Earphones Audio Privacy Advisory"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {headphoneStatus.isConnected ? 'Earphones Active' : 'Earphones Recommended'}
                  </span>
                </button>
              )}
            </div>

            {/* Right Controls: Account Dropdown, Mode Toggle, Desktop Quick Actions, Mobile Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200 text-xs font-bold text-zinc-900 transition flex items-center gap-1.5 sm:gap-2 shadow-xs cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-[#FF5500]" />
                  <span className="font-display hidden sm:inline">{userState.name}</span>
                  <span className="font-mono text-[10px] text-zinc-500">({userState.address.slice(0, 4)}...{userState.address.slice(-3)})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 animate-fade-in">
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
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
                          ? 'bg-[#FF5500]/10 text-zinc-950 font-bold'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#FF5500] text-white flex items-center justify-center text-[10px] font-black">
                          V
                        </div>
                        <div>
                          <div className="font-bold">Primary Vault (Smart Account)</div>
                          <div className="text-[10px] font-mono text-zinc-400">0x71C8...4E92</div>
                        </div>
                      </div>
                      {activeUserId === 'user_main' && <Check className="w-4 h-4 text-[#FF5500]" />}
                    </button>

                    <button
                      onClick={() => {
                        audioCues.playSuccess();
                        setActiveUserId('user_friend');
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 cursor-pointer ${
                        activeUserId === 'user_friend'
                          ? 'bg-[#FF5500]/10 text-zinc-950 font-bold'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold">
                          S
                        </div>
                        <div>
                          <div className="font-bold">Savings Account (Secondary Vault)</div>
                          <div className="text-[10px] font-mono text-zinc-400">0x3A9F...05d1</div>
                        </div>
                      </div>
                      {activeUserId === 'user_friend' && <Check className="w-4 h-4 text-[#FF5500]" />}
                    </button>

                    {/* Custom Created Wallet (if active) */}
                    {hasUserCreatedWallet() && (
                      <button
                        onClick={() => {
                          audioCues.playSuccess();
                          setActiveUserId('user_created');
                          setShowAccountDropdown(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between text-xs mt-1 cursor-pointer ${
                          activeUserId === 'user_created'
                            ? 'bg-[#FF5500]/10 text-zinc-950 font-bold'
                            : 'hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                            {getStoredUser('user_created').name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{getStoredUser('user_created').name} (My Wallet)</div>
                            <div className="text-[10px] font-mono text-zinc-400">
                              {getStoredUser('user_created').address.slice(0, 6)}...{getStoredUser('user_created').address.slice(-4)}
                            </div>
                          </div>
                        </div>
                        {activeUserId === 'user_created' && <Check className="w-4 h-4 text-[#FF5500]" />}
                      </button>
                    )}

                    {/* Create New Smart Wallet Trigger */}
                    <div className="pt-2 mt-1 border-t border-zinc-100">
                      <button
                        onClick={() => {
                          audioCues.playIntentRecognized();
                          setShowAccountDropdown(false);
                          setIsCreateWalletOpen(true);
                        }}
                        className="w-full text-left p-2 rounded-xl text-xs font-bold text-[#FF5500] hover:bg-orange-50 transition flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create New Smart Wallet</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accessibility Mode Switcher */}
              <button
                onClick={() => {
                  const next = accessibilityMode === 'blind' ? 'visual' : 'blind';
                  handleSelectMode(next);
                }}
                className={`p-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  accessibilityMode === 'blind'
                    ? 'border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500] shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                }`}
                title={accessibilityMode === 'blind' ? 'Voice-Assisted Mode' : 'Visual Standard Mode'}
                aria-label="Toggle Accessibility Mode"
              >
                {accessibilityMode === 'blind' ? (
                  <>
                    <Mic className="w-4 h-4 text-[#FF5500]" />
                    <span className="hidden md:inline font-bold">Voice-Assisted</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-zinc-600" />
                    <span className="hidden md:inline">Visual Mode</span>
                  </>
                )}
              </button>

              {/* Desktop Quick Actions (lg+) */}
              <div className="hidden lg:flex items-center gap-2">
                {/* Vault Quick Lock Button */}
                <button
                  onClick={() => {
                    audioCues.playWarning();
                    setIsLocked(true);
                    speakText('SayPay Vault locked.', lang);
                  }}
                  className="p-2 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Lock SayPay Vault"
                  aria-label="Lock SayPay Vault"
                >
                  <Lock className="w-4 h-4 text-zinc-600" />
                  <span className="text-xs font-bold">Lock</span>
                </button>

                {/* Accessibility Settings Trigger */}
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsSettingsOpen(true);
                  }}
                  className="p-2 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Accessibility Settings"
                  aria-label="Open Accessibility Settings"
                >
                  <Settings className="w-4 h-4 text-zinc-600" />
                  <span className="text-xs font-bold">Settings</span>
                </button>

                {/* Privacy Mode (Screen Curtain) Toggle */}
                <button
                  onClick={() => {
                    if (isPrivacyModeActive) {
                      disablePrivacyMode();
                    } else {
                      enablePrivacyMode();
                    }
                  }}
                  className={`p-2 rounded-2xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isPrivacyModeActive
                      ? 'border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500] shadow-xs animate-pulse'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                  title="Privacy Mode (Screen Curtain)"
                  aria-label="Toggle Privacy Screen Curtain"
                >
                  <EyeOff className="w-4 h-4 text-zinc-600" />
                  <span className="text-xs font-bold">Privacy</span>
                </button>

                {/* Language Switch */}
                <select
                  value={lang}
                  onChange={(e) => {
                    const newL = e.target.value as SupportedLanguage;
                    chooseLang(newL);
                    audioCues.playIntentRecognized();
                  }}
                  className="bg-white border border-zinc-200 text-xs font-bold text-zinc-800 rounded-2xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                  aria-label="Select language"
                >
                  <option value="en">EN</option>
                  <option value="hi">हिंदी</option>
                  <option value="ar">العربية</option>
                </select>
              </div>

              {/* Mobile / Tablet Quick Menu Trigger (<lg) */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => setShowMobileNavMenu(!showMobileNavMenu)}
                  className="p-2 rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 transition shadow-xs cursor-pointer"
                  title="More actions"
                  aria-label="Open mobile menu"
                >
                  {showMobileNavMenu ? (
                    <X className="w-4 h-4 text-zinc-800" />
                  ) : (
                    <MoreHorizontal className="w-4 h-4 text-zinc-800" />
                  )}
                </button>

                {/* Mobile Menu Dropdown */}
                {showMobileNavMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 animate-fade-in space-y-1">
                    <button
                      onClick={() => {
                        setShowMobileNavMenu(false);
                        audioCues.playWarning();
                        setIsLocked(true);
                        speakText('SayPay Vault locked.', lang);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-zinc-600" />
                      <span>Lock Vault</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMobileNavMenu(false);
                        audioCues.playIntentRecognized();
                        setIsSettingsOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-zinc-600" />
                      <span>Accessibility Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowMobileNavMenu(false);
                        if (isPrivacyModeActive) {
                          disablePrivacyMode();
                        } else {
                          enablePrivacyMode();
                        }
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 text-zinc-800 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-zinc-600" />
                      <span>{isPrivacyModeActive ? 'Disable Screen Curtain' : 'Enable Screen Curtain'}</span>
                    </button>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between px-2 py-1 text-xs">
                      <span className="font-bold text-zinc-500">Language:</span>
                      <select
                        value={lang}
                        onChange={(e) => {
                          const newL = e.target.value as SupportedLanguage;
                          chooseLang(newL);
                          audioCues.playIntentRecognized();
                        }}
                        className="bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-800 rounded-xl px-2 py-1 focus:outline-none cursor-pointer"
                        aria-label="Select language"
                      >
                        <option value="en">EN</option>
                        <option value="hi">हिंदी</option>
                        <option value="ar">العربية</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setShowMobileNavMenu(false);
                        onBackToLanding();
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-50 text-zinc-600 text-xs font-semibold transition flex items-center gap-2.5 cursor-pointer border-t border-zinc-100"
                    >
                      <ArrowLeft className="w-4 h-4 text-zinc-500" />
                      <span>Back to Landing</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Earphones Privacy Advisory Banner */}
        {showEarphoneBanner && !headphoneStatus.isConnected && (
          <div
            role="alert"
            className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950 font-display">
                  Audio Privacy Notice: Connect Earphones
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed max-w-xl">
                  Connect wired or Bluetooth earphones for audio privacy. Your balance and transactions are read out loud by voice.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => {
                  audioCues.playSuccess();
                  headphoneSafety.confirmEarphonesConnected(true);
                  setShowEarphoneBanner(false);
                }}
                className="px-3.5 py-2 rounded-xl btn-orange text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>I Have Earphones Connected</span>
              </button>
              <button
                onClick={() => setShowEarphoneBanner(false)}
                className="px-3 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {/* Incoming Payment Banner (Live Real-Time Notification) */}
        {incomingAlert && (
          <div className="p-4 rounded-3xl bg-[#FF5500] text-white font-bold shadow-lg border border-orange-400 flex items-center justify-between animate-bounce-short">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#FF5500] flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6 text-[#FF5500]" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-orange-100">
                  Payment Received
                </div>
                <div className="text-base font-black font-display">
                  +{incomingAlert.amount} ETH from {incomingAlert.from}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pending Undo Payment Grace Window Banner (NN/g Heuristic #5: Error Prevention) */}
        {pendingUndoTx && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 rounded-3xl bg-amber-500/10 border-2 border-amber-500 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black animate-pulse flex-shrink-0">
                <RotateCcw className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-extrabold text-amber-700 flex items-center gap-2">
                  <span>Reversible Transfer Window</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-black">
                    {pendingUndoTx.countdown}s
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black font-display text-zinc-900 mt-0.5">
                  Sending {pendingUndoTx.amount} Sepolia ETH to {pendingUndoTx.recipient}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCancelPendingTx}
                className="flex-1 sm:flex-none px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo Payment ({pendingUndoTx.countdown}s)</span>
              </button>
              <button
                onClick={() => {
                  finalizeSend(pendingUndoTx);
                  setPendingUndoTx(null);
                }}
                className="px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Send Now
              </button>
            </div>
          </div>
        )}

        {/* Responsive Dashboard: Vertical Stack on Mobile (<lg), 2-Column Luxury Grid on Desktop (lg+) */}
        <div className="max-w-6xl mx-auto pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Desktop 5 cols, Mobile Full Width): Portfolio Card & Actions */}
            <div className="lg:col-span-5 space-y-6 min-w-0 max-w-full overflow-hidden">
              {/* 1. Hero Balance Card */}
              <section
                aria-labelledby="portfolio-heading"
                className="tw-card p-5 sm:p-7 relative overflow-hidden group shadow-sm bg-white w-full max-w-full min-w-0"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#FF5500] via-orange-400 to-amber-500" />

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 min-w-0 max-w-full">
                  <div className="min-w-0 flex-1 overflow-hidden w-full">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span id="portfolio-heading" className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider font-display">
                        Total Balance
                      </span>
                    </div>

                    {/* Primary Monospace Balance with responsive scaling and containment */}
                    <div className="flex items-baseline gap-2 min-w-0 max-w-full overflow-hidden">
                      <span
                        className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight font-mono truncate block max-w-full"
                        title={`$${totalBalanceUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} USD`}
                      >
                        ${totalBalanceUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-500 font-mono shrink-0">USD</span>
                    </div>

                    {/* Equivalent in ETH */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs sm:text-sm font-mono font-bold text-[#FF5500]">
                        {userState.balanceETH.toFixed(4)} ETH
                      </span>
                      <span className="text-zinc-300">&bull;</span>
                      <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                        <TrendingUp className="w-3 h-3 text-emerald-700" />
                        <span>+1.00% Today</span>
                      </span>
                    </div>
                  </div>

                  {/* Address Pill + Read Aloud Controls */}
                  <div className="flex flex-col sm:flex-row md:flex-col sm:items-start md:items-end gap-2 shrink-0">
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
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 font-mono text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                      title="Copy Address"
                    >
                      <span>{userState.address.slice(0, 6)}...{userState.address.slice(-4)}</span>
                      {copiedAddress ? (
                        <span className="flex items-center gap-1 text-[#FF5500] font-bold text-[10px]">
                          <Check className="w-3.5 h-3.5 text-[#FF5500]" />
                          <span>Copied!</span>
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        audioCues.playIntentRecognized();
                        const readout = `Your portfolio balance is $${totalBalanceUSD.toFixed(2)} USD, with ${userState.balanceETH.toFixed(4)} Sepolia ETH.`;
                        setVoiceFeedback(readout);
                        speakText(readout, lang);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#FF5500]/10 hover:bg-[#FF5500]/20 border border-[#FF5500]/25 text-[#FF5500] text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
                      <span>Read Balance</span>
                    </button>
                  </div>
                </div>

                {/* 4 Primary Action Buttons (Send, Receive, Swap, Fund) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-6 pt-5 border-t border-zinc-100 w-full min-w-0 max-w-full">
                  {/* Action 1: Send */}
                  <button
                    onClick={() => openSendModal({})}
                    className="min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-2xl hover:bg-zinc-50 transition group cursor-pointer"
                  >
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl btn-orange text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                      <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-zinc-900 font-display truncate max-w-full text-center">Send</span>
                  </button>

                  {/* Action 2: Receive */}
                  <button
                    onClick={() => openReceiveModal()}
                    className="min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-2xl hover:bg-zinc-50 transition group cursor-pointer"
                  >
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-800 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#FF5500]" />
                    </div>
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-zinc-900 font-display truncate max-w-full text-center">Receive</span>
                  </button>

                  {/* Action 3: Swap */}
                  <button
                    onClick={() => openSwapModal()}
                    className="min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-2xl hover:bg-zinc-50 transition group cursor-pointer"
                  >
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <ArrowDownUp className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-zinc-900 font-display truncate max-w-full text-center">Swap</span>
                  </button>

                  {/* Action 4: Fund (+ Add Cash) */}
                  <button
                    onClick={() => openFundModal()}
                    className="min-w-0 flex-1 flex flex-col items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-2xl hover:bg-zinc-50 transition group cursor-pointer"
                  >
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                      <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-zinc-900 font-display truncate max-w-full text-center">Fund</span>
                  </button>
                </div>

              {/* Quick Pills for Contacts and Guardians */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t border-zinc-100/60 text-xs">
                <button
                  onClick={() => openContactsModal()}
                  className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Address Book ({userState.contacts.length})</span>
                </button>

                <button
                  onClick={() => openGuardiansModal()}
                  className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Social Guardians ({userState.guardians.length})</span>
                </button>
              </div>
            </section>

            {/* Quick Security & Protection Status Card */}
            <section className="p-5 rounded-3xl bg-white border border-zinc-200/80 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-xs text-zinc-900 uppercase tracking-wider font-display">
                    Vault Security & Protection
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Protected
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-600 font-medium">Account Abstraction:</span>
                  <span className="font-mono font-bold text-zinc-800">EIP-4337 Smart Account</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-600 font-medium">Guardian Recovery:</span>
                  <span className="font-mono font-bold text-emerald-700">{userState.guardians.length} Trusted Guardians</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-600 font-medium">Hardware Biometrics:</span>
                  <span className="font-mono font-bold text-zinc-800">WebAuthn Passkey</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-600 font-medium">Gas Sponsorship:</span>
                  <span className="font-mono font-bold text-emerald-700">100% Sponsored (0 Gas)</span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsGuardiansOpen(true);
                  }}
                  className="text-[#FF5500] font-bold hover:underline cursor-pointer"
                >
                  Manage Guardians &rarr;
                </button>
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    setIsSettingsOpen(true);
                  }}
                  className="text-zinc-500 hover:text-zinc-900 font-bold transition cursor-pointer"
                >
                  Inheritance Plan &rarr;
                </button>
              </div>
            </section>
          </div>

          {/* Right Column (Desktop 7 cols, Mobile Full Width): Assets, NFTs, Activity */}
          <div className="lg:col-span-7 space-y-6">
            {/* 2. Sub-Navigation Tabs (Crypto, NFTs, Approvals, Trending, Activity) */}
            <section className="tw-card p-6 sm:p-7 relative overflow-hidden shadow-sm bg-white">
              {/* Tab Bar */}
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-6 overflow-x-auto">
                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={() => switchTab('crypto')}
                    className={`pb-2 px-1 text-sm font-black transition relative cursor-pointer ${
                      activeTab === 'crypto'
                        ? 'text-zinc-950 border-b-2 border-[#FF5500]'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Crypto
                  </button>

                  <button
                    onClick={() => switchTab('nfts')}
                    className={`pb-2 px-1 text-sm font-black transition relative cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'nfts'
                        ? 'text-zinc-950 border-b-2 border-[#FF5500]'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <span>NFTs</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] font-mono text-zinc-600">
                      {userState.nfts?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => switchTab('approvals')}
                    className={`pb-2 px-1 text-sm font-black transition relative cursor-pointer flex items-center gap-1.5 ${
                      activeTab === 'approvals'
                        ? 'text-zinc-950 border-b-2 border-[#FF5500]'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <span>Approvals</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      (userState.approvals?.length || 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {userState.approvals?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => switchTab('trending')}
                    className={`pb-2 px-1 text-sm font-black transition relative cursor-pointer ${
                      activeTab === 'trending'
                        ? 'text-zinc-950 border-b-2 border-[#FF5500]'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Trending
                  </button>

                  <button
                    onClick={() => switchTab('activity')}
                    className={`pb-2 px-1 text-sm font-black transition relative cursor-pointer ${
                      activeTab === 'activity'
                        ? 'text-zinc-950 border-b-2 border-[#FF5500]'
                        : 'text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    Activity
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={() => {
                      audioCues.playIntentRecognized();
                      setIsFundOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[#FF5500] font-black text-xs hover:bg-orange-100 transition inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Cash</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: CRYPTO TOKENS */}
              {activeTab === 'crypto' && (
                <div className="space-y-3">
                  {userState.tokens.map((tok) => (
                    <div
                      key={tok.id}
                      className="p-3.5 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:bg-zinc-50/70 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${tok.iconBg} text-white flex items-center justify-center font-black text-xs shadow-sm`}>
                          {tok.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-zinc-900">{tok.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-mono font-bold">
                              {tok.symbol}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-semibold">
                              {tok.network}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500 font-medium mt-0.5">
                            ${tok.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                            <span className={`font-bold ms-1 ${tok.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tok.change24h >= 0 ? '+' : ''}{tok.change24h}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-end">
                          <div className="font-mono text-sm sm:text-base font-black text-zinc-900">
                            {tok.balance.toFixed(tok.symbol === 'ETH' ? 4 : 2)} {tok.symbol}
                          </div>
                          <div className="text-xs font-semibold text-zinc-500">
                            ${(tok.balance * tok.priceUSD).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            USD
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              audioCues.playIntentRecognized();
                              setSendPreFill({});
                              setIsSendOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition cursor-pointer"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => {
                              audioCues.playIntentRecognized();
                              setIsSwapOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition cursor-pointer"
                          >
                            Swap
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: NFTS & COLLECTIBLES */}
              {activeTab === 'nfts' && (
                <div className="space-y-4">
                  {(!userState.nfts || userState.nfts.length === 0) ? (
                    <div className="p-8 rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 text-center space-y-3">
                      <Award className="w-10 h-10 text-zinc-400 mx-auto" />
                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-800">No NFTs in this Wallet</h4>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                          Claim your SayPay Pioneer Genesis NFT badge to test accessibility descriptions and on-chain collectibles.
                        </p>
                      </div>
                      <button
                        onClick={handleClaimNFT}
                        className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider shadow-sm transition cursor-pointer"
                      >
                        Claim Genesis Badge
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {userState.nfts.map((nft) => (
                        <div key={nft.id} className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3 shadow-xs">
                          <div className="h-44 rounded-xl overflow-hidden bg-zinc-100 relative">
                            <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
                            <span className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-bold">
                              {nft.tokenId}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">{nft.collection}</span>
                            <h4 className="font-black text-sm text-zinc-900">{nft.name}</h4>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{nft.description}</p>
                          </div>
                          <button
                            onClick={() => {
                              audioCues.playSuccess();
                              speakText(nft.audioDescription, lang);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-orange-50 border border-orange-200 text-[#FF5500] font-bold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
                            <span>Listen to Visual Description</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: APPROVALS & SECURITY */}
              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950">
                      <span className="font-black block">Approval Security Shield</span>
                      <span>
                        Smart contract approvals let applications spend tokens on your behalf. Revoke any permission you no longer use.
                      </span>
                    </div>
                  </div>

                  {(!userState.approvals || userState.approvals.length === 0) ? (
                    <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-200 text-center text-xs text-zinc-500 font-medium">
                      Zero active approvals. Your wallet has no external token permissions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userState.approvals.map((app) => (
                        <div key={app.id} className="p-4 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-zinc-900">{app.spenderName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                app.riskLevel === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {app.riskLevel} risk
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1 font-mono">
                              <span>Allowance: {app.allowance} {app.tokenSymbol}</span> &bull; <span>{app.spenderAddress.slice(0, 10)}...</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRevokeApproval(app.id, app.spenderName)}
                            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: TRENDING / MARKET DATA */}
              {activeTab === 'trending' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Top Market Movers
                    </h4>
                    <button
                      onClick={() => {
                        audioCues.playSuccess();
                        const speech = 'Market Report: Bitcoin is at $88,450, up 2.45%. Ethereum is at $2,693, up 1.00%. Solana is up 4.82% at $184.60.';
                        speakText(speech, lang);
                      }}
                      className="text-xs font-bold text-[#FF5500] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen to Market Audio Brief</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MARKET_TRENDS.map((trend) => (
                      <div key={trend.id} className="p-4 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-zinc-900">{trend.name}</span>
                            <span className="font-mono text-xs font-bold text-zinc-400">{trend.symbol}</span>
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Cap: {trend.marketCapUSD} &bull; Vol: {trend.volume24hUSD}
                          </div>
                        </div>

                        <div className="text-end">
                          <div className="font-mono font-black text-sm text-zinc-900">
                            ${trend.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div className={`font-mono text-xs font-bold ${trend.change24h >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {trend.change24h >= 0 ? '+' : ''}{trend.change24h}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: ACTIVITY (TRANSACTION HISTORY) */}
              {activeTab === 'activity' && (
                <div className="space-y-3">
                  {/* Interactive Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200 mb-3">
                    {(['all', 'send', 'receive'] as const).map((filterType) => (
                      <button
                        key={filterType}
                        onClick={() => {
                          audioCues.playIntentRecognized();
                          setTxFilter(filterType);
                        }}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                          txFilter === filterType
                            ? 'bg-white text-zinc-900 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        {filterType === 'all' ? 'All' : filterType === 'send' ? 'Sent' : 'Received'}
                      </button>
                    ))}
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-zinc-50 border border-dashed border-zinc-300 text-center space-y-3">
                      <Clock className="w-8 h-8 text-zinc-400 mx-auto" />
                      <div className="text-xs text-zinc-500 font-medium">
                        No transactions yet. Click "Fund" or say "Add cash" to deposit testnet funds.
                      </div>
                      <button
                        onClick={() => {
                          audioCues.playIntentRecognized();
                          setIsFundOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#FF5500] text-white font-bold text-xs shadow-sm hover:bg-[#e04b00] transition cursor-pointer"
                      >
                        Deposit Mock Funds
                      </button>
                    </div>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3.5 rounded-2xl border border-zinc-200/80 hover:border-zinc-300 transition bg-white space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                                tx.type === 'send'
                                  ? 'bg-zinc-100 text-zinc-700'
                                  : tx.type === 'swap'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-[#FF5500]/10 text-[#FF5500]'
                              }`}
                            >
                              {tx.type === 'send' ? (
                                <ArrowUpRight className="w-4 h-4 text-zinc-700" />
                              ) : tx.type === 'swap' ? (
                                <ArrowDownUp className="w-4 h-4 text-emerald-700" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4 text-[#FF5500]" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-zinc-900 capitalize">
                                  {tx.type === 'fund' ? 'Faucet Deposit' : tx.type}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  &bull; {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-600 font-medium">
                                {tx.type === 'send' ? `To: ${tx.counterparty}` : tx.type === 'swap' ? tx.note : `From: ${tx.counterparty}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-end">
                            <div
                              className={`font-mono text-sm font-black ${
                                tx.type === 'send' ? 'text-zinc-900' : 'text-emerald-700'
                              }`}
                            >
                              {tx.type === 'send' ? '-' : '+'}{tx.amount} {tx.currency}
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold font-mono">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

        {voiceBarHost ? createPortal(voiceBar, voiceBarHost) : voiceBar}
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
        onClose={closeSettingsModal}
      />

      <HeadphoneSafetyModal
        isOpen={showHeadphoneModal}
        currentLang={lang}
        onVerified={() => setShowHeadphoneModal(false)}
        onSwitchToVisual={() => {
          setShowHeadphoneModal(false);
          handleSelectMode('visual');
        }}
        onClose={() => {
          setShowHeadphoneModal(false);
        }}
      />

      <SendModal
        isOpen={isSendOpen}
        contacts={userState.contacts}
        currentLang={lang}
        initialContact={sendPreFill.contact}
        initialAmount={sendPreFill.amount}
        availableBalanceETH={userState.balanceETH}
        ethRateUSD={userState.ethRateUSD}
        externalVoiceTrigger={modalVoiceTrigger}
        onClose={closeSendModal}
        onConfirmSend={handleConfirmSend}
      />

      <ReceiveModal
        isOpen={isReceiveOpen}
        address={userState.address}
        userName={userState.name}
        currentLang={lang}
        onClose={closeReceiveModal}
      />

      <ContactsModal
        isOpen={isContactsOpen}
        initialNewName={contactPreFill}
        contacts={userState.contacts}
        currentLang={lang}
        voiceAction={contactsVoiceAction}
        onClearVoiceAction={() => setContactsVoiceAction(null)}
        onClose={closeContactsModal}
        onSelectForSend={(contact) => {
          closeContactsModal();
          openSendModal({ contact: contact.name });
        }}
        onAddContact={handleAddContact}
        onDeleteContact={handleDeleteContact}
      />

      <GuardiansModal
        isOpen={isGuardiansOpen}
        guardians={userState.guardians}
        currentLang={lang}
        onClose={closeGuardiansModal}
        onAnnounce={(msg) => {
          setAriaAnnouncement(msg);
          setVoiceFeedback(msg);
        }}
      />

      {/* Wallet Creation Window */}
      <CreateWalletModal
        isOpen={isCreateWalletOpen}
        currentLang={lang}
        onWalletCreated={handleWalletCreated}
        onClose={handleCloseCreateWallet}
      />

      {/* Fund Wallet / Add Mock Cash Modal */}
      <FundWalletModal
        isOpen={isFundOpen}
        user={userState}
        currentLang={lang}
        onFundSuccess={(updatedUser) => {
          setUserState(updatedUser);
          setTransactions(getStoredTransactions(updatedUser.id));
          if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
          const fundMsg = `Deposit successful! Your new balance is ${updatedUser.balanceETH.toFixed(4)} Sepolia ETH.`;
          speakAndFollowUp(fundMsg, lang);
          notifyInterfaceChange(`Deposit confirmed: balance updated to ${updatedUser.balanceETH.toFixed(4)} ETH`, 'balance');
        }}
        onClose={closeFundModal}
      />

      {/* Token Swap Modal */}
      <SwapModal
        isOpen={isSwapOpen}
        user={userState}
        currentLang={lang}
        onSwapSuccess={(updatedUser) => {
          setUserState(updatedUser);
          setTransactions(getStoredTransactions(updatedUser.id));
          if (accessibilitySettings.earconsEnabled) audioCues.playSuccess();
          const swapMsg = `Swap completed! Your new balance is ${updatedUser.balanceETH.toFixed(4)} Sepolia ETH.`;
          speakAndFollowUp(swapMsg, lang);
          notifyInterfaceChange(`Swap confirmed: balance updated to ${updatedUser.balanceETH.toFixed(4)} ETH`, 'balance');
        }}
        onClose={closeSwapModal}
      />

      {/* Stealth Screen Curtain Overlay for Shoulder-Surfing Privacy */}
      {isPrivacyModeActive && (
        <div
          role="region"
          aria-label="Privacy Screen Curtain Active. Double click or press spacebar to speak."
          className="fixed inset-0 z-[99999] bg-black text-white flex flex-col items-center justify-center p-6 select-none cursor-pointer"
          onDoubleClick={() => disablePrivacyMode()}
        >
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <EyeOff className="w-8 h-8 text-[#FF5500]" />
            </div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Privacy Mode Active (Screen Curtain)
            </p>
            <p className="text-sm text-zinc-400">
              Display is blacked out for shoulder-surfing security. Voice commands and audio feedback remain operational.
            </p>
            <div className="pt-4 flex flex-col items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  disablePrivacyMode();
                }}
                className="px-5 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-700 transition cursor-pointer"
              >
                Exit Privacy Mode
              </button>
              <span className="text-[11px] text-zinc-600">
                Tip: Say "turn off privacy mode" or double-click anywhere to exit
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
