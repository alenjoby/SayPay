import React, { useState, useEffect } from 'react';
import { Headphones, ShieldAlert, CheckCircle2, Volume2, ArrowRight, Radio } from 'lucide-react';
import { audioCues } from '../utils/audioCues';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { headphoneSafety, HeadphoneStatus } from '../utils/headphoneDetector';

interface HeadphoneSafetyModalProps {
  isOpen: boolean;
  currentLang: SupportedLanguage;
  onVerified: () => void;
  onClose?: () => void;
}

export const HeadphoneSafetyModal: React.FC<HeadphoneSafetyModalProps> = ({
  isOpen,
  currentLang,
  onVerified,
  onClose,
}) => {
  const [headphoneStatus, setHeadphoneStatus] = useState<HeadphoneStatus>(headphoneSafety.getStatus());
  const [testedAudio, setTestedAudio] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    audioCues.playWarning();

    const warningSpeech =
      currentLang === 'hi'
        ? 'सुरक्षा चेतावनी: वॉइस-असिस्टेड मोड में, आपकी वित्तीय गोपनीयता की रक्षा के लिए ईयरफ़ोन या हेडफ़ोन जुड़े होना अनिवार्य है। कृपया अपने हेडफ़ोन कनेक्ट करें।'
        : currentLang === 'ar'
        ? 'تنبيه أمني: لحماية خصوصيتك المالية ورصيدك من المتنصتين، يجب توصيل سماعات الأذن للمتابعة في الوضع الصوتي.'
        : 'Privacy Requirement: In Voice-Assisted Mode, earphones or headphones are mandatory to prevent acoustic eavesdropping of your balance and transactions. Please connect your headphones to proceed.';

    speakText(warningSpeech, currentLang);

    const unsubscribe = headphoneSafety.onStatusChange((status) => {
      setHeadphoneStatus(status);
      if (status.isConnected && !status.isVerified) {
        audioCues.playSuccess();
        speakText('Headphones detected. Please test stereo audio or confirm to proceed.', currentLang);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, currentLang]);

  if (!isOpen) return null;

  const handleTestStereo = () => {
    setTestedAudio(true);
    audioCues.playHeadphoneStereoTest();
    speakText('Left channel, then right channel.', currentLang);
  };

  const handleConfirm = () => {
    audioCues.playSuccess();
    headphoneSafety.confirmEarphonesConnected(true);
    speakText('Earphones verified. Private audio vault unlocked.', currentLang);
    onVerified();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="headphone-modal-title"
      aria-describedby="headphone-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-[#FF5500] text-center">
        {/* Animated Headphone Pulsing Icon */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-[#FF5500]/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-[#FF5500] text-white flex items-center justify-center shadow-lg">
            <Headphones className="w-10 h-10" />
          </div>
        </div>

        <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF5500]/10 text-[#FF5500] inline-block mb-2">
          Mandatory Financial Privacy
        </span>

        <h2 id="headphone-modal-title" className="text-xl sm:text-2xl font-black text-zinc-950 font-display">
          Earphones Required
        </h2>

        <p id="headphone-modal-desc" className="text-xs text-zinc-600 mt-2 leading-relaxed">
          SayPay auto-reads confidential crypto balances, recipient contacts, and transaction amounts. To protect you from acoustic shoulder-surfing in public, <strong>earphones must be connected</strong>.
        </p>

        {/* Live Audio Hardware State */}
        <div className="my-5 p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-left text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-700 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#FF5500]" />
              Audio Output Channel
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-800 truncate max-w-[170px]">
              {headphoneStatus.deviceName || 'Detecting Output...'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-700">Privacy Status</span>
            <span className={`text-[11px] font-extrabold flex items-center gap-1 ${
              headphoneStatus.isConnected ? 'text-emerald-700' : 'text-[#FF5500]'
            }`}>
              {headphoneStatus.isConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Earphones Detected
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Loudspeaker Muted
                </>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleTestStereo}
            className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4 text-[#FF5500]" />
            <span>{testedAudio ? 'Play Stereo Test Again' : 'Test Stereo Earphone Audio'}</span>
          </button>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 rounded-2xl btn-orange text-white text-sm font-black transition flex items-center justify-center gap-2 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Have Earphones Connected</span>
          </button>

          <p className="text-[10px] text-zinc-400 font-medium">
            Voice command: You can also say &quot;Earphones connected&quot; to unlock immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
