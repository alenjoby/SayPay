import React from 'react';
import { Users, Plus, Send, Check, Phone } from 'lucide-react';
import { Contact } from '../utils/walletState';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

interface ContactsModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentLang: SupportedLanguage;
  onClose: () => void;
  onSelectForSend: (contact: Contact) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  contacts,
  currentLang,
  onClose,
  onSelectForSend,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contacts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00E575]/15 text-[#00A850] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#00A850]">
                Human-Readable Book
              </span>
              <h2 id="contacts-title" className="text-xl font-black text-slate-900">
                Trusted Contacts
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

        <p className="text-xs text-slate-600 mt-3 mb-4 leading-relaxed">
          SayPay maps 42-character testnet hex addresses to human names. Blind users never have to memorize or verify raw crypto strings.
        </p>

        {/* Contacts List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#00E575]/50 transition group"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl ${contact.avatarBg} text-white flex items-center justify-center font-bold text-sm shadow-sm`}
                >
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{contact.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {contact.relationship}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 block truncate max-w-[180px] sm:max-w-xs">
                    {contact.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    audioCues.playIntentRecognized();
                    speakText(`Contact ${contact.name}, ${contact.relationship}. Address ending in ${contact.address.slice(-4)}.`, currentLang);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                  title="Read aloud"
                >
                  Read
                </button>
                <button
                  onClick={() => {
                    audioCues.playSuccess();
                    onSelectForSend(contact);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#00E575] hover:bg-[#00C853] text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Phonetic matching enabled</span>
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
