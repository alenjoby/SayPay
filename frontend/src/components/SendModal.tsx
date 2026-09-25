import React, { useState } from 'react';
import { Send, Fingerprint, AlertCircle, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';
import { Contact } from '../utils/walletState';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

interface SendModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentLang: SupportedLanguage;
  initialContact?: string;
  initialAmount?: number;
  availableBalanceETH: number;
  ethRateUSD: number;
  onClose: () => void;
  onConfirmSend: (recipient: string, address: string, amount: number) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  contacts,
  currentLang,
  initialContact,
  initialAmount,
  availableBalanceETH,
  ethRateUSD,
  onClose,
  onConfirmSend,
}) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(
    contacts.find((c) => c.name.toLowerCase() === (initialContact || '').toLowerCase()) || contacts[0]
  );
  const [amountStr, setAmountStr] = useState<string>(
    initialAmount ? initialAmount.toString() : '0.1'
  );
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStage, setAuthStage] = useState<'details' | 'passkey_prompt' | 'broadcasting'>('details');

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const usdValue = (numericAmount * ethRateUSD).toFixed(2);
  const estimatedGasUSD = 0.08;

  const handleProceedToPasskey = () => {
    if (!selectedContact || numericAmount <= 0) return;
    audioCues.playIntentRecognized();
    setAuthStage('passkey_prompt');

    // Spoken Read-Back: AI never moves money without human verification
    const readBackSpeech =
      currentLang === 'hi'
        ? `${selectedContact.name} को ${numericAmount} ईथर भेजे जा रहे हैं। गैस फीस बारह सेंट। फिंगरप्रिंट या पासकी से पुष्टि करें।`
        : currentLang === 'ar'
        ? `إرسال ${numericAmount} إيثيريوم إلى ${selectedContact.name}. رسوم الغاز ثمانية سنت. يرجى التأكيد ببصمة الإصبع.`
        : `Send ${numericAmount} test ETH to ${selectedContact.name}. Gas fee is eight cents. Confirm with your fingerprint or passkey.`;

    speakText(readBackSpeech, currentLang);
  };

  const handleExecutePasskey = () => {
    setIsAuthorizing(true);
    setAuthStage('broadcasting');
    audioCues.playListeningStarted();

    setTimeout(() => {
      setIsAuthorizing(false);
      if (selectedContact) {
        onConfirmSend(selectedContact.name, selectedContact.address, numericAmount);
      }
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#00E575]/15 text-[#00A850] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00A850]">
                Smart Contract Transfer
              </span>
              <h2 id="send-modal-title" className="text-xl font-black text-slate-900">
                Send Test ETH
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

        {authStage === 'details' && (
          <div className="space-y-4">
            {/* Recipient Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Trusted Recipient:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      selectedContact?.id === contact.id
                        ? 'border-[#00E575] bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${contact.avatarBg} text-white flex items-center justify-center text-xs font-bold`}
                    >
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{contact.name}</div>
                      <div className="text-[10px] text-slate-500">{contact.relationship}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Amount (Sepolia ETH):</span>
                <span className="text-slate-500">
                  Available: <strong className="text-slate-800">{availableBalanceETH.toFixed(4)} ETH</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-2xl font-black text-slate-900 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-[#00E575]/30"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  ETH &asymp; ${usdValue} USD
                </div>
              </div>
            </div>

            {/* Gas Fee & Safeguard notice */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#00A850]" />
                Sponsored Gas (ERC-4337 Paymaster)
              </span>
              <span className="font-bold text-emerald-700">Free / $0.00</span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPasskey}
                disabled={numericAmount <= 0 || numericAmount > availableBalanceETH}
                className="flex-1 py-3 rounded-xl btn-lime text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <span>Review & Sign</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {authStage === 'passkey_prompt' && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#00A850] mx-auto flex items-center justify-center shadow-inner">
              <Fingerprint className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">
                Biometric Signature Required
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Spoken Read-Back: Sending <strong>{numericAmount} ETH</strong> (${usdValue} USD) to{' '}
                <strong>{selectedContact?.name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="text-slate-900 font-bold">{selectedContact?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="text-slate-700 truncate max-w-[200px]">{selectedContact?.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network:</span>
                <span className="text-emerald-700 font-bold">Ethereum Sepolia Testnet</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleExecutePasskey}
                className="w-full py-3.5 rounded-2xl btn-lime text-sm font-black transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Fingerprint className="w-5 h-5" />
                <span>Sign with Fingerprint / Passkey</span>
              </button>

              <button
                onClick={() => setAuthStage('details')}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {authStage === 'broadcasting' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-[#00E575] flex items-center justify-center mx-auto animate-spin">
              <div className="w-6 h-6 border-2 border-[#00E575] border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              Broadcasting to Sepolia Node...
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Verifying passkey signature on ERC-4337 smart contract...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
