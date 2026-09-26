import React, { useState } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
import {
  Sliders,
  Volume2,
  VolumeX,
  Mic,
  Eye,
  Type,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Check,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  Clock,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';

export interface AccessibilitySettings {
  autoReadAloud: boolean;
  earconsEnabled: boolean;
  highContrast: boolean;
  fontSize: 'standard' | 'large' | 'extra_large';
  speechRate: number;
  spokenLanguage: SupportedLanguage;
  hapticFeedback: boolean;
  spacebarHotkey: boolean;
}

export interface DigitalInheritanceConfig {
  enabled: boolean;
  beneficiaryName: string;
  beneficiaryAddress: string;
  inactivityMonths: number;
  guardianThreshold: number;
  status: 'active' | 'inactive';
}

interface AccessibilitySettingsModalProps {
  isOpen: boolean;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: AccessibilitySettings) => void;
  onClose: () => void;
}

export const AccessibilitySettingsModal: React.FC<AccessibilitySettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'accessibility' | 'inheritance'>('accessibility');
  const [local, setLocal] = useState<AccessibilitySettings>(settings);
  const [inheritance, setInheritance] = useState<DigitalInheritanceConfig>(() => {
    const saved = localStorage.getItem('saypay_inheritance_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      enabled: true,
      beneficiaryName: 'Priya (Sister)',
      beneficiaryAddress: '0x3A9F6370B3428987d65609B53580554288D105d1',
      inactivityMonths: 12,
      guardianThreshold: 2,
      status: 'active',
    };
  });

  if (!isOpen) return null;

  const handleChange = <K extends keyof AccessibilitySettings>(
    key: K,
    val: AccessibilitySettings[K]
  ) => {
    const updated = { ...local, [key]: val };
    setLocal(updated);
    onUpdateSettings(updated);

    if (key === 'earconsEnabled') {
      audioCues.setSoundEnabled(val as boolean);
      if (val) audioCues.playSuccess();
    } else {
      audioCues.playIntentRecognized();
    }
  };

  const handleTestSpeech = () => {
    audioCues.playSuccess();
    const testPhrase =
      local.spokenLanguage === 'hi'
        ? 'यह से-पे वॉइस टेस्ट है। आपकी एक्सेसिबिलिटी सेटिंग्स सक्रिय हैं।'
        : local.spokenLanguage === 'ar'
        ? 'هذا اختبار صوتي لسي-باي. تم تفعيل إعدادات سهولة الوصول الخاصة بك.'
        : 'This is a SayPay voice test. Your accessibility settings are active.';
    speakText(testPhrase, local.spokenLanguage);
  };

  const handleResetDefaults = () => {
    audioCues.playWarning();
    const defaults: AccessibilitySettings = {
      autoReadAloud: true,
      earconsEnabled: true,
      highContrast: true,
      fontSize: 'large',
      speechRate: 0.95,
      spokenLanguage: 'en',
      hapticFeedback: true,
      spacebarHotkey: true,
    };
    setLocal(defaults);
    onUpdateSettings(defaults);
    speakText('Accessibility settings restored to high-accessibility defaults.', 'en');
  };

  return (
    <AccessibleDialog
      onClose={onClose}
      aria-labelledby="accessibility-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Vault Preferences & Estate Plan
              </span>
              <h2 id="accessibility-settings-title" className="text-xl font-black text-zinc-950 font-display">
                Settings & Inheritance
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center text-sm font-bold transition cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-3 p-1 rounded-2xl bg-zinc-100 border border-zinc-200 shrink-0">
          <button
            onClick={() => {
              audioCues.playIntentRecognized();
              setActiveTab('accessibility');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'accessibility'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>WCAG Accessibility</span>
          </button>
          <button
            onClick={() => {
              audioCues.playIntentRecognized();
              setActiveTab('inheritance');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'inheritance'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Digital Inheritance</span>
          </button>
        </div>

        {/* Scrollable Settings Options */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-4 text-xs">
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
          {/* Group 1: Voice & Sound */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Voice & Auditory Feedback</span>
            </h3>

            {/* Toggle 1: Auto-Read Aloud */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] transition">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 block">
                  Automatic Verbal Read-Out
                </span>
                <span className="text-zinc-500 text-[11px] block mt-0.5">
                  Automatically speaks balances and transaction progress on screen load.
                </span>
              </div>
              <button
                role="switch"
                aria-checked={local.autoReadAloud}
                onClick={() => handleChange('autoReadAloud', !local.autoReadAloud)}
                className={`w-12 h-7 rounded-full p-1 transition ${
                  local.autoReadAloud ? 'bg-[#FF5500]' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition ${
                    local.autoReadAloud ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Earcon Audio Chimes */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] transition">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 block">
                  Earcon Sound Chimes
                </span>
                <span className="text-zinc-500 text-[11px] block mt-0.5">
                  Distinct frequencies for listening start, command success, incoming funds, and alerts.
                </span>
              </div>
              <button
                role="switch"
                aria-checked={local.earconsEnabled}
                onClick={() => handleChange('earconsEnabled', !local.earconsEnabled)}
                className={`w-12 h-7 rounded-full p-1 transition ${
                  local.earconsEnabled ? 'bg-[#FF5500]' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition ${
                    local.earconsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Speech Rate Slider */}
            <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-zinc-900">Speech Rate</span>
                <span className="font-mono text-xs font-bold text-[#FF5500]">
                  {local.speechRate}x ({local.speechRate < 1 ? 'Deliberate' : local.speechRate > 1 ? 'Fast' : 'Standard'})
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={local.speechRate}
                onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
                className="w-full accent-[#FF5500]"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-bold">
                <span>0.75x Slow</span>
                <span>1.0x Normal</span>
                <span>1.3x Fast</span>
              </div>
            </div>
          </div>

          {/* Group 2: Visual & Touch Controls */}
          <div className="space-y-3 pt-2">
            <h3 className="font-extrabold text-zinc-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Visual & Touch Accessibility</span>
            </h3>

            {/* Toggle 3: High Contrast Borders */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] transition">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 block">
                  High-Contrast Borders
                </span>
                <span className="text-zinc-500 text-[11px] block mt-0.5">
                  Enhances visibility of cards and buttons for low-vision users.
                </span>
              </div>
              <button
                role="switch"
                aria-checked={local.highContrast}
                onClick={() => handleChange('highContrast', !local.highContrast)}
                className={`w-12 h-7 rounded-full p-1 transition ${
                  local.highContrast ? 'bg-[#FF5500]' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition ${
                    local.highContrast ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Font Size Selector */}
            <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
              <span className="font-extrabold text-sm text-zinc-900 block">Typography Scaling</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', label: 'Standard', desc: '16px' },
                  { id: 'large', label: 'Large', desc: '18px (Recommended)' },
                  { id: 'extra_large', label: 'Extra Large', desc: '20px' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleChange('fontSize', s.id as any)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      local.fontSize === s.id
                        ? 'border-[#FF5500] bg-[#FF5500]/10 text-zinc-950 font-black shadow-sm'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="block text-xs font-bold">{s.label}</span>
                    <span className="block text-[10px] text-zinc-500 font-mono">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle 4: Desktop Spacebar Speech Hotkey */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] transition">
              <div>
                <span className="font-extrabold text-sm text-zinc-900 block">
                  Spacebar Voice Activation
                </span>
                <span className="text-zinc-500 text-[11px] block mt-0.5">
                  Hold or tap Spacebar from anywhere to speak without touching the mouse.
                </span>
              </div>
              <button
                role="switch"
                aria-checked={local.spacebarHotkey}
                onClick={() => handleChange('spacebarHotkey', !local.spacebarHotkey)}
                className={`w-12 h-7 rounded-full p-1 transition ${
                  local.spacebarHotkey ? 'bg-[#FF5500]' : 'bg-zinc-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition ${
                    local.spacebarHotkey ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL INHERITANCE PLAN (DEAD MAN'S SWITCH) */}
      {activeTab === 'inheritance' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
            <div className="flex items-center gap-2 text-xs font-black text-[#FF5500] uppercase tracking-wider mb-1">
              <HeartHandshake className="w-4 h-4" />
              <span>Smart Contract Digital Inheritance</span>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed">
              Designate a legal beneficiary to inherit your vault assets if your wallet becomes inactive. Inactivity is verified via Ethereum block timestamp and multi-guardian consensus.
            </p>
          </div>

          {/* Toggle Plan Enabled */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] transition">
            <div>
              <span className="font-extrabold text-sm text-zinc-900 block">
                Inheritance Protocol Active
              </span>
              <span className="text-zinc-500 text-[11px] block mt-0.5">
                When enabled, smart contract monitors vault inactivity.
              </span>
            </div>
            <button
              role="switch"
              aria-checked={inheritance.enabled}
              onClick={() => {
                const next = !inheritance.enabled;
                const updated = { ...inheritance, enabled: next };
                setInheritance(updated);
                localStorage.setItem('saypay_inheritance_config', JSON.stringify(updated));
                audioCues.playIntentRecognized();
                speakText(next ? 'Inheritance plan enabled.' : 'Inheritance plan paused.', local.spokenLanguage);
              }}
              className={`w-12 h-7 rounded-full p-1 transition cursor-pointer ${
                inheritance.enabled ? 'bg-[#FF5500]' : 'bg-zinc-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition ${
                  inheritance.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Beneficiary Name & Wallet Address (Smart Contract Payout Recipient) */}
          <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Beneficiary Wallet Designation</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                Primary Beneficiary
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                Beneficiary Name / Relationship:
              </label>
              <input
                type="text"
                value={inheritance.beneficiaryName}
                onChange={(e) => {
                  const updated = { ...inheritance, beneficiaryName: e.target.value };
                  setInheritance(updated);
                  localStorage.setItem('saypay_inheritance_config', JSON.stringify(updated));
                }}
                placeholder="e.g. Priya (Sister) or Family Trust"
                className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-[#FF5500] focus:bg-white transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-zinc-700">
                  Beneficiary Wallet Number / Address (0x EVM or ENS):
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) {
                        const updated = { ...inheritance, beneficiaryAddress: text.trim() };
                        setInheritance(updated);
                        localStorage.setItem('saypay_inheritance_config', JSON.stringify(updated));
                        audioCues.playSuccess();
                      }
                    } catch (e) {}
                  }}
                  className="text-[10px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                >
                  Paste from Clipboard
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={inheritance.beneficiaryAddress}
                  onChange={(e) => {
                    const updated = { ...inheritance, beneficiaryAddress: e.target.value.trim() };
                    setInheritance(updated);
                    localStorage.setItem('saypay_inheritance_config', JSON.stringify(updated));
                  }}
                  placeholder="0x71C8A904B8E42c5B2d1b82E72E77D34e8e194E92 or name.eth"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-[#FF5500] focus:bg-white transition pr-20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400">
                  {inheritance.beneficiaryAddress.length}/42
                </span>
              </div>

              {/* Real-time Address Validity Feedback */}
              <div className="mt-2 flex items-center gap-2">
                {inheritance.beneficiaryAddress.startsWith('0x') && inheritance.beneficiaryAddress.length === 42 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Valid EVM Hex Wallet Address</span>
                  </span>
                ) : inheritance.beneficiaryAddress.endsWith('.eth') ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3 text-blue-600" />
                    <span>Valid ENS Domain Handle</span>
                  </span>
                ) : !inheritance.beneficiaryAddress ? (
                  <span className="text-[10px] text-amber-600 font-semibold">
                    * Please specify a destination wallet number or address
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Must be a 42-character 0x address or .eth handle
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inactivity Threshold */}
          <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white space-y-2">
            <div className="font-extrabold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Inactivity Threshold (Dead-Man's Switch)</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Timer automatically resets to zero every time you sign a transaction or log into your vault.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[6, 12, 24].map((months) => (
                <button
                  key={months}
                  onClick={() => {
                    const updated = { ...inheritance, inactivityMonths: months };
                    setInheritance(updated);
                    localStorage.setItem('saypay_inheritance_config', JSON.stringify(updated));
                    audioCues.playIntentRecognized();
                    speakText(`${months} months inactivity threshold configured.`, local.spokenLanguage);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    inheritance.inactivityMonths === months
                      ? 'border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500] font-black'
                      : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 font-semibold'
                  }`}
                >
                  <div className="text-xs">{months} Months</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    {months === 12 ? 'Standard' : months === 6 ? 'Expedited' : 'Extended'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Guardian Consensus Requirement */}
          <div className="p-3.5 rounded-2xl border border-zinc-200 bg-white flex items-center justify-between">
            <div>
              <span className="font-extrabold text-xs text-zinc-900 block">
                Social Guardian Consensus
              </span>
              <span className="text-zinc-500 text-[11px] block mt-0.5">
                Requires 2 of 3 guardians to confirm probate before transfer.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-xs">
              2 / 3 Required
            </span>
          </div>

          {/* Liveness Health Monitor */}
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium">Vault Liveness Heartbeat:</span>
            <span className="text-emerald-700 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active (Last signed: Today)</span>
            </span>
          </div>
        </div>
      )}
    </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'accessibility' ? (
              <>
                <button
                  onClick={handleTestSpeech}
                  className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Test Audio</span>
                </button>

                <button
                  onClick={handleResetDefaults}
                  className="px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-900 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  audioCues.playSuccess();
                  const readText = `Digital Inheritance Plan is currently ${inheritance.enabled ? 'active' : 'paused'}. Beneficiary is ${inheritance.beneficiaryName}. Inactivity threshold is ${inheritance.inactivityMonths} months. Two of three guardians are required for consensus.`;
                  speakText(readText, local.spokenLanguage);
                }}
                className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Read Plan Aloud</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl btn-orange text-white text-xs font-black transition shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
};
