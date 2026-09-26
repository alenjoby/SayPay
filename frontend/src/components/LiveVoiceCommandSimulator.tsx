import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  ShieldCheck,
  Play,
  Fingerprint,
  Radio,
  Terminal,
  Activity,
} from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';

interface CommandScenario {
  id: string;
  tabLabel: string;
  command: string;
  lang: SupportedLanguage;
  langLabel: string;
  intent: string;
  entities: { label: string; value: string }[];
  resultSpeech: string;
  executionStatus: string;
  category: string;
}

const SCENARIOS: CommandScenario[] = [
  {
    id: 'send',
    tabLabel: 'Send ETH',
    command: 'Send 0.1 ETH to Amma',
    lang: 'en',
    langLabel: 'English',
    intent: 'TRANSFER_FUNDS',
    entities: [
      { label: 'Action', value: 'Send' },
      { label: 'Amount', value: '0.10 Sepolia ETH' },
      { label: 'Recipient', value: 'Amma (0x71C8...4E92)' },
    ],
    resultSpeech: 'Sending 0.1 ETH to Amma. Touch your fingerprint sensor to sign.',
    executionStatus: 'Biometric Passkey Verified on Sepolia',
    category: 'Transfer',
  },
  {
    id: 'balance',
    tabLabel: 'Check Balance',
    command: 'What is my total balance?',
    lang: 'en',
    langLabel: 'English',
    intent: 'QUERY_BALANCE',
    entities: [
      { label: 'Action', value: 'Balance Inquiry' },
      { label: 'Output', value: 'Spoken Audio + Screen Reader' },
      { label: 'Network', value: 'Sepolia Testnet' },
    ],
    resultSpeech: 'Your total balance is 3,482 dollars and 50 cents, including 1.25 Ethereum.',
    executionStatus: 'Read Aloud Privately via Audio Stream',
    category: 'Inquiry',
  },
  {
    id: 'privacy',
    tabLabel: 'Privacy Shield',
    command: 'Turn on privacy mode',
    lang: 'en',
    langLabel: 'English',
    intent: 'SCREEN_CURTAIN_ACTIVATE',
    entities: [
      { label: 'Security', value: 'Anti-Shoulder Surfing' },
      { label: 'Display', value: 'Blackout Screen Curtain' },
      { label: 'Voice Audio', value: 'Fully Active' },
    ],
    resultSpeech: 'Privacy mode enabled. Screen is blacked out. Voice navigation remains active.',
    executionStatus: 'Screen Curtain Armed and Active',
    category: 'Security',
  },
  {
    id: 'faucet',
    tabLabel: 'Deposit Cash',
    command: 'Add cash 1 ETH',
    lang: 'en',
    langLabel: 'English',
    intent: 'FAUCET_DEPOSIT',
    entities: [
      { label: 'Action', value: 'Deposit Mock Funds' },
      { label: 'Amount', value: '1.00 Sepolia ETH' },
      { label: 'Gas Fee', value: 'Sponsored by Paymaster' },
    ],
    resultSpeech: 'Deposited 1.0 test ETH into your smart vault successfully.',
    executionStatus: 'Gas Sponsored by Paymaster',
    category: 'Funding',
  },
  {
    id: 'hindi_send',
    tabLabel: 'अम्मा को भेजो',
    command: 'अम्मा को 0.5 ईथर भेजो',
    lang: 'hi',
    langLabel: 'हिंदी (Hindi)',
    intent: 'TRANSFER_FUNDS_HI',
    entities: [
      { label: 'क्रिया', value: 'रकम भेजना' },
      { label: 'राशि', value: '0.50 ईथर' },
      { label: 'प्राप्तकर्ता', value: 'अम्मा (सहेजा गया संपर्क)' },
    ],
    resultSpeech: 'अम्मा को 0.5 ईथर भेजा जा रहा है। कृपया बायोमेट्रिक पासकी से पुष्टि करें।',
    executionStatus: 'बायोमेट्रिक पासकी द्वारा हस्ताक्षरित',
    category: 'बहुभाषी वॉइस',
  },
];

