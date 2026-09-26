import React, { useState } from 'react';
import { CreditCard, Shield, Clock, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';

interface SmartCardPhoneMockupProps {
  lang: SupportedLanguage;
  onAnnounce: (polite: string, alert?: string) => void;
}

export const SmartCardPhoneMockup: React.FC<SmartCardPhoneMockupProps> = ({ lang, onAnnounce }) => {
  const [vetoActive, setVetoActive] = useState<boolean>(false);

  const handleTriggerVeto = () => {
    setVetoActive(true);
    audioCues.playWarning();
    const alertMsg =
      lang === 'hi'
        ? 'आपातकालीन वीटो सक्रिय हुआ! अनधिकृत रिकवरी रद्द कर दी गई।'
        : lang === 'ar'
        ? 'تم تفعيل حق النقض الفوري! تم إلغاء الاسترداد غير المصرح به.'
        : 'Emergency Veto Executed! Unauthorized recovery cancelled.';
    onAnnounce('', alertMsg);
    speakText(alertMsg, lang);
    setTimeout(() => setVetoActive(false), 3000);
  };

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[360px] mx-auto z-20">
      {/* Phone Mockup Frame (MetaMask Image 4 style) */}
      <div className="phone-mockup rounded-[3rem] p-4 text-white overflow-hidden relative shadow-[0_30px_90px_rgba(0,0,0,0.85)]">
        {/* Phone Notch */}
        <div className="w-24 h-4 bg-[#141b1d] rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Smart Vault Card</span>
          </div>
          <CreditCard className="w-4 h-4 text-[#A4C4BC]" />
        </div>

        {/* 3D Virtual Debit Card */}
        <div className="relative mt-4 p-5 rounded-2xl bg-gradient-to-tr from-[#31114d] via-[#F6851B]/80 to-[#E2761B] shadow-2xl border border-white/20 overflow-hidden">
          {/* Card Chip & Network */}
          <div className="flex items-center justify-between">
            <div className="w-9 h-7 rounded-md bg-amber-200/90 border border-amber-300 shadow flex items-center justify-center">
              <div className="w-5 h-4 border border-amber-600/40 rounded-sm" />
            </div>
            <span className="font-extrabold tracking-wider text-xs font-mono text-white/90">SAYPAY VAULT</span>
          </div>

          <div className="my-5">
            <span className="text-[11px] uppercase tracking-wider text-white/70 block">Available Balance</span>
            <span className="text-2xl font-black text-white tabular-nums">$8,420.50</span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-white/80">
            <span>•••• 4E92</span>
            <span>EXP 09/30</span>
          </div>
        </div>

        {/* Two Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => {
              audioCues.playSuccess();
              onAnnounce('Adding testnet funds');
            }}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs text-white transition"
          >
            Add Funds
          </button>
          <button
            onClick={() => {
              audioCues.playSuccess();
              onAnnounce('Changing active vault asset');
            }}
            className="py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs text-white transition"
          >
            Change Asset
          </button>
        </div>

        {/* Settings / Security List (Image 4 style) */}
        <div className="mt-5 space-y-2 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-[#F6851B]" />
              <div>
                <p className="font-bold text-white">Social Guardians</p>
                <span className="text-[10px] text-[#A4C4BC]">2 of 3 Verified</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#2EC08B]/20 text-[#2EC08B] font-bold text-[10px]">
              Active
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#E5FFC3]" />
              <div>
                <p className="font-bold text-white">Inheritance Timer</p>
                <span className="text-[10px] text-[#A4C4BC]">2-Minute Demo Watch</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#E5FFC3]">Safe</span>
          </div>

          {/* Emergency Veto Button */}
          <button
            onClick={handleTriggerVeto}
            className={`w-full p-3 rounded-xl flex items-center justify-between transition ${
              vetoActive
                ? 'bg-red-600 text-white font-bold'
                : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="font-bold text-xs">
                {vetoActive ? 'Recovery Cancelled!' : 'Emergency Veto Protection'}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Home Indicator bar */}
        <div className="w-28 h-1 bg-white/30 rounded-full mx-auto mt-4" />
      </div>
    </div>
  );
};
