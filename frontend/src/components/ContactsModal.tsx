import React, { useState } from 'react';
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
} from 'lucide-react';
import { Contact } from '../utils/walletState';
import { speakText, SupportedLanguage } from '../utils/i18n';
import { audioCues } from '../utils/audioCues';

interface ContactsModalProps {
  isOpen: boolean;
  contacts: Contact[];
  currentLang: SupportedLanguage;
  onClose: () => void;
  onSelectForSend: (contact: Contact) => void;
  onAddContact?: (newContact: Contact) => void;
  onDeleteContact?: (id: string) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  contacts,
  currentLang,
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

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    const colors = ['bg-emerald-600', 'bg-slate-900', 'bg-blue-600', 'bg-violet-600', 'bg-teal-600'];
    const randomBg = colors[Math.floor(Math.random() * colors.length)];

    const created: Contact = {
      id: `c_${Date.now()}`,
      name: newName.trim(),
      address: newAddress.trim(),
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
    setShowAddForm(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contacts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00E575]/15 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Human-Readable Book
              </span>
              <h2 id="contacts-modal-title" className="text-xl font-black text-slate-900 font-display">
                Address Book ({contacts.length})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold transition"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Subhead / Blind-Accessibility explanation */}
        <div className="text-xs text-slate-600 mt-3 mb-3 leading-relaxed shrink-0">
          SayPay replaces complicated 42-character hex addresses with human names. Blind users can select recipients by voice or tap without verifying raw hexadecimal strings.
        </div>

        {/* Search & Add Action Bar */}
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, relation, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00E575]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2.5 rounded-xl btn-lime text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>{showAddForm ? 'Cancel' : 'Add Contact'}</span>
          </button>
        </div>

        {/* Add Contact Inline Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleSaveContact}
            className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shrink-0 animate-fade-in"
          >
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-display">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add New Trusted Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Name / Spoken Label:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amma, Rahul, Sister"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E575]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Relationship:
                </label>
                <select
                  value={newRelationship}
                  onChange={(e) => setNewRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E575]"
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
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Sepolia Address:
              </label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00E575]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg btn-lime text-xs font-black shadow-sm"
              >
                Save Contact
              </button>
            </div>
          </form>
        )}

        {/* Contacts Scrollable List */}
        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-[220px]">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs font-medium">
              No contacts found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#00E575] hover:shadow-sm transition group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl ${contact.avatarBg} text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0`}
                  >
                    {contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 truncate">
                        {contact.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">
                        {contact.relationship}
                      </span>
                      {contact.isRecent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00E575]/15 text-emerald-800 font-bold shrink-0">
                          Recent
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-500 block truncate max-w-[200px] sm:max-w-xs mt-0.5">
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
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                    title="Read details aloud"
                    aria-label={`Read details for ${contact.name}`}
                  >
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                  </button>

                  {/* Send Button */}
                  <button
                    onClick={() => {
                      audioCues.playSuccess();
                      onSelectForSend(contact);
                    }}
                    className="px-3.5 py-2 rounded-xl btn-lime text-xs font-black transition flex items-center gap-1.5 shadow-sm"
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
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Phonetic Name Matching Active &bull; Zero Hex Verification
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
