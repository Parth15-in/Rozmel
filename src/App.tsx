import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './firebase';
import {
  UserProfile,
  LedgerWorkspace,
  LedgerMember,
  LedgerTransaction,
  OperationType,
  TransactionType,
  PaymentMethod
} from './types';

// UI components
import AuthScreen from './components/AuthScreen';
import LedgerDashboard from './components/LedgerDashboard';
import QuickEntryScreen from './components/QuickEntryScreen';
import StaffConfigModal from './components/StaffConfigModal';
import { Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication & Profile States
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Business Workspaces States
  const [currentLedger, setCurrentLedger] = useState<LedgerWorkspace | null>(null);
  const [ledgers, setLedgers] = useState<LedgerWorkspace[]>([]);
  const [ledgerMembers, setLedgerMembers] = useState<LedgerMember[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  // Navigation / Modal States
  const [showQuickEntry, setShowQuickEntry] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<LedgerTransaction | null>(null);

  // Monitoring Join Ledger Code via URL query parameter (?joinLedgerId=XYZ)
  const [joinLedgerId, setJoinLedgerId] = useState<string | null>(null);

  useEffect(() => {
    // Collect join ID safely
    const params = new URLSearchParams(window.location.search);
    const ledgerParam = params.get('joinLedgerId');
    if (ledgerParam) {
      setJoinLedgerId(ledgerParam);
    }
  }, []);

  // 1. Initial State: Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
        } catch (err: any) {
          setAppError('Failed to initialize user session: ' + err.message);
        }
      } else {
        setProfile(null);
        setCurrentLedger(null);
        setLedgers([]);
        setLedgerMembers([]);
        setTransactions([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Synchronize / Bootstrap User Profile in Firestore
  const syncUserProfile = async (currentUser: User) => {
    const userRef = doc(db, 'users', currentUser.uid);
    let cachedProfile: UserProfile | null = null;

    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        cachedProfile = userSnap.data() as UserProfile;
      }
    } catch (err) {
      console.warn('Profile read erred, compiling offline fallback...', err);
    }

    if (!cachedProfile) {
      // Create standard Profile structure for brand new sign-ins
      const newProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || '',
        photoURL: currentUser.photoURL || '',
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, newProfile);
        cachedProfile = newProfile;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
      }
    }

    setProfile(cachedProfile);
  };

  // 3. Coordinate Ledger Discovery & Multi-user Invites
  useEffect(() => {
    if (!user || !profile) return;

    // Handle incoming ledger share / join invite link
    if (joinLedgerId) {
      joinSharedLedgerWorkspace(joinLedgerId);
    } else {
      loadLedgerElections();
    }
  }, [user, profile, joinLedgerId]);

  // Method to join a shared ledger from an owner's invite link
  const joinSharedLedgerWorkspace = async (targetLedgerId: string) => {
    if (!user) return;
    try {
      // Verify ledger existency
      const ledgerRef = doc(db, 'ledgers', targetLedgerId);
      const ledgerSnap = await getDoc(ledgerRef);

      if (!ledgerSnap.exists()) {
        throw new Error('The ledger workspace you are trying to join does not exist or has been deleted.');
      }

      const ledgerDetail = ledgerSnap.data() as LedgerWorkspace;

      // Register current user as a staff member of this shared ledger
      const memberRef = doc(db, 'ledgers', targetLedgerId, 'members', user.uid);
      const memberDoc: LedgerMember = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: 'staff',
        joinedAt: new Date().toISOString(),
      };
      await setDoc(memberRef, memberDoc);

      // Update active ledger tracking inside user profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { activeLedgerId: targetLedgerId }, { merge: true });

      // Clean query parameter from address bar
      window.history.replaceState(null, '', window.location.pathname);
      setJoinLedgerId(null);

      // Re-bootstrap user's environment in app
      setProfile((prev) => (prev ? { ...prev, activeLedgerId: targetLedgerId } : null));
    } catch (err: any) {
      setAppError(err.message || 'Error occurred joining shared ledger.');
      // Keep going with their pre-existing ledger setup if dynamic join fails
      setJoinLedgerId(null);
    }
  };

  // Load and subscribe to ledgers the user has access to
  const loadLedgerElections = async () => {
    if (!user || !profile) return;

    const pathLedgers = 'ledgers';
    const q = query(collection(db, pathLedgers), where('createdById', '==', user.uid));

    // Listen to workspaces created by this user
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LedgerWorkspace[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as LedgerWorkspace);
        });

        setLedgers(list);

        // Deduce active ledger context
        determineActiveLedger(list, profile.activeLedgerId);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathLedgers);
      }
    );

    return () => unsubscribe();
  };

  const determineActiveLedger = async (ownedLedgers: LedgerWorkspace[], profileActiveId?: string) => {
    if (!user) return;

    if (profileActiveId) {
      // 1. User has an active workspace selection configured already.
      // Check if it's in their owned ledgers list first
      const foundOwned = ownedLedgers.find((l) => l.id === profileActiveId);
      if (foundOwned) {
        setCurrentLedger(foundOwned);
        return;
      }

      // If it isn't in their owned ledgers, it must be an invited shared staff ledger, fetch it!
      try {
        const ledgerRef = doc(db, 'ledgers', profileActiveId);
        const ledgerSnap = await getDoc(ledgerRef);
        if (ledgerSnap.exists()) {
          setCurrentLedger(ledgerSnap.data() as LedgerWorkspace);
          return;
        }
      } catch (err) {
        console.warn('Staff ledger lookup failed, fallback...', err);
      }
    }

    // 2. If no active ledger context exists or is readable, pick their first owned ledger
    if (ownedLedgers.length > 0) {
      const firstLedger = ownedLedgers[0];
      setCurrentLedger(firstLedger);
      updateActiveLedgerOnProfile(firstLedger.id);
      return;
    }

    // 3. User has no ledger at all. Auto-create their very first "Personal Ledger" workspace to onboard them immediately!
    await handleCreateLedger('My Business Ledger');
  };

  const updateActiveLedgerOnProfile = async (ledgerId: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { activeLedgerId: ledgerId }, { merge: true });
    } catch (err) {
      console.error('Error auto-syncing active ledger profile', err);
    }
  };

  // 4. Create a brand-new ledger workspace
  const handleCreateLedger = async (name: string) => {
    if (!user) return;
    const pathLedger = 'ledgers';
    const ledgerId = 'ledger_' + Math.random().toString(36).substring(2, 11);

    const newLedger: LedgerWorkspace = {
      id: ledgerId,
      name,
      createdById: user.uid,
      createdByEmail: user.email || '',
      createdAt: new Date().toISOString(),
    };

    const ownerMember: LedgerMember = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: 'owner',
      joinedAt: new Date().toISOString(),
    };

    try {
      // OPTIMISTIC UPDATE: Update UI immediately
      setCurrentLedger(newLedger);
      setLedgers((prev) => [...prev, newLedger]);
      setProfile((prev) => (prev ? { ...prev, activeLedgerId: ledgerId } : null));

      // BACKGROUND SYNC: Fire Firestore writes without awaiting
      const userRef = doc(db, 'users', user.uid);
      Promise.all([
        setDoc(doc(db, 'ledgers', ledgerId), newLedger),
        setDoc(doc(db, 'ledgers', ledgerId, 'members', user.uid), ownerMember),
        setDoc(userRef, { activeLedgerId: ledgerId }, { merge: true }),
      ]).catch((err: any) => {
        handleFirestoreError(err, OperationType.WRITE, pathLedger);
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, pathLedger);
    }
  };

  // 5. Select/Switch to an alternative ledger workspace manually
  const handleSelectLedger = async (ledgerId: string) => {
    if (!user) return;
    try {
      // Find ledger from existing ledgers array (instant, no Firestore call needed)
      const selectedLedger = ledgers.find((l) => l.id === ledgerId);
      if (!selectedLedger) return;

      // OPTIMISTIC UPDATE: Update UI immediately
      setCurrentLedger(selectedLedger);
      setProfile((prev) => (prev ? { ...prev, activeLedgerId: ledgerId } : null));
      setShowSettings(false); // Close settings panel instantly

      // BACKGROUND SYNC: Fire Firestore write without awaiting
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { activeLedgerId: ledgerId }, { merge: true }).catch((err) => {
        console.error('Workspace switch sync error', err);
      });
    } catch (err) {
      console.error('Workspace switch error', err);
    }
  };

  // 6. Update an existing ledger name
  const handleUpdateLedgerName = async (ledgerId: string, newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      await setDoc(ledgerRef, { name: newName }, { merge: true });
      
      // Update local state
      setLedgers((prev) =>
        prev.map((l) => (l.id === ledgerId ? { ...l, name: newName } : l))
      );
      
      // Update current ledger if it's the one being edited
      if (currentLedger?.id === ledgerId) {
        setCurrentLedger((prev) => (prev ? { ...prev, name: newName } : null));
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `ledgers/${ledgerId}`);
    }
  };

  // 7. Delete a ledger and all its data
  const handleDeleteLedger = async (ledgerId: string) => {
    if (!user) return;
    try {
      // Prevent deletion of the active ledger
      if (currentLedger?.id === ledgerId) {
        // Switch to another ledger first
        const otherLedger = ledgers.find((l) => l.id !== ledgerId);
        if (otherLedger) {
          await handleSelectLedger(otherLedger.id);
        } else {
          // No other ledger, create a new one
          await handleCreateLedger('My Business Ledger');
        }
      }

      // Delete the ledger document
      const ledgerRef = doc(db, 'ledgers', ledgerId);
      await deleteDoc(ledgerRef);

      // Update local state
      setLedgers((prev) => prev.filter((l) => l.id !== ledgerId));
    } catch (err: any) {
      console.error('Delete ledger error:', err);
      handleFirestoreError(err, OperationType.DELETE, `ledgers/${ledgerId}`);
    }
  };

  // 8. Subscriptions to Active Ledger: Transactions Log & Membership Directory
  useEffect(() => {
    if (!currentLedger) return;

    // Sub A: Chronological Transactions
    const pathTransactions = `ledgers/${currentLedger.id}/transactions`;
    const qTx = query(collection(db, 'ledgers', currentLedger.id, 'transactions'), orderBy('createdAt', 'desc'));

    const unsubscribeTx = onSnapshot(
      qTx,
      (snapshot) => {
        const records: LedgerTransaction[] = [];
        snapshot.forEach((subDoc) => {
          records.push(subDoc.data() as LedgerTransaction);
        });
        setTransactions(records);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathTransactions);
      }
    );

    // Sub B: Live Members Directory
    const pathMembers = `ledgers/${currentLedger.id}/members`;
    const unsubscribeMembers = onSnapshot(
      collection(db, 'ledgers', currentLedger.id, 'members'),
      (snapshot) => {
        const list: LedgerMember[] = [];
        snapshot.forEach((subDoc) => {
          list.push(subDoc.data() as LedgerMember);
        });
        setLedgerMembers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathMembers);
      }
    );

    return () => {
      unsubscribeTx();
      unsubscribeMembers();
    };
  }, [currentLedger]);

  // 7. Core Transaction Log Actions (Save / Delete)
  const handleSaveTransaction = async (
    data: {
      type: TransactionType;
      amount: number;
      paymentMethod: PaymentMethod;
      remarks: string;
      category?: string;
      createdAt?: string;
      notes?: string;
    },
    editId?: string
  ) => {
    if (!user) {
      throw new Error('You must be signed in to log a transaction.');
    }
    if (!currentLedger) {
      throw new Error('No active business ledger found. Please create or join a ledger first.');
    }

    const txId = editId || ('tx_' + Math.random().toString(36).substring(2, 12));
    const pathTx = `ledgers/${currentLedger.id}/transactions/${txId}`;

    let finalCreatedById = user.uid;
    let finalCreatedByEmail = user.email || '';
    let finalCreatedByDisplayName = user.displayName || user.email?.split('@')[0] || 'Staff';

    if (editId && editingTransaction && editingTransaction.id === editId) {
      finalCreatedById = editingTransaction.createdById;
      finalCreatedByEmail = editingTransaction.createdByEmail || '';
      finalCreatedByDisplayName = editingTransaction.createdByDisplayName || '';
    }

    const transactionDoc: LedgerTransaction = {
      id: txId,
      type: data.type,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      remarks: data.remarks,
      category: data.category || 'Other / इतर',
      createdById: finalCreatedById,
      createdByEmail: finalCreatedByEmail,
      createdByDisplayName: finalCreatedByDisplayName,
      createdAt: data.createdAt || new Date().toISOString(),
      ...(data.notes !== undefined ? { notes: data.notes.trim() } : {}),
    };

    try {
      // Write to Firestore db (resolves instantly to local cache)
      await setDoc(doc(db, 'ledgers', currentLedger.id, 'transactions', txId), transactionDoc);
      setEditingTransaction(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pathTx);
      throw err;
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!currentLedger) return;
    const pathTx = `ledgers/${currentLedger.id}/transactions/${txId}`;
    try {
      await deleteDoc(doc(db, 'ledgers', currentLedger.id, 'transactions', txId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathTx);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Signout erred', err);
    }
  };

  // Rendering loading indicator during initial checks
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-3" />
        <p className="text-xs text-gray-500 font-semibold tracking-wide">
          Verifying Rojmel credentials...
        </p>
      </div>
    );
  }

  // Auth Guard: Unauthenticated state
  if (!user) {
    return <AuthScreen onAuthError={(msg) => setAppError(msg)} />;
  }

  return (
    <div className="bg-[#121212] min-h-screen">
      {/* Dynamic App-Level Error Message Banner */}
      {appError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-sm bg-red-600 text-white rounded-2xl p-4 shadow-2xl border border-red-500 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-200 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold">System Notification</h4>
            <p className="text-red-100 mt-0.5">{appError}</p>
            <button
              onClick={() => setAppError(null)}
              className="mt-2 text-[10px] font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md cursor-pointer transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      <LedgerDashboard
        currentLedger={currentLedger}
        transactions={transactions}
        members={ledgerMembers}
        userEmail={user.email || ''}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
        onOpenQuickEntry={() => {
          setEditingTransaction(null);
          setShowQuickEntry(true);
        }}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={(tx) => {
          setEditingTransaction(tx);
          setShowQuickEntry(true);
        }}
      />

      {/* THREE-SECOND QUICK TRANSACTION INPUT SCREEEN */}
      {showQuickEntry && (
        <QuickEntryScreen
          onSave={handleSaveTransaction}
          onClose={() => {
            setShowQuickEntry(false);
            setEditingTransaction(null);
          }}
          editTransaction={editingTransaction}
          transactions={transactions}
        />
      )}

      {/* BUSINESS MULTIPLAYER WORKSPACE CONFIGURATION SCREEN */}
      {showSettings && (
        <StaffConfigModal
          currentLedger={currentLedger}
          ledgers={ledgers}
          members={ledgerMembers}
          onClose={() => setShowSettings(false)}
          onCreateLedger={handleCreateLedger}
          onSelectLedger={handleSelectLedger}
          onUpdateLedgerName={handleUpdateLedgerName}
          onDeleteLedger={handleDeleteLedger}
        />
      )}
    </div>
  );
}
