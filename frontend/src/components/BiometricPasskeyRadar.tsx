import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, Lock, Smartphone, Laptop } from 'lucide-react';
import { audioCues } from '../utils/audioCues';

export const BiometricPasskeyRadar: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [signatureHash, setSignatureHash] = useState('0x71c8...4e92');

  const handleTouchSensor = () => {
    if (isScanning) return;
    setIsScanning(true);
    setIsVerified(false);
    audioCues.playIntentRecognized();

    setTimeout(() => {
      setIsScanning(false);
      setIsVerified(true);
      audioCues.playSuccess();
      const randomHex = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setSignatureHash(`0x${randomHex}...${Date.now().toString(16).slice(-4)}`);

      setTimeout(() => {
        setIsVerified(false);
      }, 4500);
    }, 1200);
  };

  return (
    <div className="w-full rounded-3xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        {/* Left Information */}
        <div className="space-y-4 max-w-xl text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Hardware Enclave Security</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight font-display">
            Physical Touch Authorization
          </h3>

          <p className="text-sm text-zinc-600 leading-relaxed">
            Speech recognition parses intent and prepares transaction proposals, but funds can only
            be released by physical device biometric confirmation. Your cryptographic private keys
            never leave your phone's hardware secure element.
          </p>

          {/* Hardware Enclave Badges */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              Apple Secure Enclave
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              Android Titan M2
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <Laptop className="w-3.5 h-3.5 text-zinc-500" />
              Windows Hello TPM
            </span>
          </div>
        </div>

        {/* Right: Tactile Device Biometric Authenticator */}
        <div className="w-full lg:w-auto flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-50 border border-zinc-200/80 shadow-inner">
          <div className="text-center mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              WebAuthn Passkey Verification
            </span>
            <span className="text-xs text-zinc-700 font-medium">
              {isVerified
                ? 'Cryptographic Signature Verified'
                : isScanning
                ? 'Authenticating biometric touch...'
                : 'Click sensor below to test hardware signing'}
            </span>
          </div>

          {/* Tactile Sensor Ring */}
          <button
            onClick={handleTouchSensor}
            disabled={isScanning}
            className={`relative w-24 h-24 rounded-full border-2 transition-all flex flex-col items-center justify-center cursor-pointer group shadow-sm ${
              isVerified
                ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-emerald-500/20'
                : isScanning
                ? 'bg-orange-50 border-[#FF5500] text-[#FF5500] shadow-orange-500/20'
                : 'bg-white border-zinc-300 hover:border-[#FF5500] text-zinc-600 hover:text-[#FF5500] hover:shadow-md'
            }`}
            title="Click to simulate Passkey biometric touch"
          >
            {/* Animated radar ripple when scanning */}
            {isScanning && (
              <div className="absolute inset-0 rounded-full border border-[#FF5500] animate-radar pointer-events-none" />
            )}

            {isVerified ? (
              <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
            ) : (
              <Fingerprint
                className={`w-9 h-9 transition-transform ${
                  isScanning ? 'scale-110 text-[#FF5500]' : 'group-hover:scale-105'
                }`}
              />
            )}

            <span className="text-[10px] font-bold mt-1 font-mono tracking-tight">
              {isVerified ? 'VERIFIED' : isScanning ? 'SCANNING' : 'TOUCH'}
            </span>
          </button>

          {/* Live Signature Result */}
          <div className="mt-4 pt-3 border-t border-zinc-200/70 w-full flex items-center justify-between gap-3 text-[11px] font-mono text-zinc-600">
            <span>Enclave Signature:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-200 text-zinc-800'
              }`}
            >
              {signatureHash}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
