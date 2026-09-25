import React, { useState } from 'react';
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
  const [local, setLocal] = useState<AccessibilitySettings>(settings);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                WCAG AAA Preferences
              </span>
              <h2 id="accessibility-settings-title" className="text-xl font-black text-zinc-950 font-display">
                Accessibility Controls
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

        {/* Scrollable Settings Options */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 py-4 text-xs">
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

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestSpeech}
              className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Test Audio</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-900 text-xs font-semibold transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl btn-orange text-white text-xs font-black transition shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
