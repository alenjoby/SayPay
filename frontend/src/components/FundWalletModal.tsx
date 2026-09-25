import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  ArrowDownLeft,
  X,
  Check,
  Sparkles,
  Volume2,
  Mic,
  DollarSign,
  Zap,
} from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { fundWallet, TokenItem, WalletUser } from '../utils/walletState';

interface FundWalletModalProps {
  isOpen: boolean;
  user: WalletUser;
  currentLang: SupportedLanguage;
  onFundSuccess: (updatedUser: WalletUser) => void;
  onClose: () => void;
}

export const FundWalletModal: React.FC<FundWalletModalProps> = ({
  isOpen,
  user,
  currentLang,
  onFundSuccess,
  onClose,
}) => {
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDC' | 'USDT'>('ETH');
  const [amount, setAmount] = useState<number>(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsProcessing(false);
      audioCues.playIntentRecognized();

      const prompt =
        currentLang === 'hi'
          ? 'फंड वॉलेट विंडो। टेस्टनेट कैश जोड़ने के लिए राशि चुनें।'
          : currentLang === 'ar'
          ? 'نافذة تمويل المحفظة. اختر المبلغ لإضافة رصيد تجريبي.'
          : 'Fund wallet window. Select an amount of testnet funds to deposit into your smart wallet.';
      speakText(prompt, currentLang);
    }
  }, [isOpen, currentLang]);

  if (!isOpen) return null;

  const handleDeposit = () => {
    if (amount <= 0) return;
    setIsProcessing(true);
    audioCues.playIntentRecognized();

    setTimeout(() => {
      const { user: updatedUser } = fundWallet(user.id, selectedToken, amount);
      setIsProcessing(false);
      setIsSuccess(true);
      audioCues.playSuccess();

      const msg =
        currentLang === 'hi'
          ? `सफलतापूर्वक ${amount} ${selectedToken} आपके वॉलेट में जमा किए गए।`
          : currentLang === 'ar'
          ? `تم إيداع ${amount} ${selectedToken} بنجاح في محفظتك.`
          : `Successfully funded ${amount} ${selectedToken} into your smart wallet.`;
      speakText(msg, currentLang);

      setTimeout(() => {
        onFundSuccess(updatedUser);
        onClose();
      }, 1000);
    }, 700);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fund-wallet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200 focus:outline-none relative"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 id="fund-wallet-title" className="text-lg font-black text-zinc-900 tracking-tight">
                Fund Wallet (Testnet Faucet)
              </h2>
              <span className="text-[11px] font-mono text-zinc-400 block">
                Instant Mock Cash Deposit
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
            aria-label="Close funding window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Selector */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              Select Asset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { sym: 'ETH', label: 'Sepolia ETH', bg: 'bg-blue-500' },
                { sym: 'USDC', label: 'USD Coin', bg: 'bg-blue-600' },
                { sym: 'USDT', label: 'Tether USD', bg: 'bg-emerald-600' },
              ].map((tok) => (
                <button
                  key={tok.sym}
                  type="button"
                  onClick={() => {
                    setSelectedToken(tok.sym as any);
                    if (tok.sym === 'ETH') setAmount(0.5);
                    else setAmount(250);
                    audioCues.playSuccess();
                  }}
                  className={`p-3 rounded-2xl border-2 text-center transition ${
                    selectedToken === tok.sym
                      ? 'border-[#FF5500] bg-orange-50/40 text-zinc-900 font-extrabold shadow-sm'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-600 font-bold hover:bg-zinc-100'
                  }`}
                >
                  <span className="block text-sm font-black">{tok.sym}</span>
                  <span className="text-[10px] text-zinc-500 font-normal">{tok.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              Quick Preset Amounts
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(selectedToken === 'ETH' ? [0.1, 0.5, 1.0] : [50, 250, 1000]).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setAmount(val);
                    audioCues.playSuccess();
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-black transition ${
                    amount === val
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  +{val} {selectedToken}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 mb-1.5">
              Or Custom Amount
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                placeholder="0.00"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-zinc-400 font-mono">
                {selectedToken}
              </span>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Source:</span>
            <span className="font-mono font-bold text-zinc-800">Sepolia Testnet Smart Faucet</span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleDeposit}
              disabled={isProcessing || amount <= 0}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg inline-flex items-center justify-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FF5500] hover:bg-[#e04b00] text-white disabled:opacity-50'
              }`}
            >
              {isProcessing ? (
                <span>Requesting from Faucet...</span>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Funds Deposited!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Deposit {amount} {selectedToken}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
