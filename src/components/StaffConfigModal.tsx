import React, { useState } from 'react';
import { LedgerWorkspace, LedgerMember } from '../types';
import { X, Copy, Check, Users, Plus, Shield, ArrowRight, BookOpen, AlertCircle, Pencil, Trash2 } from 'lucide-react';

interface StaffConfigModalProps {
  currentLedger: LedgerWorkspace | null;
  ledgers: LedgerWorkspace[];
  members: LedgerMember[];
  onClose: () => void;
  onCreateLedger: (name: string) => Promise<void>;
  onSelectLedger: (id: string) => void;
  onUpdateLedgerName: (id: string, newName: string) => Promise<void>;
  onDeleteLedger: (id: string) => Promise<void>;
}

export default function StaffConfigModal({
  currentLedger,
  ledgers,
  members,
  onClose,
  onCreateLedger,
  onSelectLedger,
  onUpdateLedgerName,
  onDeleteLedger,
}: StaffConfigModalProps) {
  const [newLedgerName, setNewLedgerName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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

  const handleEditStart = (ledger: LedgerWorkspace) => {
    setEditingLedgerId(ledger.id);
    setEditingName(ledger.name);
  };

  const handleEditSubmit = async (ledgerId: string) => {
    if (!editingName.trim() || editingName === ledgers.find((l) => l.id === ledgerId)?.name) {
      setEditingLedgerId(null);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateLedgerName(ledgerId, editingName.trim());
      setEditingLedgerId(null);
    } catch (err) {
      console.error('Failed to update ledger name', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = async (ledgerId: string) => {
    if (window.confirm('Are you sure you want to delete this ledger? This action cannot be undone.')) {
      setIsDeleting(ledgerId);
      try {
        await onDeleteLedger(ledgerId);
      } catch (err) {
        console.error('Failed to delete ledger', err);
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Card */}
      <div className="bg-[#faf9f6] w-full max-w-lg rounded-[28px] border border-gray-200 shadow-[0_35px_80px_-20px_rgba(15,23,42,0.25)] overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-white border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Workspace Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition"
            aria-label="Close Workspace Settings"
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
            
            <form onSubmit={handleCreateSubmit} className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newLedgerName}
                onChange={(e) => setNewLedgerName(e.target.value)}
                placeholder="e.g., Mahavir Kirana Shop"
                autoFocus
                className="flex-1 min-w-[220px] bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={isCreating || !newLedgerName.trim()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
                <div key={l.id} className="group">
                  {editingLedgerId === l.id ? (
                    // EDIT MODE
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        className="flex-1 bg-white border border-emerald-500 rounded-2xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                      />
                      <button
                        onClick={() => handleEditSubmit(l.id)}
                        disabled={isUpdating}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingLedgerId(null)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-xl text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    // DISPLAY MODE
                    <button
                      onClick={() => onSelectLedger(l.id)}
                      className={`w-full text-left p-3 rounded-2xl flex items-center justify-between border text-xs transition cursor-pointer ${
                        currentLedger?.id === l.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate flex-1">{l.name}</span>
                      <div className="flex items-center gap-2">
                        {currentLedger?.id === l.id && (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                        {/* Edit & Delete Buttons */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(l);
                            }}
                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                            title="Edit name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(l.id);
                            }}
                            disabled={isDeleting === l.id}
                            className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition disabled:opacity-40"
                            title="Delete ledger"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: SHARE SYNC LINK */}
          {currentLedger && (
            <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100/70 space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-emerald-900 uppercase tracking-[0.18em] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Share Ledger Link</span>
                </h3>
                <p className="text-[12px] text-emerald-700 mt-1 leading-5">
                  Share this secure invite link with staff. When they sign in, they get access to the current ledger immediately.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-[220px] bg-white border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-slate-700 font-mono select-all focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-800"
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
