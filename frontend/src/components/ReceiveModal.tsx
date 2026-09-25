import React, { useState } from 'react';
import { QrCode, Copy, Check, Volume2, Share2, ArrowDownLeft } from 'lucide-react';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

interface ReceiveModalProps {
  isOpen: boolean;
  address: string;
  userName: string;
  currentLang: SupportedLanguage;
  onClose: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  address,
  userName,
  currentLang,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    audioCues.playSuccess();
    speakText('Wallet address copied to clipboard.', currentLang);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReadAloud = () => {
    audioCues.playIntentRecognized();
    const ending = address.slice(-4);
    const speech = `Your Sepolia testnet address belongs to ${userName}, ending in ${ending.split('').join(' ')}. Ready to receive test funds.`;
    speakText(speech, currentLang);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040404]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[rgba(19,80,91,0.2)] text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d7d9ce]/60 mb-5">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-2xl bg-[#119da4]/15 text-[#119da4] flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0c7489]">
                Account Abstraction
              </span>
              <h2 id="receive-title" className="text-lg font-black text-[#040404] font-display">
                Receive Crypto
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#d7d9ce]/40 hover:bg-[#d7d9ce] text-[#040404] flex items-center justify-center text-sm font-bold transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* QR Code Container with High-Contrast Framing */}
        <div className="bg-[#d7d9ce]/25 p-6 rounded-2xl border-2 border-[#d7d9ce] inline-block shadow-inner mx-auto mb-4">
          <div className="w-48 h-48 bg-white p-3 rounded-xl border border-slate-300 flex flex-col items-center justify-center relative shadow-sm">
            <svg viewBox="0 0 100 100" className="w-full h-full text-[#040404] fill-current">
              <rect x="0" y="0" width="30" height="30" rx="4" />
              <rect x="70" y="0" width="30" height="30" rx="4" />
              <rect x="0" y="70" width="30" height="30" rx="4" />
              <rect x="6" y="6" width="18" height="18" fill="white" rx="2" />
              <rect x="76" y="6" width="18" height="18" fill="white" rx="2" />
              <rect x="6" y="76" width="18" height="18" fill="white" rx="2" />
              <rect x="10" y="10" width="10" height="10" rx="1" />
              <rect x="80" y="10" width="10" height="10" rx="1" />
              <rect x="10" y="80" width="10" height="10" rx="1" />
              <circle cx="45" cy="15" r="4" />
              <circle cx="55" cy="25" r="4" />
              <circle cx="45" cy="45" r="5" />
              <circle cx="55" cy="55" r="4" />
              <circle cx="20" cy="50" r="4" />
              <circle cx="80" cy="50" r="5" />
              <circle cx="50" cy="80" r="4" />
              <circle cx="75" cy="80" r="5" />
              <circle cx="85" cy="70" r="3" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-lg bg-[#119da4] text-white font-black text-xs flex items-center justify-center shadow-md">
                S
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#13505b] mt-2 block font-medium">
            Scan with any Sepolia testnet camera
          </span>
        </div>

        {/* Address Display Box */}
        <div className="p-3 bg-[#d7d9ce]/20 rounded-xl border border-[#d7d9ce] text-left mb-4">
          <div className="text-[11px] font-bold text-[#13505b] mb-1 uppercase tracking-wider">
            Your Sepolia Smart Account:
          </div>
          <div className="font-mono text-xs text-[#040404] break-all select-all font-semibold">
            {address}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleReadAloud}
            className="py-3 px-3 rounded-xl bg-[#d7d9ce]/40 hover:bg-[#d7d9ce] text-[#040404] text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-4 h-4 text-[#119da4]" />
            <span>Read Aloud</span>
          </button>

          <button
            onClick={handleCopy}
            className="py-3 px-3 rounded-xl btn-cyan text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
