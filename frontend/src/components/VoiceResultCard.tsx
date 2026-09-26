import React from 'react';

export interface VoiceCard {
  heard: string;
  intent: string;
  confidence: number;
  reply: string;
  status: 'ok' | 'ask' | 'blocked' | 'fallback';
  lang?: string;
}

interface VoiceResultCardProps {
  card: VoiceCard | null;
  listening: boolean;
  processing?: boolean;
  transcript: string;
}

const INTENT_LABELS: Record<string, string> = {
  check_balance: 'Check balance',
  send: 'Send money',
  receive: 'Receive money',
  history: 'Show transactions',
  tx_status: 'Transaction status',
  add_contact: 'Add contact',
  recovery_help: 'Account recovery',
  guardians: 'Account recovery',
  contacts: 'Contacts',
  settings: 'Settings',
  cancel: 'Cancel',
  help: 'Help',
  unknown: 'Voice command',
};

export const VoiceResultCard: React.FC<VoiceResultCardProps> = ({
  card,
  listening,
  processing,
  transcript,
}) => {
  if (listening) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-auto max-w-lg w-full bg-zinc-950/95 text-white rounded-2xl p-4 shadow-2xl border border-zinc-800 backdrop-blur-xl mb-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
            Listening...
          </span>
        </div>
        <p className="text-white text-sm font-medium italic">
          {transcript ? `"${transcript}"` : 'Say a command...'}
        </p>
      </div>
    );
  }

  if (processing) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-auto max-w-lg w-full bg-zinc-950/95 text-white rounded-2xl p-4 shadow-2xl border border-orange-500/40 backdrop-blur-xl mb-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
          <span className="text-[11px] font-semibold text-orange-400 tracking-wider uppercase">
            Processing Speech...
          </span>
        </div>
        <p className="text-white text-sm font-medium">
          {transcript ? `"${transcript}"` : 'Analyzing command with SayPay AI...'}
        </p>
      </div>
    );
  }

  if (!card) return null;

  const intentLabel = INTENT_LABELS[card.intent] || 'Voice command';

  let statusDotColor = 'bg-emerald-400';
  let statusDetail: string | null = null;

  if (card.status === 'ask') {
    statusDotColor = 'bg-amber-400';
    statusDetail = 'Needs a detail';
  } else if (card.status === 'blocked') {
    statusDotColor = 'bg-rose-500';
    statusDetail = 'Not allowed';
  } else if (card.status === 'fallback') {
    statusDotColor = 'bg-zinc-400';
    statusDetail = 'Basic parser';
  }

  const confidencePct = Math.round(card.confidence * 100);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-auto max-w-lg w-full bg-zinc-950/95 text-white rounded-2xl p-4 shadow-2xl border border-zinc-800 backdrop-blur-xl mb-3 text-left animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase mb-1">
        YOU SAID
      </div>
      <div className="text-white text-sm font-medium mb-2.5">
        &ldquo;{card.heard}&rdquo;
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-400 mb-2.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700/70 text-white font-medium text-xs">
          <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          {intentLabel}
        </span>
        {card.status !== 'fallback' && (
          <span>{confidencePct}% sure</span>
        )}
        {statusDetail && (
          <>
            <span>&middot;</span>
            <span>{statusDetail}</span>
          </>
        )}
      </div>

      <div className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase mb-1">
        SAYPAY SAYS
      </div>
      <div className="text-zinc-200 text-sm leading-relaxed">
        {card.reply || 'Processing your request...'}
      </div>
    </div>
  );
};
