import React, { useState } from 'react';
import { ShieldCheck, UserCheck, AlertTriangle, Clock, RefreshCw, XCircle, ChevronRight, Lock } from 'lucide-react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardians-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00E575]/15 text-[#00A850] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00A850]">
                Seedless Security
              </span>
              <h2 id="guardians-title" className="text-xl font-black text-slate-900">
                Guardians & Recovery
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 p-1 mt-4 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'status' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
          >
            Guardian Health (2-of-3)
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'recovery' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
          >
            Lost-Phone Recovery
          </button>
          <button
            onClick={() => setActiveTab('inheritance')}
            className={`flex-1 py-2 rounded-lg transition ${
              activeTab === 'inheritance' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
            }`}
          >
            Inheritance Switch
          </button>
        </div>

        {/* Tab 1: Guardian Health */}
        {activeTab === 'status' && (
          <div className="mt-5 space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900 block">Smart Contract Quorum Active</span>
                Requires 2 of 3 guardian signatures to recover access. Zero seed phrases required.
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {guardians.map((g, idx) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{g.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{g.address} &bull; {g.role}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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
            <div className="text-xs text-slate-600 leading-relaxed">
              If your phone is lost or damaged, your trusted guardians sign a recovery transaction on Sepolia testnet. A 2-minute safety delay allows you to veto in case of foul play.
            </div>

            {recoveryState === 'idle' && (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Test Recovery Flow Simulation</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Simulate an incoming recovery request from Guardian 1 to see the delay window and owner veto protection.
                </p>
                <button
                  onClick={handleStartRecoverySimulation}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
                >
                  Simulate Guardian Recovery Request
                </button>
              </div>
            )}

            {recoveryState === 'in_progress' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3 animate-pulse-gentle">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Recovery in Progress (2-Minute Delay Active)</span>
                </div>
                <div className="text-xs text-slate-700">
                  Guardian &quot;Amma&quot; has requested account key rotation. You have {countdown}s to cancel if this was unauthorized.
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleOwnerVeto}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Emergency Owner Veto</span>
                  </button>
                </div>
              </div>
            )}

            {recoveryState === 'vetoed' && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#00A850] mx-auto" />
                <div className="text-sm font-bold text-emerald-950">Recovery Successfully Vetoed</div>
                <p className="text-xs text-emerald-800">
                  The unauthorized recovery was cancelled and the smart vault remains fully under your control.
                </p>
                <button
                  onClick={() => setRecoveryState('idle')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold"
                >
                  Reset Demo
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Inheritance Switch */}
        {activeTab === 'inheritance' && (
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700">
                <span className="font-bold text-slate-900 block">Dead-Man&apos;s Switch (Inactivity Timer)</span>
                If wallet sees zero activity for 180 days, vault custody automatically transfers to your primary guardian (Amma).
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Inactivity Threshold</span>
                <span className="font-bold text-slate-800">180 Days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Designated Heir</span>
                <span className="font-bold text-slate-800">Amma (0x892a...12bc)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Heartbeat Check</span>
                <span className="font-bold text-emerald-700">Active (Refreshed today)</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">ERC-4337 Smart Account Abstraction</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
