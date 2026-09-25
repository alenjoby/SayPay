import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Shield,
  Copy,
  Check,
  Radio,
  Sliders,
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
  const [copied, setCopied] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0.1);
  const [pendingContact, setPendingContact] = useState<string>('Amma');

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
          onAnnounce('Microphone listening.');
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

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
    }, 1000);
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
          ? `आपका बैलेंस ${balance.toFixed(2)} सेपोलिया ETH है।`
          : detected === 'ar'
          ? `رصيدك هو ${balance.toFixed(2)} سيبوليا إيثيريوم.`
          : `Your balance is ${balance.toFixed(2)} Sepolia test Ether.`;
      onAnnounce(msg);
      speakText(msg, detected);
    } else if (result.intent === 'send') {
      const amt = result.amount || 0.1;
      const contact = result.contact || 'Amma';
      setPendingAmount(amt);
      setPendingContact(contact);
      setIsModalOpen(true);
      onAnnounce(`Send proposal: ${amt} ETH to ${contact}. Opening confirmation.`);
    } else {
      audioCues.playWarning();
      const msg = detected === 'hi' ? 'कमांड समझ नहीं आई।' : detected === 'ar' ? 'لم يتم التعرف على الأمر.' : 'Command not recognized.';
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
    onAnnounce('Smart Vault address copied.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransactionSuccess = (amount: number, contact: string) => {
    const newBal = Math.max(0, balance - amount);
    setBalance(newBal);
    onAnnounce(`Sent ${amount} ETH to ${contact}. New balance: ${newBal.toFixed(2)} ETH.`);
  };

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[360px] mx-auto">
      {/* Soft Ambient Shadow */}
      <div className="absolute inset-0 bg-[#00E575]/15 rounded-[3rem] blur-2xl -z-10" />

      {/* Trust Wallet Style Sleek Phone (Light inner UI, dark bezel) */}
      <div className="tw-phone p-3 text-slate-900 overflow-hidden relative">
        {/* Phone Speaker Notch */}
        <div className="w-20 h-3.5 bg-slate-900 rounded-full mx-auto mb-2" />

        {/* White Inner Phone Screen */}
        <div className="bg-white rounded-[2.25rem] p-5 shadow-inner">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#00E575] flex items-center justify-center font-bold text-slate-950 text-xs">
                S
              </div>
              <span className="font-bold text-xs text-slate-900">SayPay Vault</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E575]" />
            </div>

            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-900"
            >
              <span>0x71C8...4E92</span>
              {copied ? <Check className="w-3 h-3 text-[#00A850]" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {/* Balance Presentation */}
          <div className="py-4 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total Balance</span>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <h3 className="text-3xl font-black text-slate-900 tabular-nums tracking-tight">
                ${(balance * 3368.2).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs font-mono font-bold text-[#00A850]">
                {balance.toFixed(4)} ETH
              </span>
              <button
                onClick={handleReadBalance}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 transition"
                title="Read aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Circle Buttons (Trust Wallet exact style) */}
          <div className="grid grid-cols-4 gap-2 py-2">
            <button
              onClick={() => {
                setPendingAmount(0.1);
                setPendingContact('Amma');
                setIsModalOpen(true);
              }}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-11 h-11 rounded-full bg-[#00E575] hover:bg-[#00C853] text-slate-950 flex items-center justify-center shadow-sm transition">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Send</span>
            </button>

            <button
              onClick={handleCopyAddress}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Receive</span>
            </button>

            <button
              onClick={() => simulateVoiceInput('Show contacts')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Contacts</span>
            </button>

            <button
              onClick={() => simulateVoiceInput('Guardian recovery')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">Guardians</span>
            </button>
          </div>

          {/* Voice Action Card Inside Phone */}
          <div className="my-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <button
              onClick={handleToggleListening}
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition shadow-md ${
                isListening
                  ? 'bg-[#00E575] text-slate-950 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              aria-label="Tap to speak"
            >
              <Mic className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-bold text-slate-900 block mt-1.5 uppercase tracking-wider">
              {isListening ? 'Listening...' : 'Tap to Speak'}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {transcript ? `"${transcript}"` : '"Send 0.1 ETH to Amma"'}
            </p>
          </div>

          {/* Tokens List (Trust Wallet Style) */}
          <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
              <span>Asset</span>
              <span>Holdings</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#627EEA]/15 text-[#627EEA] flex items-center justify-center font-bold text-xs">
                  ETH
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Ethereum</p>
                  <span className="text-[10px] text-slate-400">Sepolia Testnet</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 tabular-nums">{balance.toFixed(4)} ETH</p>
                <span className="text-[10px] text-slate-400">≈ ${(balance * 3368.2).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2775CA]/15 text-[#2775CA] flex items-center justify-center font-bold text-xs">
                  USDC
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">USD Coin</p>
                  <span className="text-[10px] text-slate-400">Sepolia</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 tabular-nums">1,500.00 USDC</p>
                <span className="text-[10px] text-slate-400">≈ $1,500.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Home Bar */}
        <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
      </div>

      {/* Confirmation Modal */}
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
