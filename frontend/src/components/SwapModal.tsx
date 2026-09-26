import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowDownUp,
  X,
  Check,
  Key,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { signTransactionWithPasskey } from '../utils/passkeyAuth';
import { swapTokensInWallet, WalletUser } from '../utils/walletState';

interface SwapModalProps {
  isOpen: boolean;
  user: WalletUser;
  currentLang: SupportedLanguage;
  onSwapSuccess: (updatedUser: WalletUser) => void;
  onClose: () => void;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  user,
  currentLang,
  onSwapSuccess,
  onClose,
}) => {
  const [fromToken, setFromToken] = useState<'ETH' | 'USDC'>('ETH');
  const [toToken, setToToken] = useState<'ETH' | 'USDC'>('USDC');
  const [fromAmount, setFromAmount] = useState<number>(0.1);
  const [isSwapping, setIsSwapping] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Conversion rate: 1 ETH = 2693.29 USDC
  const rate = 2693.29;
  const toAmount =
    fromToken === 'ETH'
      ? parseFloat((fromAmount * rate).toFixed(2))
      : parseFloat((fromAmount / rate).toFixed(4));

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSwapping(false);
      audioCues.playIntentRecognized();

      const prompt =
        currentLang === 'hi'
          ? 'टोकन स्वैप विंडो। स्वैप करने के लिए राशि चुनें।'
          : currentLang === 'ar'
          ? 'نافذة تبديل العملات الرقمية. اختر المبلغ للتبديل.'
          : 'Token swap window. Swap your tokens with passkey authorization.';
      speakText(prompt, currentLang);
    }
  }, [isOpen, currentLang]);

  if (!isOpen) return null;

  const handleFlipTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toToken === 'ETH' ? 0.1 : 250);
    audioCues.playSuccess();
  };

  const handleExecuteSwap = async () => {
    setErrorMsg('');
    const userFromTok = user.tokens.find((t) => t.symbol === fromToken);
    const balance = userFromTok ? userFromTok.balance : fromToken === 'ETH' ? user.balanceETH : 0;

    if (balance < fromAmount) {
      setErrorMsg(`Insufficient ${fromToken} balance. You have ${balance} ${fromToken}.`);
      audioCues.playWarning();
      speakText(`Insufficient ${fromToken} balance.`, currentLang);
      return;
    }

    setIsSwapping(true);
    audioCues.playIntentRecognized();

    try {
      // Real WebAuthn passkey confirmation
      const passkeyResult = await signTransactionWithPasskey(
        `swap_${fromToken}_${toToken}_${Date.now()}`,
        'Uniswap V3 Protocol',
        fromAmount
      );

      if (!passkeyResult.success) {
        setIsSwapping(false);
        setErrorMsg(passkeyResult.error || 'Passkey biometric scan was cancelled.');
        audioCues.playWarning();
        return;
      }

      const { user: updatedUser } = swapTokensInWallet(
        user.id,
        fromToken,
        toToken,
        fromAmount,
        toAmount
      );

      setIsSwapping(false);
      audioCues.playPasskeySuccess();

      const successMsg =
        currentLang === 'hi'
          ? `सफलतापूर्वक ${fromAmount} ${fromToken} को ${toAmount} ${toToken} में बदला गया।`
          : currentLang === 'ar'
          ? `تم تبديل ${fromAmount} ${fromToken} مقابل ${toAmount} ${toToken} بنجاح.`
          : `Swap confirmed. Exchanged ${fromAmount} ${fromToken} for ${toAmount} ${toToken}.`;
      speakText(successMsg, currentLang);

      setTimeout(() => {
        onSwapSuccess(updatedUser);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSwapping(false);
      setErrorMsg(err?.message || 'Swap failed.');
      audioCues.playWarning();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
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
            <div className="w-9 h-9 rounded-2xl bg-[#00A850]/15 text-[#00A850] flex items-center justify-center font-black">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <h2 id="swap-modal-title" className="text-lg font-black text-zinc-900 tracking-tight">
                Swap Tokens
              </h2>
              <span className="text-[11px] font-mono text-zinc-400 block">
                Instant DEX Smart Routing
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
            aria-label="Close swap dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* You Pay */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 mb-2">
              <span>You Pay</span>
              <span>
                Balance:{' '}
                {user.tokens.find((t) => t.symbol === fromToken)?.balance || 0} {fromToken}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                step="any"
                min="0.001"
                value={fromAmount || ''}
                onChange={(e) => setFromAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-xl font-black text-zinc-900 font-mono focus:outline-none"
              />
              <span className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 font-mono font-black text-xs text-zinc-800 shrink-0">
                {fromToken}
              </span>
            </div>
          </div>

          {/* Flip Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleFlipTokens}
              className="p-2.5 rounded-full bg-white border border-zinc-300 shadow-md hover:bg-zinc-50 transition hover:rotate-180"
              title="Flip currencies"
            >
              <ArrowDownUp className="w-4 h-4 text-zinc-700" />
            </button>
          </div>

          {/* You Receive */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-500 mb-2">
              <span>You Receive (Estimated)</span>
              <span>
                Balance:{' '}
                {user.tokens.find((t) => t.symbol === toToken)?.balance || 0} {toToken}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xl font-black text-zinc-900 font-mono">
                {toAmount}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 font-mono font-black text-xs text-zinc-800 shrink-0">
                {toToken}
              </span>
            </div>
          </div>

          {/* Rate Notice */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-1">
            <span>Rate: 1 ETH = $2,693.29 USDC</span>
            <span>Network Fee: $0.00 (Gasless AA)</span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleExecuteSwap}
              disabled={isSwapping || fromAmount <= 0}
              className="w-full py-4 rounded-2xl bg-zinc-950 hover:bg-black text-white font-black text-xs uppercase tracking-wider transition shadow-lg inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Key className="w-4 h-4 text-[#FF5500]" />
              <span>
                {isSwapping ? 'Verifying Device Passkey...' : `Authorize Swap with Passkey`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
