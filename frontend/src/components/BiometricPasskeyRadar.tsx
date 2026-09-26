import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, Shield, KeyRound } from 'lucide-react';
import { audioCues } from '../utils/audioCues';

export const BiometricPasskeyRadar: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sampleHash, setSampleHash] = useState('0x7f9a...3b21');

  const handleTouchSensor = () => {
    if (isScanning) return;
    setIsScanning(true);
    setIsVerified(false);
    audioCues.playIntentRecognized();

    setTimeout(() => {
      setIsScanning(false);
      setIsVerified(true);
      audioCues.playSuccess();
      const randomHex = Array.from({ length: 8 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      setSampleHash(`0x${randomHex}...${Date.now().toString(16).slice(-4)}`);

      setTimeout(() => {
        setIsVerified(false);
      }, 4000);
    }, 1400);
  };

  return (
    <div className="w-full rounded-3xl bg-zinc-900 border border-zinc-800 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-[#FF5500]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Left information */}
      <div className="space-y-3 max-w-lg z-10 text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
          <KeyRound className="w-3.5 h-3.5" />
          <span>FIDO2 / WebAuthn Hardware Binding</span>
        </div>

        <h3 className="text-2xl font-black text-white tracking-tight font-display">
          Interactive Passkey Security Sandbox
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          Test the physical biometric touch signature in your browser. SayPay never accepts spoken
          passwords or voice biometrics, guaranteeing immunity from AI voice clones.
        </p>

        <div className="flex items-center gap-3 pt-2 text-xs font-mono text-zinc-400">
          <span>Enclave Signature:</span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[#FF5500] font-bold">
            {sampleHash}
          </span>
        </div>
      </div>

      {/* Right interactive biometric sensor pad */}
      <div className="flex flex-col items-center justify-center gap-3 z-10">
        <button
          onClick={handleTouchSensor}
          disabled={isScanning}
          className={`relative w-28 h-28 rounded-3xl border-2 transition-all flex flex-col items-center justify-center cursor-pointer group shadow-2xl ${
            isVerified
              ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-emerald-500/20'
              : isScanning
              ? 'bg-orange-950/60 border-[#FF5500] text-[#FF5500] shadow-orange-500/20'
              : 'bg-zinc-950 border-zinc-700 hover:border-[#FF5500] text-zinc-400 hover:text-white'
          }`}
          title="Click to simulate Passkey biometric touch"
        >
          {/* Animated radar rings when scanning */}
          {isScanning && (
            <div className="absolute inset-0 rounded-3xl border border-[#FF5500] animate-radar pointer-events-none" />
          )}

          {/* Animated vertical laser scan line */}
          {isScanning && (
            <div className="absolute left-2 right-2 h-0.5 bg-[#FF5500] shadow-lg shadow-orange-500 animate-laser pointer-events-none" />
          )}

          {isVerified ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
          ) : (
            <Fingerprint className={`w-10 h-10 transition-transform ${isScanning ? 'scale-110' : 'group-hover:scale-105'}`} />
          )}

          <span className="text-[10px] font-mono font-bold mt-1.5 uppercase tracking-wider">
            {isVerified ? 'Verified' : isScanning ? 'Scanning...' : 'Touch Sensor'}
          </span>
        </button>

        <span className="text-[11px] text-zinc-500 font-mono">
          Click button to test hardware signing
        </span>
      </div>
    </div>
  );
};
