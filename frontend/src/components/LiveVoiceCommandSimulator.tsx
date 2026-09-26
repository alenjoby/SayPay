import React, { useState, useEffect } from 'react';
import { Mic, Volume2, ShieldCheck, CheckCircle2, Sparkles, Play, Fingerprint } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText } from '../utils/i18n';

interface CommandScenario {
  id: string;
  command: string;
  lang: 'en' | 'hi' | 'ar';
  langLabel: string;
  intent: string;
  resultSpeech: string;
  executionStatus: string;
  category: string;
}

const SCENARIOS: CommandScenario[] = [
  {
    id: 'send',
    command: 'Send 0.1 ETH to Amma',
    lang: 'en',
    langLabel: 'English',
    intent: 'Transfer 0.1 Sepolia ETH to Amma (0x71C8...4E92)',
    resultSpeech: 'Sending 0.1 ETH to Amma. Touch your fingerprint sensor to sign.',
    executionStatus: 'Biometric Passkey Verified on Sepolia',
    category: 'Instant Payment',
  },
  {
    id: 'balance',
    command: 'What is my total balance?',
    lang: 'en',
    langLabel: 'English',
    intent: 'Query live portfolio valuation and ETH balance',
    resultSpeech: 'Your total balance is 3,482 dollars and 50 cents, including 1.25 Ethereum.',
    executionStatus: 'Spoken Privately via Earphones',
    category: 'Balance Inquiry',
  },
  {
    id: 'privacy',
    command: 'Turn on privacy mode',
    lang: 'en',
    langLabel: 'English',
    intent: 'Activate Anti-Shoulder Surfing Screen Curtain',
    resultSpeech: 'Privacy mode enabled. Screen is blacked out. Voice navigation remains active.',
    executionStatus: 'Display Blackout Armed',
    category: 'Stealth Protection',
  },
  {
    id: 'faucet',
    command: 'Add cash 1 ETH',
    lang: 'en',
    langLabel: 'English',
    intent: 'Claim 1.0 Sepolia ETH from smart faucet',
    resultSpeech: 'Deposited 1.0 test ETH into your smart vault successfully.',
    executionStatus: 'Gas Sponsored by Paymaster',
    category: 'Instant Funding',
  },
  {
    id: 'hindi_send',
    command: 'अम्मा को 0.5 ईथर भेजो',
    lang: 'hi',
    langLabel: 'हिंदी (Hindi)',
    intent: 'Amma ko 0.5 ETH ka bhugtan',
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
        }, 60);
      } else {
        setIsTyping(false);
        setStepStage('parsed');
        timeout = setTimeout(() => {
          setStepStage('verified');
        }, 1200);
      }
    } else {
      timeout = setTimeout(() => {
        // Next scenario
        setIsTyping(true);
        setStepStage('listening');
        setDisplayedText('');
        setCurrentIndex((prev) => (prev + 1) % SCENARIOS.length);
      }, 5500);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, currentIndex]);

  const handleTestListen = (scenario: CommandScenario) => {
    setIsPlayingAudio(true);
    audioCues.playIntentRecognized();
    setTimeout(() => {
      speakText(scenario.resultSpeech, scenario.lang);
      setTimeout(() => {
        audioCues.playSuccess();
        setIsPlayingAudio(false);
      }, 2400);
    }, 400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-zinc-950 text-white border border-zinc-800/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#FF5500]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/70 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5500] text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-orange-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                Interactive Voice Engine Simulation
              </span>
              <span className="text-sm font-bold text-white">
                Live Natural Speech to Smart Contract Action
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              Category: <strong className="text-zinc-200">{activeScenario.category}</strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#FF5500]/20 text-[#FF5500] font-bold">
              {activeScenario.langLabel}
            </span>
          </div>
        </div>

        {/* Live Spoken Input Box with Simulated Waveform */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-[#FF5500] text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Mic className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-2xl border border-[#FF5500] animate-radar pointer-events-none" />
            </div>

            <div className="flex-1">
              <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Recognized User Voice Input:
              </div>
              <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1 font-display">
                <span>"{displayedText}"</span>
                <span className="inline-block w-2 h-6 bg-[#FF5500] animate-pulse" />
              </div>
            </div>
          </div>

          {/* Equalizer bars */}
          <div className="flex items-end gap-1.5 h-8 px-4 py-1 rounded-xl bg-zinc-950 border border-zinc-800/80 self-start md:self-auto">
            <div className="w-1.5 bg-[#FF5500] rounded-full wave-1" />
            <div className="w-1.5 bg-[#FF5500] rounded-full wave-2" />
            <div className="w-1.5 bg-orange-400 rounded-full wave-3" />
            <div className="w-1.5 bg-blue-400 rounded-full wave-4" />
            <div className="w-1.5 bg-emerald-400 rounded-full wave-5" />
          </div>
        </div>

        {/* Step Progression Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Step 1: Acoustic Parsing */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              stepStage === 'listening'
                ? 'bg-zinc-900 border-[#FF5500]/60 ring-1 ring-[#FF5500]/30'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1">
              <span>1. Speech Parsing</span>
              <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
            </div>
            <div className="text-xs text-zinc-200 font-mono truncate">{activeScenario.intent}</div>
          </div>

          {/* Step 2: Intent Validation */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              stepStage === 'parsed'
                ? 'bg-zinc-900 border-blue-500/60 ring-1 ring-blue-500/30'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1">
              <span>2. Audio Confirmation</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xs text-zinc-200 font-mono truncate">Earcon Chime + Readout</div>
          </div>

          {/* Step 3: Hardware Verification */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${
              stepStage === 'verified'
                ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                : 'bg-zinc-900/60 border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1">
              <span>3. Cryptographic Execution</span>
              <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xs text-emerald-300 font-bold truncate">
              {activeScenario.executionStatus}
            </div>
          </div>
        </div>

        {/* Quick Interaction Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>AI never signs transactions without hardware biometric touch.</span>
          </div>

          <button
            onClick={() => handleTestListen(activeScenario)}
            disabled={isPlayingAudio}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold inline-flex items-center gap-2 transition hover:scale-105 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>{isPlayingAudio ? 'Speaking aloud...' : 'Hear Audio Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
