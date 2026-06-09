import React, { useState } from 'react';
import { LedgerWorkspace, LedgerMember } from '../types';
import { X, Copy, Check, Users, Plus, Shield, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

interface StaffConfigModalProps {
  currentLedger: LedgerWorkspace | null;
  ledgers: LedgerWorkspace[];
  members: LedgerMember[];
  onClose: () => void;
  onCreateLedger: (name: string) => Promise<void>;
  onSelectLedger: (id: string) => void;
}

export default function StaffConfigModal({
  currentLedger,
  ledgers,
  members,
  onClose,
  onCreateLedger,
  onSelectLedger,
}: StaffConfigModalProps) {
  const [newLedgerName, setNewLedgerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate Invite URL
  const generateInviteLink = () => {
    if (!currentLedger) return '';
    const origin = window.location.origin + window.location.pathname;
    return `${origin}?joinLedgerId=${currentLedger.id}`;
  };

  const inviteLink = generateInviteLink();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      await onCreateLedger(newLedgerName.trim());
      setNewLedgerName('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create ledger.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="bg-[#faf9f6] w-full max-w-md rounded-3xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-800">Workspace Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 1: CREATE NEW LEDGER */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Create New Ledger</span>
            </h3>
            
            <form onSubmit={handleCreateSubmit} className="flex gap-2">
              <input
                type="text"
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                placeholder="e.g., Mahavir Kirana Shop"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isCreating || !newLedgerName.trim()}
                className="bg-emerald-600 text-white rounded-xl px-4 text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 transition cursor-pointer"
              >
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </form>
            {createError && (
              <p className="text-[11px] text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{createError}</span>
              </p>
            )}
          </div>

          {/* SECTION 2: SELECT WORKSPACE */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Your Ledgers ({ledgers.length})
            </h3>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {ledgers.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelectLedger(l.id)}
                  className={`w-full text-left p-3 rounded-2xl flex items-center justify-between border text-xs transition cursor-pointer ${
                    currentLedger?.id === l.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{l.name}</span>
                  {currentLedger?.id === l.id && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: SHARE SYNC LINK */}
          {currentLedger && (
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Share Ledger Link (Staff/Multiplayer)</span>
                </h3>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Share this link with your staff. When they sign in using Google, they will get access to view and add rojmel transactions in real-time.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 bg-white border border-emerald-200/60 rounded-xl px-3 py-2 text-xs text-gray-600 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="bg-gray-900 text-white rounded-xl px-3 hover:bg-gray-800 transition text-xs font-bold flex items-center justify-center cursor-pointer gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: TEAM MEMBERS IN CURRENT LEDGER */}
          {currentLedger && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Staff & Owner Access List ({members.length})
              </h3>
              <div className="bg-white rounded-2xl border border-gray-150 divide-y divide-gray-100 overflow-hidden">
                {members.length === 0 ? (
                  <p className="p-4 text-xs text-gray-400 text-center">Loading member directory...</p>
                ) : (
                  members.map((m) => (
                    <div key={m.uid} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {m.displayName || m.email.split('@')[0]}
                        </div>
                        <div className="text-[10px] text-gray-400">{m.email}</div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.role === 'owner'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {m.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
