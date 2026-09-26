import React, { useState, useEffect, useRef } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
import {
  Users,
  Plus,
  Send,
  Search,
  UserCheck,
  Trash2,
  Volume2,
  Check,
  UserPlus,
  X,
  Phone,
  ArrowRight,
  AlertCircle,
  Mic,
  MicOff,
} from 'lucide-react';
import { Contact } from '../utils/walletState';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

export type ContactsVoiceAction =
  | { type: 'open_add' }
  | { type: 'set_name'; value: string }
  | { type: 'set_address'; value: string }
  | { type: 'search'; value: string }
  | { type: 'save' }
  | null;

interface ContactsModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentLang: SupportedLanguage;
  /** Voice "save this as Ravi": open the add form with this name filled in. */
  initialNewName?: string;
  voiceAction?: ContactsVoiceAction;
  onClearVoiceAction?: () => void;
  onClose: () => void;
  onSelectForSend: (contact: Contact) => void;
  onAddContact?: (newContact: Contact) => void;
  onDeleteContact?: (id: string) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  contacts,
  currentLang,
  initialNewName,
  voiceAction,
  onClearVoiceAction,
  onClose,
  onSelectForSend,
  onAddContact,
  onDeleteContact,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newRelationship, setNewRelationship] = useState('Friend');
  const [formError, setFormError] = useState<string | null>(null);
  const [activeMicField, setActiveMicField] = useState<'search' | 'name' | 'address' | null>(null);

  // Audio orientation when modal opens
  useEffect(() => {
    if (isOpen) {
      audioCues.playIntentRecognized();
      const prompt =
        currentLang === 'hi'
          ? `एड्रेस बुक खुल गई है। आपके पास ${contacts.length} संपर्क हैं। नया संपर्क जोड़ने के लिए 'ऐड कांटेक्ट' कहें, या 'बंद करो' कहें।`
          : currentLang === 'ar'
          ? `تم فتح دفتر العناوين. لديك ${contacts.length} جهات اتصال. يمكنك قول 'إضافة جهة اتصال'، أو البحث بالاسم، أو قول 'إغلاق'.`
          : `Address Book opened. You have ${contacts.length} saved contacts. You can say 'Add contact', say a name to search, or say 'Close'.`;
      speakText(prompt, currentLang);
    }
  }, [isOpen, currentLang]);

  useEffect(() => {
    if (isOpen && initialNewName) {
      setShowAddForm(true);
      setNewName(initialNewName);
    }
  }, [isOpen, initialNewName]);

  // Execute Save Contact logic (with automatic mock address fallback for voice users)
  const executeSaveContact = (customName?: string, customAddr?: string) => {
    setFormError(null);
    const trimmedName = (customName !== undefined ? customName : newName).trim();
    const rawAddress = (customAddr !== undefined ? customAddr : newAddress).trim();

    if (!trimmedName) {
      setFormError('Please fill in the contact name.');
      audioCues.playWarning();
      speakText('Please fill in the contact name.', currentLang);
      return;
    }

    const isDuplicate = contacts.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setFormError(`A contact named "${trimmedName}" already exists in your address book.`);
      audioCues.playWarning();
      speakText(`A contact named ${trimmedName} already exists in your address book.`, currentLang);
      return;
    }

    let finalAddress = rawAddress;
    if (!finalAddress) {
      const randHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      finalAddress = `0x${randHex}`;
    } else {
      const isValidEth = /^0x[a-fA-F0-9]{40}$/.test(finalAddress);
      if (!isValidEth) {
        setFormError('Invalid Ethereum address. Must be a 42-character hex address starting with 0x.');
        audioCues.playWarning();
        speakText('Invalid address format. Please enter a valid 42-character 0x address.', currentLang);
        return;
      }
    }

    const colors = ['bg-emerald-600', 'bg-slate-900', 'bg-blue-600', 'bg-violet-600', 'bg-teal-600'];
    const randomBg = colors[Math.floor(Math.random() * colors.length)];

    const created: Contact = {
      id: `c_${Date.now()}`,
      name: trimmedName,
      address: finalAddress,
      relationship: newRelationship,
      avatarBg: randomBg,
      isRecent: true,
    };

    if (onAddContact) {
      onAddContact(created);
    }
    audioCues.playSuccess();
    const speech = `Contact ${created.name} added to your trusted address book.`;
    speakText(speech, currentLang);

    setNewName('');
    setNewAddress('');
    setFormError(null);
    setShowAddForm(false);
  };

  // Handle external voice actions from main voice bar
  useEffect(() => {
    if (!isOpen || !voiceAction) return;

    if (voiceAction.type === 'open_add') {
      setShowAddForm(true);
      audioCues.playIntentRecognized();
    } else if (voiceAction.type === 'set_name') {
      setShowAddForm(true);
      setNewName(voiceAction.value);
      audioCues.playSuccess();
    } else if (voiceAction.type === 'set_address') {
      setShowAddForm(true);
      setNewAddress(voiceAction.value);
      audioCues.playSuccess();
    } else if (voiceAction.type === 'search') {
      setSearchQuery(voiceAction.value);
      audioCues.playIntentRecognized();
    } else if (voiceAction.type === 'save') {
      executeSaveContact();
    }

    if (onClearVoiceAction) {
      onClearVoiceAction();
    }
  }, [voiceAction, isOpen]);

  // Inline Speech Recognition for specific inputs
  const startListeningForField = (field: 'search' | 'name' | 'address') => {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'ar' ? 'ar-SA' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setActiveMicField(field);
        audioCues.playListeningStarted();
      };

      rec.onresult = (evt: any) => {
        const spoken = evt.results[0][0].transcript.trim().replace(/[.,!?]/g, '');
        audioCues.playSuccess();
        if (field === 'search') {
          setSearchQuery(spoken);
          speakText(`Searching for ${spoken}`, currentLang);
        } else if (field === 'name') {
          setNewName(spoken);
          speakText(`Name set to ${spoken}`, currentLang);
        } else if (field === 'address') {
          setNewAddress(spoken);
        }
      };

      rec.onerror = () => {
        setActiveMicField(null);
      };

      rec.onend = () => {
        setActiveMicField(null);
      };

      rec.start();
    } catch {
      setActiveMicField(null);
    }
  };

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    executeSaveContact();
  };

  return (
    <AccessibleDialog
      onClose={onClose}
      aria-labelledby="contacts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Human-Readable Book
              </span>
              <h2 id="contacts-modal-title" className="text-xl font-black text-zinc-900 font-display">
                Address Book ({contacts.length})
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

        {/* Subhead / Blind-Accessibility explanation */}
        <div className="text-xs text-zinc-600 mt-3 mb-3 leading-relaxed shrink-0">
          SayPay replaces complicated 42-character hex addresses with human names. Blind users can select recipients by voice or tap without verifying raw hexadecimal strings.
        </div>

        {/* Search & Add Action Bar */}
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, relation, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-600 text-xs px-1 cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => startListeningForField('search')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  activeMicField === 'search'
                    ? 'bg-[#FF5500] text-white animate-pulse'
                    : 'text-zinc-400 hover:text-[#FF5500] hover:bg-orange-50'
                }`}
                title="Speak to search contacts"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2.5 rounded-xl btn-orange text-white text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>{showAddForm ? 'Cancel' : 'Add Contact'}</span>
          </button>
        </div>

        {/* Add Contact Inline Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleSaveContact}
            className="mb-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 shrink-0 animate-fade-in"
          >
            <div className="text-xs font-bold text-zinc-900 flex items-center justify-between font-display">
              <div className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#FF5500]" />
                <span>Add New Trusted Contact</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Voice or manual entry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                  Name / Spoken Label:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amma, Priya, Sister"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 pr-9 bg-white rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                  />
                  <button
                    type="button"
                    onClick={() => startListeningForField('name')}
                    className={`absolute right-1.5 p-1.5 rounded-lg transition cursor-pointer ${
                      activeMicField === 'name'
                        ? 'bg-[#FF5500] text-white animate-pulse'
                        : 'text-zinc-400 hover:text-[#FF5500] hover:bg-orange-50'
                    }`}
                    title="Speak contact name"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                  Relationship:
                </label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                >
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Merchant">Merchant</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-zinc-600">
                  Sepolia Address:
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">Auto-generated if blank</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="0x... (leave empty to auto-generate mock address)"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-white rounded-xl border border-zinc-200 font-mono text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#FF5500]"
                />
                <button
                  type="button"
                  onClick={() => startListeningForField('address')}
                  className={`absolute right-1.5 p-1.5 rounded-lg transition cursor-pointer ${
                    activeMicField === 'address'
                      ? 'bg-[#FF5500] text-white animate-pulse'
                      : 'text-zinc-400 hover:text-[#FF5500] hover:bg-orange-50'
                  }`}
                  title="Speak address"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 text-xs font-semibold hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg btn-orange text-white text-xs font-black shadow-sm"
              >
                Save Contact
              </button>
            </div>
          </form>
        )}

        {/* Contacts Scrollable List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-[220px]">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-xs font-medium">
              No contacts found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 bg-white hover:border-[#FF5500] hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl ${contact.avatarBg} text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0`}
                  >
                    {contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-zinc-900 truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold shrink-0">
                        {contact.relationship}
                      </span>
                      {contact.isRecent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FF5500]/10 text-[#FF5500] font-bold shrink-0">
                          Recent
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-zinc-500 block truncate max-w-[200px] sm:max-w-xs mt-0.5">
                      {contact.address}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Read Aloud Button */}
                  <button
                    onClick={() => {
                      audioCues.playIntentRecognized();
                      speakText(
                        `Contact ${contact.name}, ${contact.relationship}. Address ending in ${contact.address.slice(-4)}.`,
                        currentLang
                      );
                    }}
                    className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition"
                    title="Read details aloud"
                    aria-label={`Read details for ${contact.name}`}
                  >
                    <Volume2 className="w-4 h-4 text-[#FF5500]" />
                  </button>

                  {/* Send Button */}
                  <button
                    onClick={() => {
                      audioCues.playSuccess();
                      onSelectForSend(contact);
                    }}
                    className="px-3.5 py-2 rounded-xl btn-orange text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>

                  {/* Delete button (if handler provided) */}
                  {onDeleteContact && (
                    <button
                      onClick={() => {
                        audioCues.playWarning();
                        onDeleteContact(contact.id);
                      }}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500 font-medium">
            Phonetic Name Matching Active &bull; Zero Hex Verification
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
};
