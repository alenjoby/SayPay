import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Shield,
  Sparkles,
  Flame,
  Check,
  Radio,
  ArrowRight,
  Accessibility,
  EyeOff,
  Cpu,
  HeartHandshake,
} from 'lucide-react';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { InteractiveWalletDemo } from './components/InteractiveWalletDemo';
import { audioCues } from './utils/audioCues';
import { SupportedLanguage, translations, speakText } from './utils/i18n';

export const App: React.FC = () => {
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('SayPay loaded.');
  const [alertAnnouncement, setAlertAnnouncement] = useState<string>('');

  const t = translations[lang];

  useEffect(() => {
    const isRtl = lang === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const handleAnnounce = (polite: string, alert?: string) => {
    setPoliteAnnouncement('');
    if (alert) setAlertAnnouncement('');

    setTimeout(() => {
      setPoliteAnnouncement(polite);
      if (alert) setAlertAnnouncement(alert);
    }, 100);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    audioCues.setSoundEnabled(next);
    if (next) audioCues.playSuccess();
    handleAnnounce(next ? 'Sound effects enabled' : 'Sound effects muted');
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLang(newLang);
    audioCues.playIntentRecognized();
    const welcome =
      newLang === 'hi'
        ? 'भाषा हिंदी पर सेट की गई।'
        : newLang === 'ar'
        ? 'تم تغيير اللغة إلى العربية.'
        : 'Language switched to English.';
    handleAnnounce(welcome);
    speakText(welcome, newLang);
  };

  return (
    <div className={`min-h-screen bg-[#030708] text-[#F8FAFC] flex flex-col relative overflow-x-hidden ${highContrast ? 'contrast-125' : ''}`}>
      {/* Accessible ARIA Live Announcer */}
      <LiveAnnouncer politeMessage={politeAnnouncement} alertMessage={alertAnnouncement} />

      {/* Luxury Radial Light Leaks (Exodus style) */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#F6851B]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[700px] h-[700px] bg-[#2EC08B]/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[500px] bg-[#8B5CF6]/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* 1. Floating Top Glass Navigation */}
      <header className="sticky top-4 z-40 max-w-5xl mx-auto w-full px-4">
        <div className="glass-panel-elevated px-5 py-3 rounded-full flex items-center justify-between gap-4 border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="#top" className="flex items-center gap-2.5 group outline-none" aria-label="SayPay Home">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F6851B] to-[#FF9F43] flex items-center justify-center shadow-lg shadow-[#F6851B]/30 group-hover:scale-105 transition">
                <Flame className="w-5 h-5 text-black" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-white">SayPay</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#E5FFC3]/20 text-[#E5FFC3] font-mono font-bold">
                    v1.0
                  </span>
                </div>
              </div>
            </a>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#E5FFC3]">
              <span className="w-2 h-2 rounded-full bg-[#2EC08B] animate-pulse" />
              <span>Sepolia Testnet</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center p-1 rounded-full bg-[#081214] border border-white/10 text-xs">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'en' ? 'bg-[#F6851B] text-black shadow-md' : 'text-[#A4C4BC] hover:text-white'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'hi' ? 'bg-[#F6851B] text-black shadow-md' : 'text-[#A4C4BC] hover:text-white'
                }`}
                aria-label="हिंदी में बदलें"
              >
                हिंदी
              </button>
              <button
                onClick={() => handleLanguageChange('ar')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'ar' ? 'bg-[#F6851B] text-black shadow-md' : 'text-[#A4C4BC] hover:text-white'
                }`}
                aria-label="التبديل إلى العربية"
              >
                العربية
              </button>
            </div>

            {/* Audio Earcon Toggle */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-full border transition active:scale-90 ${
                soundEnabled
                  ? 'bg-white/5 border-white/10 text-[#E5FFC3] hover:bg-white/10'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
              title={soundEnabled ? t.soundOn : t.soundOff}
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 pt-16 pb-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* SOUPS Research Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-[#E5FFC3] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#F6851B]" />
            <span>Backed by Zhou et al. (SOUPS 2023) Usability Research</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.05]">
            Crypto for Everyone.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5FFC3] via-[#F6851B] to-[#FF9F43]">
              Especially the Blind.
            </span>
          </h1>

          {/* Punchy Subhead */}
          <p className="text-base sm:text-lg text-[#A4C4BC] max-w-2xl mx-auto font-normal leading-relaxed">
            The world’s first voice-first, seedless smart wallet built for visually impaired users. Speak in English,
            Hindi, or Arabic—zero seed phrases, zero silent popups, zero hex addresses.
          </p>
        </div>

        {/* 3. The Interactive Device Showcase */}
        <InteractiveWalletDemo
          lang={lang}
          onLanguageChange={handleLanguageChange}
          onAnnounce={handleAnnounce}
        />

        {/* 4. Research Metrics (Clear, High-Impact, Minimalist) */}
        <section className="my-20" aria-labelledby="research-heading">
          <div className="text-center mb-10">
            <h2 id="research-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Why Existing Wallets Fail Blind Users
            </h2>
            <p className="text-xs sm:text-sm text-[#A4C4BC] mt-1.5">
              Empirical findings from MetaMask accessibility user trials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="glass-panel p-7 rounded-3xl border border-white/[0.08] text-center space-y-2">
              <span className="text-5xl font-black text-[#F6851B] tracking-tight block tabular-nums">
                +70%
              </span>
              <h3 className="font-bold text-white text-base">Longer Task Duration</h3>
              <p className="text-xs text-[#A4C4BC] leading-relaxed">
                Blind users required 47.9 minutes vs 28.2 minutes for sighted users to perform standard operations.
              </p>
            </div>

            <div className="glass-panel p-7 rounded-3xl border border-white/[0.08] text-center space-y-2">
              <span className="text-5xl font-black text-[#EF4444] tracking-tight block tabular-nums">
                0
              </span>
              <h3 className="font-bold text-white text-base">Voice Notifications</h3>
              <p className="text-xs text-[#A4C4BC] leading-relaxed">
                Critical transaction confirmation dialogs appeared silently on screen, causing missed approvals.
              </p>
            </div>

            <div className="glass-panel p-7 rounded-3xl border border-white/[0.08] text-center space-y-2">
              <span className="text-5xl font-black text-[#E5FFC3] tracking-tight block tabular-nums">
                12 Words
              </span>
              <h3 className="font-bold text-white text-base">Seed Phrase Barrier</h3>
              <p className="text-xs text-[#A4C4BC] leading-relaxed">
                Managing seed phrases through a screen reader was so exhausting that users skipped backups.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Four Core Pillars (Uncluttered Bento Grid) */}
        <section className="my-20" aria-labelledby="pillars-heading">
          <div className="text-center mb-10">
            <h2 id="pillars-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Built Different. Built Vocal.
            </h2>
            <p className="text-xs sm:text-sm text-[#A4C4BC] mt-1.5">Four architectural breakthroughs of SayPay</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pillar 1 */}
            <div className="glass-panel p-8 rounded-3xl space-y-3.5 border border-white/[0.08] hover:border-[#F6851B]/40 transition group">
              <div className="w-12 h-12 rounded-2xl bg-[#F6851B]/20 text-[#F6851B] flex items-center justify-center font-bold">
                <Mic className="w-6 h-6 group-hover:scale-110 transition" />
              </div>
              <h3 className="text-xl font-bold text-white">Multilingual Voice NLU</h3>
              <p className="text-sm text-[#A4C4BC] leading-relaxed">
                Understands natural, code-switched commands in English, Hindi/Hinglish, and Arabic. Automatically parses spoken numbers and recipient names.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="glass-panel p-8 rounded-3xl space-y-3.5 border border-white/[0.08] hover:border-[#2EC08B]/40 transition group">
              <div className="w-12 h-12 rounded-2xl bg-[#2EC08B]/20 text-[#2EC08B] flex items-center justify-center font-bold">
                <Shield className="w-6 h-6 group-hover:scale-110 transition" />
              </div>
              <h3 className="text-xl font-bold text-white">Seedless Social Vault</h3>
              <p className="text-sm text-[#A4C4BC] leading-relaxed">
                Zero 12-word seed phrases. Smart contract Account Abstraction with 2-of-3 guardian social recovery, inactivity dead-man's switch, and owner veto protection.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="glass-panel p-8 rounded-3xl space-y-3.5 border border-white/[0.08] hover:border-[#E5FFC3]/40 transition group">
              <div className="w-12 h-12 rounded-2xl bg-[#E5FFC3]/20 text-[#E5FFC3] flex items-center justify-center font-bold">
                <Volume2 className="w-6 h-6 group-hover:scale-110 transition" />
              </div>
              <h3 className="text-xl font-bold text-white">Zero Silent State Changes</h3>
              <p className="text-sm text-[#A4C4BC] leading-relaxed">
                Dual W3C ARIA live regions and distinct Web Audio earcons announce every balance change, transaction status, and security event verbally.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="glass-panel p-8 rounded-3xl space-y-3.5 border border-white/[0.08] hover:border-[#3B82F6]/40 transition group">
              <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/20 text-[#3B82F6] flex items-center justify-center font-bold">
                <HeartHandshake className="w-6 h-6 group-hover:scale-110 transition" />
              </div>
              <h3 className="text-xl font-bold text-white">Human Contact Book</h3>
              <p className="text-sm text-[#A4C4BC] leading-relaxed">
                Users never hear, type, or verify 42-character hexadecimal addresses. SayPay phonetically maps contact names like "Amma" directly on-device.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Security Assurance Strip */}
        <section className="my-16 glass-panel-elevated p-8 rounded-3xl border border-[#F6851B]/20 text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-[#F6851B]/20 text-[#F6851B] mb-1">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-white">The Core Security Guarantee</h3>
          <p className="text-sm text-[#A4C4BC] leading-relaxed">
            The AI model <strong className="text-white">never</strong> moves money autonomously. It only parses user intent and proposes a structured action. Every transaction requires physical device biometric approval (Passkey / Fingerprint).
          </p>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-white/[0.08] bg-[#020506] py-8 px-4 text-xs text-[#A4C4BC]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#F6851B]" />
            <span className="font-bold text-white">SayPay</span>
            <span>— Inclusive Voice-First Web3 Smart Vault</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>WCAG AAA Compliant</span>
            <span>•</span>
            <span>Spacebar to Speak</span>
            <span>•</span>
            <span>Sepolia Testnet</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
