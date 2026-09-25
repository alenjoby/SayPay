import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Shield,
  Keyboard,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage, detectLanguage } from '../utils/i18n';
import { parseVoiceIntent } from '../utils/intentParser';
import { TransactionModal } from './TransactionModal';

interface InteractiveWalletDemoProps {
  lang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onAnnounce: (polite: string, alert?: string) => void;
}

export const InteractiveWalletDemo: React.FC<InteractiveWalletDemoProps> = ({
  lang,
  onLanguageChange,
  onAnnounce,
}) => {
  const [balance, setBalance] = useState<number>(2.5);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [showTypedInput, setShowTypedInput] = useState<boolean>(false);
  const [typedCommand, setTypedCommand] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'activity' | 'guardians'>('tokens');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0.1);
  const [pendingContact, setPendingContact] = useState<string>('Amma');

  // Activity list
  const [transactions, setTransactions] = useState<Array<{ id: string; desc: string; time: string; amount: string; status: string; isCredit?: boolean }>>([
    { id: '1', desc: 'Sepolia Faucet Drop', time: '12m ago', amount: '+2.50 ETH', status: 'Confirmed', isCredit: true },
  ]);

  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
          audioCues.playListeningStarted();
          onAnnounce('Microphone active. Listening for voice command.');
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Keyboard shortcut Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, isModalOpen, lang]);

  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      const speechLang = lang === 'hi' ? 'hi-IN' : lang === 'ar' ? 'ar-SA' : 'en-US';
      if (recognitionRef.current) {
        recognitionRef.current.lang = speechLang;
        try {
          recognitionRef.current.start();
        } catch {
          simulateVoiceInput();
        }
      } else {
        simulateVoiceInput();
      }
    }
  };

  const simulateVoiceInput = (samplePhrase?: string) => {
    setIsListening(true);
    audioCues.playListeningStarted();

    const phrase =
      samplePhrase ||
      (lang === 'hi'
        ? 'अम्मा को 0.1 ETH भेजो'
        : lang === 'ar'
        ? 'أرسل 0.1 إيثيريوم إلى أمي'
        : 'Send 0.1 ETH to Amma');

    setTimeout(() => {
      setTranscript(phrase);
      setIsListening(false);
      processCommand(phrase);
    }, 1100);
  };

  const processCommand = (text: string) => {
    if (!text.trim()) return;

    const detected = detectLanguage(text);
    if (detected !== lang) {
      onLanguageChange(detected);
    }

    const result = parseVoiceIntent(text);

    if (result.intent === 'check_balance') {
      audioCues.playSuccess();
      const msg =
        detected === 'hi'
          ? `आपका वर्तमान बैलेंस ${balance.toFixed(2)} सेपोलिया टेस्ट ETH है।`
          : detected === 'ar'
          ? `رصيدك الحالي هو ${balance.toFixed(2)} سيبوليا إيثيريوم تجريبي.`
          : `Your current balance is ${balance.toFixed(2)} Sepolia test Ether.`;
      onAnnounce(msg);
      speakText(msg, detected);
    } else if (result.intent === 'send') {
      const amt = result.amount || 0.1;
      const contact = result.contact || 'Amma';
      setPendingAmount(amt);
      setPendingContact(contact);
      setIsModalOpen(true);
      onAnnounce(`Send proposal created: ${amt} ETH to ${contact}. Opening confirmation dialog.`);
    } else if (result.intent === 'history') {
      audioCues.playSuccess();
      const msg =
        detected === 'hi'
          ? 'हाल के लेनदेन: नल से 2.5 ETH प्राप्त हुआ।'
          : detected === 'ar'
          ? 'سجل المعاملات: تم استلام 2.5 إيثيريوم من صنبور الاختبار.'
          : 'Recent activity: Received 2.5 test ETH from faucet.';
      onAnnounce(msg);
      speakText(msg, detected);
    } else if (result.intent === 'cancel') {
      audioCues.playWarning();
      const msg = detected === 'hi' ? 'कार्रवाई रद्द कर दी गई।' : detected === 'ar' ? 'تم إلغاء الأمر.' : 'Action cancelled.';
      onAnnounce(msg);
      speakText(msg, detected);
    } else {
      audioCues.playWarning();
      const msg =
        detected === 'hi'
          ? 'क्या आप बैलेंस जांचना चाहते हैं या फंड भेजना चाहते हैं?'
          : detected === 'ar'
          ? 'هل تقصد فحص الرصيد أم إرسال الأموال؟'
          : 'Did you mean check balance or send funds?';
      onAnnounce(msg);
      speakText(msg, detected);
    }
  };

  const handleReadBalance = () => {
    audioCues.playSuccess();
    const msg =
      lang === 'hi'
        ? `आपका बैलेंस दो दशमलव पाँच शून्य सेपोलिया टेस्ट इथीरियम है।`
        : lang === 'ar'
        ? `رصيدك هو اثنان فاصلة خمسة سيبوليا إيثيريوم تجريبي.`
        : `Your balance is two point five zero Sepolia test Ether.`;
    onAnnounce(msg);
    speakText(msg, lang);
  };

  const handleCopyAddress = () => {
    setCopied(true);
    audioCues.playSuccess();
    navigator.clipboard.writeText('0x71C8A3f89d02E15a42f5678B129cDeA44e92');
    onAnnounce('Smart Vault address copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransactionSuccess = (amount: number, contact: string) => {
    const newBal = Math.max(0, balance - amount);
    setBalance(newBal);
    setTransactions((prev) => [
      {
        id: String(Date.now()),
        desc: `Sent to ${contact}`,
        time: 'Just now',
        amount: `-${amount} ETH`,
        status: 'Confirmed',
        isCredit: false,
      },
      ...prev,
    ]);
    const announceMsg = `Transaction successful! Sent ${amount} ETH to ${contact}. Updated balance is ${newBal.toFixed(2)} ETH.`;
    onAnnounce(announceMsg);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto my-10 px-2 sm:px-4">
      {/* Outer Ambient Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-[#F6851B]/20 via-[#2EC08B]/15 to-[#8B5CF6]/15 rounded-[2.5rem] blur-2xl -z-10 opacity-75" />

      {/* Main Luxury Device Frame (Phantom & OKX caliber) */}
      <div className="relative rounded-[2.25rem] bg-[#070d10] border border-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] overflow-hidden text-white">
        {/* Specular Top Inset Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* 1. Wallet Top Navigation Bar */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.06] bg-[#091316]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F6851B] to-[#D95B00] flex items-center justify-center font-black text-black text-xs shadow-md shadow-[#F6851B]/30">
              🦊
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">Smart Vault</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2EC08B] animate-pulse" />
              </div>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 text-[11px] font-mono text-[#A4C4BC] hover:text-white transition group"
                title="Copy address"
              >
                <span>0x71C8...4E92</span>
                {copied ? <Check className="w-3 h-3 text-[#2EC08B]" /> : <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#E5FFC3]/10 text-[#E5FFC3] border border-[#E5FFC3]/20 font-medium">
              Sepolia
            </span>
            <button
              onClick={handleReadBalance}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#E5FFC3] border border-white/10 transition active:scale-95"
              title="Speak balance aloud"
              aria-label="Speak balance aloud"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Hero Balance Presentation */}
        <div className="px-6 pt-7 pb-4 text-center relative">
          <span className="text-xs uppercase tracking-widest text-[#A4C4BC] font-semibold">
            {lang === 'hi' ? 'कुल उपलब्ध बैलेंस' : lang === 'ar' ? 'الرصيد المتاح الكلي' : 'Total Available Balance'}
          </span>
          <div className="flex items-baseline justify-center gap-2 mt-1">
            <h3 className="text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tight">
              {balance.toFixed(4)}
            </h3>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#E5FFC3]">ETH</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-sm font-medium text-white/50">≈ ${(balance * 3368.2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
            <span className="text-xs font-bold text-[#2EC08B] px-2 py-0.5 rounded-full bg-[#2EC08B]/10">
              +2.45%
            </span>
          </div>
        </div>

        {/* 3. Central Voice Orb Action Zone (The Showstopper) */}
        <div className="px-6 py-6 mx-4 my-2 rounded-3xl bg-gradient-to-b from-[#091518] to-[#050b0d] border border-white/[0.08] text-center relative overflow-hidden">
          {/* Subtle Glow Behind Voice Orb */}
          <div className="absolute inset-0 bg-radial from-[#F6851B]/15 via-transparent to-transparent opacity-60 pointer-events-none" />

          {/* Central Pulsing Mic Orb */}
          <div className="relative inline-flex items-center justify-center my-2">
            <button
              onClick={handleToggleListening}
              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 cursor-pointer relative z-10 ${
                isListening
                  ? 'bg-gradient-to-tr from-[#F6851B] to-[#FF9F43] text-black voice-orb-active scale-105 shadow-[0_0_50px_rgba(246,133,27,0.6)]'
                  : 'bg-gradient-to-tr from-[#0e1d21] to-[#14282e] hover:border-[#F6851B] text-[#E5FFC3] border-2 border-white/15 shadow-[0_15px_30px_rgba(0,0,0,0.6)] hover:scale-102'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start speaking command or press Spacebar'}
            >
              <Mic className={`w-10 h-10 ${isListening ? 'animate-bounce text-black' : 'text-[#F6851B]'}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isListening ? 'text-black' : 'text-[#E5FFC3]'}`}>
                {isListening ? 'Listening' : 'Tap / Space'}
              </span>
            </button>
          </div>

          {/* Real-time Multi-bar Soundwave Visualizer */}
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 h-10 my-2" aria-hidden="true">
              <span className="w-1.5 rounded-full bg-[#F6851B] bar-1" />
              <span className="w-1.5 rounded-full bg-[#E5FFC3] bar-2" />
              <span className="w-1.5 rounded-full bg-[#2EC08B] bar-3" />
              <span className="w-1.5 rounded-full bg-[#F6851B] bar-4" />
              <span className="w-1.5 rounded-full bg-[#E5FFC3] bar-5" />
              <span className="w-1.5 rounded-full bg-[#2EC08B] bar-6" />
              <span className="w-1.5 rounded-full bg-[#F6851B] bar-7" />
            </div>
          )}

          {/* Transcript / Spoken Status Pill */}
          <div className="mt-3 min-h-[2.5rem] flex items-center justify-center">
            {transcript ? (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm font-semibold text-white animate-fade-in">
                <Radio className="w-3.5 h-3.5 text-[#F6851B] animate-pulse" />
                "{transcript}"
              </span>
            ) : (
              <span className="text-xs text-[#A4C4BC] font-medium">
                Hold <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px]">Spacebar</kbd> or tap mic to speak in English, Hindi, or Arabic
              </span>
            )}
          </div>

          {/* One-Tap Voice Test Prompts */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 pt-3 border-t border-white/5">
            <button
              onClick={() => simulateVoiceInput('Send 0.1 ETH to Amma')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#F6851B]/20 text-xs text-white border border-white/10 hover:border-[#F6851B]/40 transition active:scale-95"
            >
              "Send 0.1 ETH to Amma"
            </button>
            <button
              onClick={() => simulateVoiceInput('अम्मा को 0.1 ETH भेजो')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#F6851B]/20 text-xs text-white border border-white/10 hover:border-[#F6851B]/40 transition active:scale-95"
            >
              "अम्मा को 0.1 ETH भेजो"
            </button>
            <button
              onClick={() => simulateVoiceInput('أرسل 0.1 إيثيريوم إلى أمي')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#F6851B]/20 text-xs text-white border border-white/10 hover:border-[#F6851B]/40 transition active:scale-95"
            >
              "أرسل 0.1 إيثيريوم إلى أمي"
            </button>
          </div>

          {/* Optional Keyboard Fallback */}
          <div className="mt-3">
            <button
              onClick={() => setShowTypedInput(!showTypedInput)}
              className="text-[11px] text-[#A4C4BC] hover:text-[#E5FFC3] inline-flex items-center gap-1.5 transition"
            >
              <Keyboard className="w-3 h-3" />
              <span>{showTypedInput ? 'Hide keyboard input' : 'Type command instead'}</span>
            </button>

            {showTypedInput && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processCommand(typedCommand);
                  setTypedCommand('');
                }}
                className="flex gap-2 mt-2 w-full max-w-sm mx-auto"
              >
                <input
                  type="text"
                  value={typedCommand}
                  onChange={(e) => setTypedCommand(e.target.value)}
                  placeholder="e.g. Send 0.1 ETH to Rahul"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-white/30 focus:border-[#F6851B] outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#F6851B] text-black font-bold text-xs hover:brightness-110"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 4. Four Primary Action Buttons (MetaMask Squircles) */}
        <div className="grid grid-cols-4 gap-2 px-6 py-4">
          <button
            onClick={() => {
              setPendingAmount(0.1);
              setPendingContact('Amma');
              setIsModalOpen(true);
            }}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex flex-col items-center gap-1.5 transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F6851B]/20 text-[#F6851B] flex items-center justify-center group-hover:scale-110 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Send</span>
          </button>

          <button
            onClick={handleCopyAddress}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex flex-col items-center gap-1.5 transition group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2EC08B]/20 text-[#2EC08B] flex items-center justify-center group-hover:scale-110 transition">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Receive</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'activity' ? 'tokens' : 'activity')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition group active:scale-95 ${
              activeTab === 'activity'
                ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Activity</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'guardians' ? 'tokens' : 'guardians')}
            className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition group active:scale-95 ${
              activeTab === 'guardians'
                ? 'bg-[#A855F7]/20 border-[#A855F7]/50'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06]'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 text-[#A855F7] flex items-center justify-center group-hover:scale-110 transition">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Guardians</span>
          </button>
        </div>

        {/* 5. Sub-Views: Tokens, Activity, or Guardians */}
        <div className="px-6 pb-6 pt-2">
          {activeTab === 'tokens' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A4C4BC] font-semibold px-2 pb-1">
                <span>Asset</span>
                <span>Balance</span>
              </div>

              {/* Ethereum Asset Row */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] flex items-center justify-between transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#627EEA]/20 border border-[#627EEA]/30 flex items-center justify-center text-[#627EEA] font-black text-sm">
                    Ξ
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Ethereum</h5>
                    <span className="text-xs text-[#A4C4BC]">Sepolia Testnet</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-white text-sm tabular-nums block">{balance.toFixed(4)} ETH</span>
                  <span className="text-xs text-white/40">≈ ${(balance * 3368.2).toFixed(2)} USD</span>
                </div>
              </div>

              {/* USDC Asset Row */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] flex items-center justify-between transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2775CA]/20 border border-[#2775CA]/30 flex items-center justify-center text-[#2775CA] font-black text-sm">
                    $
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">USD Coin</h5>
                    <span className="text-xs text-[#A4C4BC]">Testnet USDC</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-white text-sm tabular-nums block">1,500.00 USDC</span>
                  <span className="text-xs text-white/40">≈ $1,500.00 USD</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#A4C4BC] font-semibold px-2 pb-1">
                <span>Recent Transactions</span>
                <button onClick={() => setActiveTab('tokens')} className="text-[#E5FFC3] hover:underline">
                  Back to Tokens
                </button>
              </div>

              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#2EC08B]/20 text-[#2EC08B] flex items-center justify-center font-bold text-xs">
                      {tx.isCredit ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{tx.desc}</p>
                      <span className="text-[10px] text-[#A4C4BC]">{tx.time}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-[#E5FFC3] tabular-nums">{tx.amount}</span>
                    <span className="block text-[10px] text-[#2EC08B] font-medium">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guardians' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#A4C4BC] font-semibold px-2 pb-1">
                <span>2-of-3 Guardians Recovery</span>
                <button onClick={() => setActiveTab('tokens')} className="text-[#E5FFC3] hover:underline">
                  Back
                </button>
              </div>

              {[
                { name: 'Guardian 1: Rahul (Brother)', state: 'Verified' },
                { name: 'Guardian 2: Zaid (Friend)', state: 'Standby' },
                { name: 'Guardian 3: Fatima (Lawyer)', state: 'Verified' },
              ].map((g) => (
                <div key={g.name} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#F6851B]" />
                    <span className="font-semibold text-white">{g.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#2EC08B]/20 text-[#2EC08B] font-bold text-[10px]">
                    {g.state}
                  </span>
                </div>
              ))}

              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-red-200">Emergency Veto: Stop unauthorized recovery</span>
                <button
                  onClick={() => {
                    audioCues.playWarning();
                    const alertMsg = 'Emergency Veto Executed! Unauthorized recovery cancelled.';
                    onAnnounce('', alertMsg);
                    speakText(alertMsg, lang);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] shrink-0"
                >
                  Cancel Recovery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Biometric Verification Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        amount={pendingAmount}
        contact={pendingContact}
        lang={lang}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </div>
  );
};