export const LiveVoiceCommandSimulator: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [stepStage, setStepStage] = useState<'listening' | 'parsed' | 'verified'>('listening');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const activeScenario = SCENARIOS[currentIndex];

  // Typewriter effect
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const fullText = activeScenario.command;

    if (isTyping) {
      if (displayedText.length < fullText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, 45);
      } else {
        setIsTyping(false);
        setStepStage('parsed');
        timeout = setTimeout(() => {
          setStepStage('verified');
        }, 1100);
      }
    } else {
      timeout = setTimeout(() => {
        setIsTyping(true);
        setStepStage('listening');
        setDisplayedText('');
        setCurrentIndex((prev) => (prev + 1) % SCENARIOS.length);
      }, 5500);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, currentIndex]);

  const selectScenario = (index: number) => {
    if (currentIndex === index) return;
    setCurrentIndex(index);
    setDisplayedText('');
    setIsTyping(true);
    setStepStage('listening');
    if (audioCues) audioCues.playIntentRecognized();
  };

  const handleTestListen = (scenario: CommandScenario) => {
    setIsPlayingAudio(true);
    audioCues.playIntentRecognized();
    setTimeout(() => {
      speakText(scenario.resultSpeech, scenario.lang);
      setTimeout(() => {
        audioCues.playSuccess();
        setIsPlayingAudio(false);
      }, 2600);
    }, 300);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-[#09090B] text-white border border-zinc-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden text-left">
      {/* Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-bold shadow-md">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#FF5500] font-bold">
                SayPay NLU Telemetry
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight font-display">
              Natural Speech to Smart Contract Pipeline
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
            LATENCY: 14ms
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            CONFIDENCE: 99.4%
          </span>
        </div>
      </div>

      {/* Interactive Scenario Tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SCENARIOS.map((sc, idx) => (
          <button
            key={sc.id}
            onClick={() => selectScenario(idx)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              currentIndex === idx
                ? 'bg-[#FF5500] text-white shadow-md shadow-orange-500/25'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>{sc.tabLabel}</span>
            <span className="text-[10px] opacity-75 font-mono">({sc.langLabel.split(' ')[0]})</span>
          </button>
        ))}
      </div>

      {/* Acoustic Input Deck */}
      <div className="mt-5 p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5500] text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-[#FF5500]" />
              <span>Speech Recognition Audio Stream</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 font-display mt-0.5 truncate">
              <span>"{displayedText}"</span>
              <span className="inline-block w-2 h-6 bg-[#FF5500] animate-pulse shrink-0" />
            </div>
          </div>
        </div>

        {/* Clean Monochrome Audio Spectrum Equalizer */}
        <div className="flex items-end gap-1 h-9 px-4 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 self-start md:self-auto shrink-0">
          <div className="w-1 bg-[#FF5500] rounded-full wave-1" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-2" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-3" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-4" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-5" />
          <div className="w-1 bg-orange-400 rounded-full wave-2" />
          <div className="w-1 bg-orange-400 rounded-full wave-4" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-1" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-3" />
          <div className="w-1 bg-[#FF5500] rounded-full wave-5" />
        </div>
      </div>

      {/* 3-Stage Hardware Execution Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5">
        {/* Stage 1: Entity Parsing */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            stepStage === 'listening'
              ? 'bg-zinc-900 border-[#FF5500] shadow-sm shadow-orange-500/10'
              : 'bg-zinc-900/50 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2 font-mono">
            <span>01. ENTITY PARSING</span>
            <Volume2 className="w-4 h-4 text-[#FF5500]" />
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            {activeScenario.entities.map((ent, i) => (
              <div key={i} className="flex items-center justify-between text-zinc-300">
                <span className="text-zinc-500">{ent.label}:</span>
                <span className="font-bold text-white truncate max-w-[150px]">{ent.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage 2: Audio Readout & Confirmation */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            stepStage === 'parsed'
              ? 'bg-zinc-900 border-orange-500 shadow-sm shadow-orange-500/10'
              : 'bg-zinc-900/50 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2 font-mono">
            <span>02. AUDIO VERIFICATION</span>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed font-sans">
            "{activeScenario.resultSpeech}"
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-500">
            Dual ARIA live region + acoustic earcon chime
          </div>
        </div>

        {/* Stage 3: Biometric Cryptographic Sign */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            stepStage === 'verified'
              ? 'bg-emerald-950/30 border-emerald-500/70 shadow-sm shadow-emerald-500/10'
              : 'bg-zinc-900/50 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2 font-mono">
            <span>03. HARDWARE PASSKEY</span>
            <Fingerprint className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-emerald-300 font-bold leading-snug">
            {activeScenario.executionStatus}
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-500">
            WebAuthn Secp256r1 UserOp on Sepolia
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-zinc-800 text-xs">
        <div className="flex items-center gap-2 text-zinc-400 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero private keys exposed. Physical passkey authentication required.</span>
        </div>

        <button
          onClick={() => handleTestListen(activeScenario)}
          disabled={isPlayingAudio}
          className="px-5 py-2.5 rounded-full btn-orange text-white font-bold text-xs inline-flex items-center gap-2 transition hover:scale-105 cursor-pointer disabled:opacity-50 shadow-md"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isPlayingAudio ? 'Speaking Aloud...' : 'Play Spoken Feedback'}</span>
        </button>
      </div>
    </div>
  );
};
