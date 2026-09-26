import React, { useState } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
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
    <AccessibleDialog
      onClose={onClose}
      aria-labelledby="receive-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200 text-center">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-9 h-9 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Account Abstraction
              </span>
              <h2 id="receive-title" className="text-lg font-black text-zinc-900 font-display">
                Receive Crypto
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center text-sm font-bold transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* QR Code Container with High-Contrast Framing */}
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 inline-block shadow-inner mx-auto mb-4">
          <div className="w-48 h-48 bg-white p-3 rounded-xl border border-zinc-200 flex flex-col items-center justify-center relative shadow-sm">
            <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-900 fill-current">
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
              <div className="w-9 h-9 rounded-lg bg-[#FF5500] text-white font-black text-xs flex items-center justify-center shadow-md">
                S
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 mt-2 block font-medium">
            Scan with any Sepolia testnet camera
          </span>
        </div>

        {/* Address Display Box */}
        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-left mb-4">
          <div className="text-[11px] font-bold text-zinc-500 mb-1 uppercase tracking-wider">
            Your Sepolia Smart Account:
          </div>
          <div className="font-mono text-xs text-zinc-900 break-all select-all font-semibold">
            {address}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleReadAloud}
            className="py-3 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-4 h-4 text-[#FF5500]" />
            <span>Read Aloud</span>
          </button>

          <button
            onClick={handleCopy}
            className="py-3 px-3 rounded-xl btn-orange text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Address'}</span>
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
};
