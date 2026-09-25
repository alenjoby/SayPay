import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Shield,
  Check,
  ArrowRight,
  Sparkles,
  Lock,
  Smartphone,
  ChevronDown,
  Globe,
  Radio,
  HelpCircle,
  FileText,
  UserCheck,
  Send,
  Download,
} from 'lucide-react';
import { LiveAnnouncer } from './components/LiveAnnouncer';
import { InteractiveWalletDemo } from './components/InteractiveWalletDemo';
import { FunctionalWalletPage } from './components/FunctionalWalletPage';
import { audioCues } from './utils/audioCues';
import { SupportedLanguage, translations, speakText } from './utils/i18n';
import { hasUserCreatedWallet } from './utils/walletState';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'landing' | 'wallet'>('landing');
  const [openCreateDirectly, setOpenCreateDirectly] = useState<boolean>(false);
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('SayPay loaded.');
  const [alertAnnouncement, setAlertAnnouncement] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  if (activeView === 'wallet') {
    return (
      <FunctionalWalletPage
        initialLang={lang}
        openCreateWalletDirectly={openCreateDirectly}
        onBackToLanding={() => {
          setActiveView('landing');
          audioCues.playSuccess();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col font-sans selection:bg-[#FF5500] selection:text-white">
      {/* Accessible W3C ARIA Live Announcer */}
      <LiveAnnouncer politeMessage={politeAnnouncement} alertMessage={alertAnnouncement} />

      {/* 1. Header / Navbar (Industrial Minimalist Style) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <a href="#top" className="flex items-center gap-2.5 group outline-none" aria-label="SayPay Home">
              <div className="w-8 h-8 rounded-xl bg-[#FF5500] flex items-center justify-center font-black text-white text-sm shadow-sm group-hover:scale-105 transition">
                S
              </div>
              <span className="text-xl font-extrabold tracking-tight text-zinc-900">SayPay</span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-600">
            <a href="#features" className="hover:text-zinc-950 transition">Features</a>
            <a href="#accessibility" className="hover:text-zinc-950 transition">Accessibility</a>
            <a href="#security" className="hover:text-zinc-950 transition">Security</a>
            <a href="#faq" className="hover:text-zinc-950 transition">FAQ</a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher Pill */}
            <div className="flex items-center p-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'en' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'hi' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
                aria-label="हिंदी में बदलें"
              >
                हिंदी
              </button>
              <button
                onClick={() => handleLanguageChange('ar')}
                className={`px-3 py-1 rounded-full font-bold transition text-xs ${
                  lang === 'ar' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
                aria-label="التبديل إلى العربية"
              >
                العربية
              </button>
            </div>

            {/* Audio Earcon Toggle */}
            <button
              onClick={handleToggleSound}
              className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition"
              title={soundEnabled ? t.soundOn : t.soundOff}
              aria-label={soundEnabled ? t.soundOn : t.soundOff}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FF5500]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Launch / Access Wallet Button */}
            <button
              onClick={() => {
                audioCues.playSuccess();
                if (!hasUserCreatedWallet()) {
                  setOpenCreateDirectly(true);
                } else {
                  setOpenCreateDirectly(false);
                }
                setActiveView('wallet');
              }}
              className="hidden sm:inline-flex px-4 py-2 rounded-full btn-orange text-xs font-bold tracking-wide shadow-sm hover:scale-105 transition cursor-pointer"
            >
              {hasUserCreatedWallet() ? 'Access Wallet' : 'Create Wallet'}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Industrial Minimalist Style) */}
      <section className="pt-16 pb-20 px-4 sm:px-8 text-center relative overflow-hidden bg-gradient-to-b from-white via-zinc-50 to-[#FAFAFA]">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/25 text-[#FF5500] text-xs font-bold tracking-wide">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Voice-First Crypto Smart Wallet</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl font-black text-zinc-900 tracking-tight leading-[1.1]">
            The crypto wallet you control{' '}
            <span className="text-[#FF5500] underline decoration-[#FF5500]/40 decoration-wavy">
              with your voice
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Built from accessibility research for blind and visually impaired users. Speak naturally in Arabic,
            English, or Hindi: zero seed phrases, zero silent popups, and zero hexadecimal addresses.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                audioCues.playSuccess();
                setOpenCreateDirectly(true);
                setActiveView('wallet');
              }}
              className="px-6 py-3 rounded-full btn-orange text-sm font-bold shadow-md shadow-orange-500/20 inline-flex items-center gap-2 transition hover:scale-105 cursor-pointer"
            >
              <span>Create Smart Wallet</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                audioCues.playSuccess();
                if (!hasUserCreatedWallet()) {
                  const noWalletMsg =
                    lang === 'hi'
                      ? 'कोई सक्रिय वॉलेट नहीं मिला। कृपया पहले अपना स्मार्ट वॉलेट बनाएं।'
                      : lang === 'ar'
                      ? 'لم يتم العثور على محفظة نشطة. يرجى إنشاء محفظتك الذكية أولاً.'
                      : 'No existing wallet found on this device. Opening wallet creation.';
                  speakText(noWalletMsg, lang);
                  setOpenCreateDirectly(true);
                } else {
                  setOpenCreateDirectly(false);
                }
                setActiveView('wallet');
              }}
              className="px-5 py-3 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 text-sm font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#FF5500]" />
              <span>Access Existing Wallet</span>
            </button>
          </div>
        </div>

        {/* Central Phone Mockup (The App Showcase) */}
        <div id="demo" className="mt-12">
          <InteractiveWalletDemo
            lang={lang}
            onLanguageChange={handleLanguageChange}
            onAnnounce={handleAnnounce}
          />
        </div>

        {/* Platform compatibility labels */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#00A850]" />
            Android & Desktop PWA
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#00A850]" />
            WebAuthn Passkey Biometrics
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#00A850]" />
            Testnet Smart Contracts
          </span>
        </div>
      </section>

      {/* 3. Section: "Every feature you need in crypto. Spoken out loud." (Trust Wallet Style Bento Grid) */}
      <section id="features" className="py-20 px-4 sm:px-8 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Every feature you need in crypto. Spoken out loud.
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Designed to solve documented usability barriers for blind users
            </p>
          </div>

          {/* Asymmetrical Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Multilingual Voice Control */}
            <div className="tw-card p-8 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center mb-6">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Multilingual Natural Voice Commands
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  Understands code-switched phrases in English, Hindi (Hinglish), and Arabic. You speak naturally:
                  "Send 0.1 ETH to Amma", "Priya ko 500 bhejo", or "Arsil 0.1 ila Amma". The app parses amounts and
                  contacts with automatic spelling-by-ear normalization.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-2 text-xs font-mono">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">English</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">हिंदी (Hinglish)</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700">العربية (Arabic)</span>
                <span className="px-3 py-1 rounded-full bg-[#FF5500]/10 text-[#FF5500] font-semibold">
                  Auto Language Detection
                </span>
              </div>
            </div>

            {/* Card 2: Seedless Social Vault */}
            <div className="tw-card p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-[#FF5500]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                  Seedless Social Recovery
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  No 12-word seed phrases to transcribe or lose. 2-of-3 trusted guardians restore access on a new phone with a 2-minute delay window and owner veto.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-[#FF5500] flex items-center gap-1">
                <span>Account Abstraction</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Card 3: Zero Silent Popups */}
            <div className="tw-card p-8 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mb-6">
                  <Volume2 className="w-6 h-6 text-[#FF5500]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                  Zero Silent State Changes
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Dual W3C ARIA live regions and distinct audio earcons ensure no confirmation popup or error goes unnoticed by screen readers.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-500">
                NVDA & TalkBack Verified
              </div>
            </div>

            {/* Card 4: Human Contact Book */}
            <div className="tw-card p-8 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center mb-6">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Human Contact Book (No 42-Character Hex Keys)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  Blind users cannot easily distinguish long hexadecimal wallet addresses, resulting in misdirected funds. SayPay matches names phonetically on-device. Users never have to hear, verify, or type a raw blockchain address.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs font-mono text-slate-600">
                <span>"Amma" &rarr; 0x71C8...4E92</span>
                <span>&bull;</span>
                <span>"Priya" &rarr; 0x992B...8731</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: Research Numbers Strip (Minimal, Clean) */}
      <section id="accessibility" className="py-20 px-4 sm:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
              The Usability Gap
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Backed by Usability Research (SOUPS 2023)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tested on 23 blind users using standard wallets like MetaMask (Zhou et al.)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
              <span className="text-5xl font-black text-slate-900 tracking-tight block tabular-nums">
                +70%
              </span>
              <h3 className="font-bold text-slate-800 text-sm mt-2">Longer Task Duration</h3>
              <p className="text-xs text-slate-500 mt-1">
                Blind users averaged 47.9 minutes vs 28.2 minutes for sighted users on basic tasks.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
              <span className="text-5xl font-black text-[#FF5500] tracking-tight block tabular-nums">
                0
              </span>
              <h3 className="font-bold text-slate-800 text-sm mt-2">Silent Popups in SayPay</h3>
              <p className="text-xs text-slate-500 mt-1">
                Standard wallets failed to announce confirmation dialogs. SayPay reads all actions out loud.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
              <span className="text-5xl font-black text-slate-900 tracking-tight block tabular-nums">
                12 Words
              </span>
              <h3 className="font-bold text-slate-800 text-sm mt-2">Seed Phrases Eliminated</h3>
              <p className="text-xs text-slate-500 mt-1">
                Screen-reader users often skipped 12-word seed backups due to fatigue. SayPay is seedless.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: Security Architecture (Industrial Split Layout) */}
      <section id="security" className="py-20 px-4 sm:px-8 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-12">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5500]">
              Deliberate Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
              Where security isn't a feature. It's the foundation.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-[#FF5500] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Never Moves Money</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The speech model only proposes a structured action. Funds are unlocked exclusively through physical device biometric confirmation (Passkey/Fingerprint).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-[#FF5500] flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Voice Passwords</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Voice biometrics can be cloned from 3 seconds of audio. SayPay uses device hardware biometric authentication and avoids speaking passwords aloud.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 text-[#FF5500] flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero On-Chain PII</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Personal names, contacts, and phone records remain strictly in local device storage. The public blockchain only sees smart contract wallet interactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: Frequently Asked Questions (Accordion) */}
      <section id="faq" className="py-20 px-4 sm:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Got questions?</h2>
            <p className="text-sm text-slate-500 mt-1">Everything you need to know about SayPay</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does SayPay work for visually impaired users?',
                a: 'SayPay is voice-first. Users speak commands in English, Hindi, or Arabic. Every action is read back verbally, focus is moved into native accessible dialogs, and every balance update triggers a screen reader announcement and distinct earcon sound cue.',
              },
              {
                q: 'Which languages are supported?',
                a: 'SayPay supports English, Hindi (including Hinglish code-switching), and Arabic. It automatically detects spoken dialects and switches the visual interface direction (RTL for Arabic, LTR for English/Hindi).',
              },
              {
                q: 'How does recovery work without a 12-word seed phrase?',
                a: 'SayPay uses Account Abstraction smart contracts with Social Recovery. If you lose your phone, 2 of 3 trusted guardians approve restoration on your new device. A 2-minute delay ensures the original owner can cancel unauthorized attempts.',
              },
              {
                q: 'Can funds be sent by accident through speech?',
                a: 'No. The AI model only creates a proposed transaction. The transaction details are read out loud, and money can only be sent once you physically scan your fingerprint or face via device Passkey.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 hover:text-slate-700 transition"
                  aria-expanded={openFaq === idx}
                >
                  <span className="text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-slate-900' : ''}`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA Banner (Industrial High-Contrast Hardware Style) */}
      <section className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto rounded-[2.5rem] bg-[#09090B] text-white p-10 sm:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden border border-zinc-800">
          <div className="max-w-xl space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF5500]">
              Accessibility First Web3
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              The crypto wallet you control with your voice.
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Try the testnet prototype. No seed phrases, zero silent popups, and complete independence.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  audioCues.playSuccess();
                  setActiveView('wallet');
                }}
                className="px-7 py-3.5 rounded-full btn-orange text-white font-black text-sm tracking-wide shadow-lg inline-flex items-center gap-2 hover:scale-105 transition"
              >
                <span>Launch Smart Wallet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="w-48 h-48 rounded-full bg-[#FF5500]/15 flex items-center justify-center shrink-0 border border-[#FF5500]/30 shadow-[0_0_50px_rgba(255,85,0,0.2)]">
            <Mic className="w-20 h-20 text-[#FF5500]" />
          </div>
        </div>
      </section>

      {/* 8. Corporate Minimal Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 px-4 sm:px-8 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF5500] flex items-center justify-center font-black text-white text-xs">
              S
            </div>
            <span className="font-extrabold text-sm text-zinc-900">SayPay</span>
            <span>- Voice-First Smart Wallet Prototype</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>WCAG AAA Accessible</span>
            <span>&bull;</span>
            <span>Arabic &bull; English &bull; Hindi</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
