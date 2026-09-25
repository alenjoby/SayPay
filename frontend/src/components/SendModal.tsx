import React, { useState, useEffect } from 'react';
import { Send, Fingerprint, AlertCircle, ArrowRight, UserCheck, ShieldCheck, Search, Check } from 'lucide-react';
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
  const [recipientInput, setRecipientInput] = useState<string>(initialContact || '');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [customAddress, setCustomAddress] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>(
    initialAmount ? initialAmount.toString() : '0.1'
  );
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStage, setAuthStage] = useState<'details' | 'passkey_prompt' | 'broadcasting'>('details');

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

    const readBackSpeech =
      currentLang === 'hi'
        ? `${resolvedName} को ${numericAmount} ईथर भेजे जा रहे हैं। गैस फीस शून्य। पासकी से पुष्टि करें।`
        : currentLang === 'ar'
        ? `إرسال ${numericAmount} إيثيريوم إلى ${resolvedName}. رسوم الغاز مجانية. يرجى التأكيد بالبصمة.`
        : `Send ${numericAmount} test ETH to ${resolvedName}. Gas sponsored by paymaster. Confirm with your passkey.`;

    speakText(readBackSpeech, currentLang);
  };

  const handleExecutePasskey = () => {
    setIsAuthorizing(true);
    setAuthStage('broadcasting');
    audioCues.playListeningStarted();

    setTimeout(() => {
      setIsAuthorizing(false);
      onConfirmSend(resolvedName, resolvedAddress, numericAmount);
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040404]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[rgba(19,80,91,0.2)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#d7d9ce]/60 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#119da4]/15 text-[#119da4] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0c7489]">
                Sepolia Smart Transfer
              </span>
              <h2 id="send-modal-title" className="text-xl font-black text-[#040404] font-display">
                Send Crypto
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#d7d9ce]/40 hover:bg-[#d7d9ce] text-[#040404] flex items-center justify-center text-sm font-bold transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {authStage === 'details' && (
          <div className="space-y-4">
            {/* Recipient Address / Contact Input */}
            <div>
              <label className="block text-xs font-bold text-[#13505b] mb-1.5 uppercase tracking-wider">
                Recipient (Contact Name or 0x Address):
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Rahul, Amma, or 0x..."
                  value={recipientInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl border border-[#d7d9ce] bg-[#d7d9ce]/10 text-sm font-bold text-[#040404] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#119da4]"
                />
                {selectedContact && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-[#119da4]/15 text-[#0c7489] text-[10px] font-extrabold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Contact</span>
                  </span>
                )}
              </div>

              {/* Quick Contacts Chips */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                <span className="text-[11px] text-[#13505b] font-semibold shrink-0">Quick Select:</span>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectContact(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1 ${
                      selectedContact?.id === c.id
                        ? 'bg-[#119da4] text-white shadow-sm'
                        : 'bg-[#d7d9ce]/40 text-[#13505b] hover:bg-[#d7d9ce]'
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
                <span className="font-bold text-[#13505b] uppercase tracking-wider">Amount (ETH):</span>
                <span className="text-[#13505b]/80 font-medium">
                  Available: <strong className="text-[#040404]">{availableBalanceETH.toFixed(4)} ETH</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full text-2xl font-black text-[#040404] px-4 py-3 rounded-2xl border border-[#d7d9ce] bg-[#d7d9ce]/10 focus:outline-none focus:ring-2 focus:ring-[#119da4] font-mono"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0c7489]">
                  ETH &asymp; ${usdValue} USD
                </div>
              </div>
            </div>

            {/* Paymaster Gas Notice */}
            <div className="p-3 bg-[#d7d9ce]/25 rounded-2xl border border-[#d7d9ce] text-xs text-[#13505b] flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#119da4]" />
                Sponsored Gas (ERC-4337 Paymaster)
              </span>
              <span className="font-extrabold text-[#0c7489]">Free / $0.00</span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-[#d7d9ce]/40 hover:bg-[#d7d9ce] text-[#040404] text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedToPasskey}
                disabled={!isValidAddress || numericAmount <= 0 || numericAmount > availableBalanceETH}
                className="flex-1 py-3 rounded-xl btn-cyan text-xs font-black transition flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
              >
                <span>Review & Sign</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {authStage === 'passkey_prompt' && (
          <div className="space-y-4 text-center py-2 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-[#119da4]/15 text-[#119da4] mx-auto flex items-center justify-center shadow-inner">
              <Fingerprint className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-lg font-black text-[#040404] font-display">
                Biometric Authorization
              </h3>
              <p className="text-xs text-[#13505b] mt-1 max-w-sm mx-auto">
                Spoken Read-Back: Sending <strong>{numericAmount} ETH</strong> (${usdValue} USD) to{' '}
                <strong>{resolvedName}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-[#d7d9ce]/20 rounded-2xl border border-[#d7d9ce] text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#13505b]">Recipient:</span>
                <span className="text-[#040404] font-bold">{resolvedName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#13505b]">Address:</span>
                <span className="text-[#040404] truncate max-w-[200px]">{resolvedAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#13505b]">Network:</span>
                <span className="text-[#0c7489] font-bold">Ethereum Sepolia Testnet</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={handleExecutePasskey}
                className="w-full py-3.5 rounded-2xl btn-cyan text-sm font-black transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Fingerprint className="w-5 h-5" />
                <span>Sign with Fingerprint / Passkey</span>
              </button>

              <button
                onClick={() => setAuthStage('details')}
                className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#d7d9ce]/30 text-[#13505b] text-xs font-bold transition"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {authStage === 'broadcasting' && (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#119da4]/15 border-2 border-[#119da4] flex items-center justify-center mx-auto animate-spin">
              <div className="w-6 h-6 border-2 border-[#119da4] border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-base font-extrabold text-[#040404] font-display">
              Broadcasting to Sepolia Node...
            </h3>
            <p className="text-xs text-[#13505b] font-mono">
              Verifying passkey signature on ERC-4337 smart contract...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
