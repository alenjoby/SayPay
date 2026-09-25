import React, { useState, useEffect } from 'react';
import { Send, Fingerprint, AlertCircle, ArrowRight, UserCheck, ShieldCheck, Search, Check, ShieldAlert, KeyRound } from 'lucide-react';
import { Contact } from '../utils/walletState';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';
import { signTransactionWithPasskey, PasskeySignatureResult } from '../utils/passkeyAuth';

interface SendModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentLang: SupportedLanguage;
  initialContact?: string;
  initialAmount?: number;
  availableBalanceETH: number;
  ethRateUSD: number;
  externalVoiceTrigger?: 'confirm' | 'cancel' | 'fingerprint' | null;
  onClose: () => void;
  onConfirmSend: (recipient: string, address: string, amount: number, sigResult?: PasskeySignatureResult) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  contacts,
  currentLang,
  initialContact,
  initialAmount,
  availableBalanceETH,
  ethRateUSD,
  externalVoiceTrigger,
  onClose,
  onConfirmSend,
}) => {
  const [recipientInput, setRecipientInput] = useState<string>(initialContact || '');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [customAddress, setCustomAddress] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>(
    initialAmount ? initialAmount.toString() : '0.1'
  );
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStage, setAuthStage] = useState<'details' | 'passkey_prompt' | 'broadcasting'>('details');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (initialContact) {
      setRecipientInput(initialContact);
      const match = contacts.find((c) => c.name.toLowerCase() === initialContact.toLowerCase());
      if (match) {
        setSelectedContact(match);
      }
    } else if (contacts.length > 0 && !selectedContact) {
      setSelectedContact(contacts[0]);
      setRecipientInput(contacts[0].name);
    }
  }, [initialContact, contacts]);

  // Handle external voice triggers (e.g. user says "fingerprint" or "confirm" or "cancel")
  useEffect(() => {
    if (!isOpen) return;
    if (externalVoiceTrigger === 'confirm' || externalVoiceTrigger === 'fingerprint') {
      if (authStage === 'details') {
        handleProceedToPasskey();
        setTimeout(() => {
          handleExecutePasskey();
        }, 600);
      } else if (authStage === 'passkey_prompt') {
        handleExecutePasskey();
      }
    } else if (externalVoiceTrigger === 'cancel') {
      onClose();
    }
  }, [externalVoiceTrigger, isOpen, authStage]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const usdValue = (numericAmount * ethRateUSD).toFixed(2);

  // Address validation: Either chosen contact's address or valid hex string
  const resolvedAddress = selectedContact ? selectedContact.address : customAddress;
  const resolvedName = selectedContact ? selectedContact.name : 'Recipient';
  const isValidAddress = resolvedAddress.length >= 10;

  const handleSelectContact = (c: Contact) => {
    setSelectedContact(c);
    setRecipientInput(c.name);
    setCustomAddress(c.address);
    audioCues.playIntentRecognized();
  };

  const handleManualInputChange = (val: string) => {
    setRecipientInput(val);
    const match = contacts.find((c) => c.name.toLowerCase() === val.toLowerCase());
    if (match) {
      setSelectedContact(match);
      setCustomAddress(match.address);
    } else {
      setSelectedContact(null);
      setCustomAddress(val);
    }
  };

  const handleProceedToPasskey = () => {
    if (!isValidAddress || numericAmount <= 0) return;
    audioCues.playIntentRecognized();
    setAuthStage('passkey_prompt');
    setAuthError(null);

    const readBackSpeech =
      currentLang === 'hi'
        ? `${resolvedName} को ${numericAmount} ईथर भेजे जा रहे हैं। पासकी या फिंगरप्रिंट से पुष्टि करें।`
        : currentLang === 'ar'
        ? `إرسال ${numericAmount} إيثيريوم إلى ${resolvedName}. يرجى التأكيد ببصمة الإصبع أو مفتاح المرور.`
        : `Send ${numericAmount} test ETH to ${resolvedName}. Say "Fingerprint" or tap the button to sign with your passkey.`;

    speakText(readBackSpeech, currentLang);
  };

  const handleExecutePasskey = async () => {
    setIsAuthorizing(true);
    setAuthStage('broadcasting');
    setAuthError(null);
    audioCues.playListeningStarted();

    const pseudoTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    try {
      const sigResult = await signTransactionWithPasskey(pseudoTxHash, resolvedName, numericAmount);

      if (sigResult.success) {
        audioCues.playPasskeySuccess();
        setTimeout(() => {
          audioCues.playSuccess();
          setIsAuthorizing(false);
          onConfirmSend(resolvedName, resolvedAddress, numericAmount, sigResult);
        }, 600);
      } else {
        setIsAuthorizing(false);
        setAuthStage('passkey_prompt');
        setAuthError(sigResult.error || 'Biometric authorization was declined.');
        audioCues.playWarning();
        speakText('Biometric authentication failed. Say "Fingerprint" to retry or "Cancel" to abort.', currentLang);
      }
    } catch (err: any) {
      setIsAuthorizing(false);
      setAuthStage('passkey_prompt');
      setAuthError('Authentication could not complete.');
      audioCues.playWarning();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Sepolia Smart Transfer
              </span>
              <h2 id="send-modal-title" className="text-xl font-black text-zinc-900 font-display">
                Send Crypto
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

        {authStage === 'details' && (
          <div className="space-y-4">
            {/* Recipient Address / Contact Input */}
            <div>
              <label className="block text-xs font-bold text-zinc-600 mb-1.5 uppercase tracking-wider">
                Recipient (Contact Name or 0x Address):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Priya, Amma, or 0x..."
                  value={recipientInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                />
                {selectedContact && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-[#FF5500]/10 text-[#FF5500] text-[10px] font-extrabold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Contact</span>
                  </span>
                )}
              </div>

              {/* Quick Contacts Chips */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                <span className="text-[11px] text-zinc-500 font-semibold shrink-0">Quick Select:</span>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectContact(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                      selectedContact?.id === c.id
                        ? 'bg-[#FF5500] text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-zinc-600 uppercase tracking-wider">Amount (ETH):</span>
                <span className="text-zinc-500 font-medium">
                  Available: <strong className="text-zinc-900">{availableBalanceETH.toFixed(4)} ETH</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-2xl font-black text-zinc-900 px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#FF5500] font-mono"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                  ETH &asymp; ${usdValue} USD
                </div>
              </div>
            </div>

            {/* Paymaster Gas Notice */}
            <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20 text-xs text-orange-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
                Sponsored Gas (ERC-4337 Paymaster)
              </span>
              <span className="font-extrabold text-[#FF5500]">Free / $0.00</span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPasskey}
                disabled={!isValidAddress || numericAmount <= 0 || numericAmount > availableBalanceETH}
                className="flex-1 py-3 rounded-xl btn-orange text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
              >
                <span>Review & Sign</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {authStage === 'passkey_prompt' && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#FF5500]/10 text-[#FF5500] mx-auto flex items-center justify-center shadow-inner">
              <Fingerprint className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-zinc-900 font-display">
                Biometric Authorization
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                Spoken Read-Back: Sending <strong>{numericAmount} ETH</strong> (${usdValue} USD) to{' '}
                <strong>{resolvedName}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">Recipient:</span>
                <span className="text-zinc-900 font-bold">{resolvedName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Address:</span>
                <span className="text-zinc-900 truncate max-w-[200px]">{resolvedAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Network:</span>
                <span className="text-[#FF5500] font-bold">Ethereum Sepolia Testnet</span>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{authError}</span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                onClick={handleExecutePasskey}
                disabled={isAuthorizing}
                className="w-full py-3.5 rounded-2xl btn-orange text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Fingerprint className="w-5 h-5" />
                <span>{isAuthorizing ? 'Scanning Biometrics...' : 'Sign with Fingerprint / Passkey'}</span>
              </button>

              <button
                onClick={() => setAuthStage('details')}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-zinc-100 text-zinc-600 text-xs font-bold transition"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {authStage === 'broadcasting' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#FF5500]/10 border-2 border-[#FF5500] flex items-center justify-center mx-auto animate-spin">
              <div className="w-6 h-6 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-base font-extrabold text-zinc-900 font-display">
              Broadcasting to Sepolia Node...
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              Verifying passkey signature on ERC-4337 smart contract...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
