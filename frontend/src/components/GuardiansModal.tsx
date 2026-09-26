import React, { useState, useEffect } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
import { ShieldCheck, UserCheck, AlertTriangle, Clock, RefreshCw, XCircle, ChevronRight, Lock, Activity, Heart, ArrowRight } from 'lucide-react';
import { Guardian, walletSync } from '../utils/walletState';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';

interface GuardiansModalProps {
  isOpen: boolean;
  guardians: Guardian[];
  currentLang: SupportedLanguage;
  onClose: () => void;
  onAnnounce: (msg: string) => void;
}

export const GuardiansModal: React.FC<GuardiansModalProps> = ({
  isOpen,
  guardians,
  currentLang,
  onClose,
  onAnnounce,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'recovery' | 'inheritance'>('status');
  const [recoveryState, setRecoveryState] = useState<'idle' | 'in_progress' | 'vetoed'>('idle');
  const [countdown, setCountdown] = useState<number>(120);

  // Tab 3: Inheritance Switch state (Hackathon Spec PDF: 2m inactivity timer, 2m grace period)
  const [inheritanceStatus, setInheritanceStatus] = useState<'active' | 'grace_period' | 'vetoed' | 'claimed'>('active');
  const [inactivitySeconds, setInactivitySeconds] = useState<number>(120);
  const [graceSeconds, setGraceSeconds] = useState<number>(120);

  // Recovery countdown effect
  useEffect(() => {
    if (recoveryState !== 'in_progress') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recoveryState]);

  // Inheritance countdown effect
  useEffect(() => {
    if (!isOpen || activeTab !== 'inheritance') return;

    if (inheritanceStatus === 'active') {
      const interval = setInterval(() => {
        setInactivitySeconds((prev) => {
          if (prev <= 1) {
            setInheritanceStatus('grace_period');
            setGraceSeconds(120);
            audioCues.playWarning();
            const msg = 'Inactivity threshold reached. Inheritance started on Sepolia. 2-minute guardian veto window active.';
            onAnnounce(msg);
            speakText(msg, currentLang);
            walletSync.broadcast({
              type: 'INHERITANCE_STARTED',
              beneficiary: 'Amma (0x892a...12bc)',
              graceSeconds: 120,
              timestamp: Date.now(),
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }

    if (inheritanceStatus === 'grace_period') {
      const interval = setInterval(() => {
        setGraceSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, inheritanceStatus, currentLang, onAnnounce]);

  if (!isOpen) return null;

  const handleStartRecoverySimulation = () => {
    audioCues.playWarning();
    setRecoveryState('in_progress');
    setCountdown(120);
    const msg = 'Social Recovery initiated by Guardian 1. 2-minute safety delay window started. Owner can veto anytime.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'RECOVERY_TRIGGERED',
      initiator: 'Amma (Guardian 1)',
      delaySeconds: 120,
      timestamp: Date.now(),
    });
  };

  const handleOwnerVeto = () => {
    audioCues.playSuccess();
    setRecoveryState('vetoed');
    const msg = 'Recovery cancelled. Owner veto executed successfully on Sepolia testnet.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'RECOVERY_VETOED',
      byUser: 'Wallet Owner (You)',
      timestamp: Date.now(),
    });
  };

  // Inheritance ping() / Heartbeat handler
  const handlePingHeartbeat = () => {
    audioCues.playSuccess();
    setInactivitySeconds(120);
    setInheritanceStatus('active');
    const msg = 'Heartbeat ping sent. Inactivity countdown reset to 2 minutes.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'HEARTBEAT_PING',
      byUser: 'Wallet Owner',
      timestamp: Date.now(),
    });
  };

  // Simulate 2-minute inactivity
  const handleSimulateInactivity = () => {
    audioCues.playWarning();
    setInactivitySeconds(0);
    setGraceSeconds(120);
    setInheritanceStatus('grace_period');
    const msg = 'Inactivity simulated. InheritanceStarted event emitted. 2-minute guardian veto window is open.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'INHERITANCE_STARTED',
      beneficiary: 'Amma (0x892a...12bc)',
      graceSeconds: 120,
      timestamp: Date.now(),
    });
  };

  // Guardian vetoInheritance() handler
  const handleGuardianVetoInheritance = () => {
    audioCues.playSuccess();
    setInheritanceStatus('vetoed');
    setInactivitySeconds(120);
    const msg = 'Guardian veto executed. vetoInheritance smart contract call confirmed. Vault remains active.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'INHERITANCE_VETOED',
      byGuardian: 'Amma',
      timestamp: Date.now(),
    });
  };

  // Beneficiary claimInheritance() handler
  const handleClaimInheritance = () => {
    audioCues.playSuccess();
    setInheritanceStatus('claimed');
    const msg = 'Inheritance claimed. claimInheritance executed by designated beneficiary Amma.';
    onAnnounce(msg);
    speakText(msg, currentLang);

    walletSync.broadcast({
      type: 'INHERITANCE_CLAIMED',
      beneficiary: 'Amma',
      timestamp: Date.now(),
    });
  };

  const handleResetInheritance = () => {
    setInheritanceStatus('active');
    setInactivitySeconds(120);
    setGraceSeconds(120);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AccessibleDialog
      onClose={onClose}
      aria-labelledby="guardians-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Seedless Security
              </span>
              <h2 id="guardians-title" className="text-xl font-black text-zinc-900 font-display">
                Guardians & Recovery
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center justify-center text-sm font-bold"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 mt-4 bg-zinc-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'status' ? 'bg-white text-zinc-950 shadow-sm font-black' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Guardian Health (2-of-3)
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'recovery' ? 'bg-white text-zinc-950 shadow-sm font-black' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Lost-Phone Recovery
          </button>
          <button
            onClick={() => setActiveTab('inheritance')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'inheritance' ? 'bg-white text-zinc-950 shadow-sm font-black' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Inheritance Switch
          </button>
        </div>

        {/* Tab 1: Guardian Health */}
        {activeTab === 'status' && (
          <div className="mt-5 space-y-3">
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-[#FF5500] shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-600">
                <span className="font-bold text-zinc-900 block">Smart Contract Quorum Active</span>
                Requires 2 of 3 guardian signatures to recover access. Zero seed phrases required.
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {guardians.map((g, idx) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-[#FF5500] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-900 font-bold text-xs flex items-center justify-center font-mono">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-zinc-900">{g.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">{g.address} &bull; {g.role}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FF5500]/10 text-[#FF5500]">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Recovery Simulator */}
        {activeTab === 'recovery' && (
          <div className="mt-5 space-y-4">
            <div className="text-xs text-zinc-600 leading-relaxed">
              If your phone is lost or damaged, your trusted guardians sign a recovery transaction on Sepolia testnet. A 2-minute safety delay allows you to veto in case of foul play.
            </div>

            {recoveryState === 'idle' && (
              <div className="p-4 rounded-2xl border border-dashed border-zinc-200 text-center space-y-3 bg-zinc-50">
                <Clock className="w-8 h-8 text-zinc-500 mx-auto" />
                <div className="text-sm font-bold text-zinc-900 font-display">Test Recovery Flow Simulation</div>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Simulate an incoming recovery request from Guardian 1 to see the delay window and owner veto protection.
                </p>
                <button
                  onClick={handleStartRecoverySimulation}
                  className="px-4 py-2.5 rounded-xl btn-orange text-white text-xs font-black transition shadow-sm cursor-pointer"
                >
                  Simulate Guardian Recovery Request
                </button>
              </div>
            )}

            {recoveryState === 'in_progress' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-pulse-gentle">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Recovery in Progress (2-Minute Delay Active)</span>
                </div>
                <div className="text-xs text-slate-800">
                  Guardian &quot;Amma&quot; has requested account key rotation. You have {countdown}s to cancel if this was unauthorized.
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleOwnerVeto}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Emergency Owner Veto</span>
                  </button>
                </div>
              </div>
            )}

            {recoveryState === 'vetoed' && (
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#FF5500] mx-auto" />
                <div className="text-sm font-bold text-zinc-900">Recovery Successfully Vetoed</div>
                <p className="text-xs text-zinc-600">
                  The unauthorized recovery was cancelled and the smart vault remains fully under your control.
                </p>
                <button
                  onClick={() => setRecoveryState('idle')}
                  className="px-3 py-1.5 rounded-lg btn-orange text-white text-xs font-black cursor-pointer"
                >
                  Reset Demo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Inheritance Switch (Hackathon Spec PDF) */}
        {activeTab === 'inheritance' && (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-600">
                <span className="font-bold text-zinc-900 block">Dead-Man Inactivity Switch (SahayiVault)</span>
                If no activity occurs within the threshold, an InheritanceStarted event begins the 2-minute grace period. Guardians can veto, or the designated heir can claim custody.
              </div>
            </div>

            {/* Status Card */}
            <div className="p-4 rounded-2xl border border-zinc-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FF5500]" />
                  <span className="text-xs font-bold text-zinc-900">Inactivity Countdown (Demo: 2m)</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  inheritanceStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : inheritanceStatus === 'grace_period'
                    ? 'bg-amber-100 text-amber-800 animate-pulse'
                    : inheritanceStatus === 'vetoed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {inheritanceStatus === 'active' && `Active (${formatTimer(inactivitySeconds)})`}
                  {inheritanceStatus === 'grace_period' && `Grace Window (${formatTimer(graceSeconds)})`}
                  {inheritanceStatus === 'vetoed' && 'Vetoed (Protected)'}
                  {inheritanceStatus === 'claimed' && 'Claimed by Heir'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Designated Heir</span>
                  <span className="font-bold text-zinc-900">Amma (0x892a...12bc)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Grace Window</span>
                  <span className="font-bold text-zinc-900">2 Minutes (Demo)</span>
                </div>
              </div>

              {/* Status alerts */}
              {inheritanceStatus === 'active' && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={handlePingHeartbeat}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Heart className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>Ping Heartbeat (I Am Active)</span>
                  </button>
                  <button
                    onClick={handleSimulateInactivity}
                    className="py-2 px-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition cursor-pointer"
                  >
                    Simulate 2m Inactivity
                  </button>
                </div>
              )}

              {inheritanceStatus === 'grace_period' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Inheritance Started. Guardian Veto Window Open: {formatTimer(graceSeconds)}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Smart contract event InheritanceStarted emitted. Any guardian can veto now to cancel the transfer.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleGuardianVetoInheritance}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Guardian Veto (vetoInheritance)</span>
                    </button>
                    <button
                      onClick={handleClaimInheritance}
                      className="py-2 px-3 rounded-xl btn-orange text-white text-xs font-bold transition cursor-pointer shadow-xs"
                    >
                      Beneficiary Claim
                    </button>
                  </div>
                </div>
              )}

              {inheritanceStatus === 'vetoed' && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center space-y-2">
                  <ShieldCheck className="w-6 h-6 text-blue-600 mx-auto" />
                  <div className="text-xs font-bold text-blue-900">Guardian Veto Executed</div>
                  <p className="text-[11px] text-blue-800">
                    The inheritance countdown was cancelled by guardian Amma. The smart vault remains safe.
                  </p>
                  <button
                    onClick={handleResetInheritance}
                    className="px-3 py-1.5 rounded-lg btn-orange text-white text-xs font-bold cursor-pointer"
                  >
                    Reset Inactivity Timer
                  </button>
                </div>
              )}

              {inheritanceStatus === 'claimed' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <UserCheck className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="text-xs font-bold text-emerald-900">Inheritance Claimed by Heir</div>
                  <p className="text-[11px] text-emerald-800">
                    Vault assets transferred to designated beneficiary Amma (0x892a...12bc).
                  </p>
                  <button
                    onClick={handleResetInheritance}
                    className="px-3 py-1.5 rounded-lg btn-orange text-white text-xs font-bold cursor-pointer"
                  >
                    Reset Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs text-zinc-500">ERC-4337 Smart Account Abstraction</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
};
