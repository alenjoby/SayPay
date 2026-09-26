import React, { useState, useEffect } from 'react';
import { Headphones, ShieldAlert, CheckCircle2, Volume2, Radio, RefreshCw, Bluetooth, Cable } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { headphoneSafety, HeadphoneStatus } from '../utils/headphoneDetector';

interface HeadphoneSafetyModalProps {
  isOpen: boolean;
  currentLang: SupportedLanguage;
  onVerified: () => void;
  onSwitchToVisual?: () => void;
  onClose?: () => void;
}

export const HeadphoneSafetyModal: React.FC<HeadphoneSafetyModalProps> = ({
  isOpen,
  currentLang,
  onVerified,
  onSwitchToVisual,
  onClose,
}) => {
  const [headphoneStatus, setHeadphoneStatus] = useState<HeadphoneStatus>(headphoneSafety.getStatus());
  const [testedAudio, setTestedAudio] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    audioCues.playWarning();

    const warningSpeech =
      currentLang === 'hi'
        ? 'गोपनीयता सलाह: वॉइस-असिस्टेड मोड में, आपकी वित्तीय गोपनीयता की रक्षा के लिए ईयरफ़ोन इस्तेमाल करने की सिफारिश की जाती है। हालांकि आप बिना ईयरफ़ोन के भी जारी रख सकते हैं।'
        : currentLang === 'ar'
        ? 'تنبيه خصوصية: في وضع المساعدة الصوتية، يُوصى باستخدام سماعات الأذن لحماية بياناتك المالية من الاستماع العام. ولكن يمكنك المتابعة بدونها أيضاً.'
        : 'Privacy Advisory: In Voice-Assisted Mode, earphones are recommended so nearby people cannot overhear your balance and transactions. You can continue with or without earphones.';

    speakText(warningSpeech, currentLang);

    // Initial hardware scan
    headphoneSafety.scanAudioDevices().then((res) => setHeadphoneStatus(res));

    const unsubscribe = headphoneSafety.onStatusChange((status) => {
      setHeadphoneStatus(status);
      if (status.isConnected) {
        audioCues.playSuccess();
        const detectedSpeech =
          status.connectionType === 'wireless'
            ? 'Wireless Bluetooth headphones detected.'
            : 'Wired earphones detected.';
        speakText(detectedSpeech, currentLang);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentLang]);

  if (!isOpen) return null;

  const handleScanDevices = async () => {
    setIsScanning(true);
    audioCues.playListeningStarted();
    try {
      const updated = await headphoneSafety.requestAudioHardwareScan();
      setHeadphoneStatus(updated);
      if (updated.isConnected) {
        audioCues.playSuccess();
        speakText('Audio output verified. Headphones connected.', currentLang);
      } else {
        audioCues.playWarning();
        speakText('No headphones detected. You can proceed without earphones or connect one anytime.', currentLang);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestStereo = () => {
    setTestedAudio(true);
    audioCues.playHeadphoneStereoTest();
    speakText('Left ear audio test, then right ear audio test.', currentLang);
  };

  const handleConfirm = () => {
    audioCues.playSuccess();
    headphoneSafety.confirmEarphonesConnected(true);
    if (!headphoneStatus.isConnected) {
      speakText('Continuing in voice mode. Please be aware of people around you.', currentLang);
    } else {
      speakText('Earphones connected. Private audio vault ready.', currentLang);
    }
    onVerified();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="headphone-modal-title"
      aria-describedby="headphone-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200 text-center relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-700 rounded-full hover:bg-zinc-100 transition cursor-pointer"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}

        {/* Animated Headphone Icon */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-2xl bg-[#FF5500]/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#FF5500] text-white flex items-center justify-center shadow-lg">
            <Headphones className="w-8 h-8" />
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-300 inline-block mb-2">
          Audio Privacy Advisory
        </span>

        <h2 id="headphone-modal-title" className="text-xl sm:text-2xl font-black text-zinc-950 font-display">
          Earphones Recommended
        </h2>

        <p id="headphone-modal-desc" className="text-xs text-zinc-600 mt-2 leading-relaxed">
          SayPay speaks confidential financial balances and transactions aloud. For personal privacy in public spaces, <strong>earphones are recommended</strong> so others cannot listen in. You can also proceed without earphones.
        </p>

        {/* Dual Hardware Detection Badges */}
        <div className="my-5 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-left text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-800 flex items-center gap-2">
              <Cable className="w-4 h-4 text-zinc-600" />
              Wired (3.5mm / USB)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              headphoneStatus.isWired
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-zinc-200 text-zinc-600'
            }`}>
              {headphoneStatus.isWired ? 'Connected' : 'Not Detected'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-800 flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-blue-600" />
              Wireless (Bluetooth / AirPods)
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              headphoneStatus.isWireless
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-zinc-200 text-zinc-600'
            }`}>
              {headphoneStatus.isWireless ? 'Connected' : 'Not Detected'}
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-200 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500 font-medium">Output Device:</span>
            <span className="font-mono font-bold text-zinc-800 truncate max-w-[170px]">
              {headphoneStatus.deviceName}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleScanDevices}
              disabled={isScanning}
              className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Devices'}</span>
            </button>

            <button
              onClick={handleTestStereo}
              className="py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#FF5500]" />
              <span>Test Audio</span>
            </button>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-2xl text-sm font-black transition flex items-center justify-center gap-2 shadow-sm btn-orange text-white cursor-pointer shadow-orange-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {headphoneStatus.isConnected ? 'Continue with Earphones' : 'Continue Without Earphones'}
            </span>
          </button>

          {onSwitchToVisual && (
            <button
              onClick={onSwitchToVisual}
              className="w-full py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition cursor-pointer"
            >
              Switch to Visual Mode
            </button>
          )}

          <p className="text-[10px] text-zinc-400 font-medium">
            Privacy notice: You can use Voice Mode with headphones or speaker at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
