import React, { useState, useMemo, useEffect } from 'react';
import { TransactionType, PaymentMethod, LedgerTransaction } from '../types';
import { ArrowLeft, Wallet, Smartphone, BookOpen, AlertCircle, Save, Plus, Check, Calendar, ChevronRight, X, Sparkles, IndianRupee, MessageSquare, Tag, ShoppingBag, TrendingUp, Home, Users, Zap, Car, Coffee, Wrench, Package, Layers, Trash2, ListPlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkEntryRow {
  id: string;
  type: TransactionType;
  amountStr: string;
  category: string;
  otherText?: string;
  remarks: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

interface QuickEntryScreenProps {
  onSave: (
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
  ) => Promise<void>;
  onClose: () => void;
  editTransaction?: LedgerTransaction | null;
  transactions: LedgerTransaction[];
}

const getFirstEmoji = (str: string): string | null => {
  if (!str) return null;
  const trimmed = str.trim();
  const cp = trimmed.codePointAt(0);
  if (cp) {
    if (
      (cp >= 0x1F300 && cp <= 0x1FAFF) || 
      (cp >= 0x1F600 && cp <= 0x1F64F) ||
      (cp >= 0x1F680 && cp <= 0x1F6FF) ||
      (cp >= 0x2600 && cp <= 0x27BF) ||
      (cp >= 0x1F1E0 && cp <= 0x1F1FF) || 
      (cp >= 0x1F900 && cp <= 0x1F9FF) ||
      (cp >= 0x2300 && cp <= 0x23FF) ||   
      (cp >= 0x2B50 && cp <= 0x2B55)      
    ) {
      return String.fromCodePoint(cp);
    }
  }
  return null;
};

const cleanCategoryName = (category?: string) => {
  if (!category) return 'Other';
  const trimmed = category.trim();
  const emoji = getFirstEmoji(trimmed);
  const cleaned = emoji ? trimmed.slice(emoji.length).trim() : trimmed;
  return cleaned.split(' / ')[0];
};

const getCategoryIcon = (category?: string) => {
  const iconClass = 'w-3.5 h-3.5';
  if (!category) return <Tag className={iconClass} />;
  const normalized = cleanCategoryName(category).toLowerCase();
  if (normalized.includes('sale') || normalized.includes('विक्री')) return <ShoppingBag className={iconClass} />;
  if (normalized.includes('payment') || normalized.includes('पेमेंट') || normalized.includes('commission') || normalized.includes('कमिशन')) return <IndianRupee className={iconClass} />;
  if (normalized.includes('interest') || normalized.includes('व्याज')) return <TrendingUp className={iconClass} />;
  if (normalized.includes('rent') || normalized.includes('भाडे')) return <Home className={iconClass} />;
  if (normalized.includes('salary') || normalized.includes('पगार')) return <Users className={iconClass} />;
  if (normalized.includes('purchase') || normalized.includes('खरेदी')) return <ShoppingBag className={iconClass} />;
  if (normalized.includes('bill') || normalized.includes('बिले')) return <Zap className={iconClass} />;
  if (normalized.includes('travel') || normalized.includes('प्रवास')) return <Car className={iconClass} />;
  if (normalized.includes('snack') || normalized.includes('tea') || normalized.includes('चहा') || normalized.includes('नाश्ता')) return <Coffee className={iconClass} />;
  if (normalized.includes('repair') || normalized.includes('maintenance') || normalized.includes('दुरुस्ती')) return <Wrench className={iconClass} />;
  return <Tag className={iconClass} />;
};

const getPaymentMethodIcon = (method: PaymentMethod) => {
  const iconClass = 'w-4 h-4';
  if (method === 'CASH') return <IndianRupee className={iconClass} />;
  if (method === 'UPI') return <Smartphone className={iconClass} />;
  return <BookOpen className={iconClass} />;
};

const DEFAULT_JAMA_CATEGORIES = [
  { value: 'Sales / विक्री', emoji: '🛍️' },
  { value: 'Payment Received / पेमेंट मिळाले', emoji: '💸' },
  { value: 'Commission / कमिशन', emoji: '🪙' },
  { value: 'Interest / व्याज', emoji: '📈' },
  { value: 'Other / इतर', emoji: '💼' }
];

const DEFAULT_UDHAR_CATEGORIES = [
  { value: 'Purchase / खरेदी', emoji: '🛒' },
  { value: 'Rent / भाडे', emoji: '🏠' },
  { value: 'Salary / पगार', emoji: '👥' },
  { value: 'Bills / बिले', emoji: '⚡' },
  { value: 'Travel / प्रवास', emoji: '🚗' },
  { value: 'Tea & Snacks / चहा-नाश्ता', emoji: '☕' },
  { value: 'Repair & Maintenance / दुरुस्ती', emoji: '🔧' },
  { value: 'Other / इतर', emoji: '📦' }
];

const POPULAR_EMOJIS = ['🛍️', '💸', '🪙', '📈', '💼', '🛒', '🏠', '👥', '⚡', '🚗', '☕', '🔧', '📦', '🍕', '💡', '🏷️', '🎁', '🌾', '🥛', '🚜'];

export default function QuickEntryScreen({ onSave, onClose, editTransaction, transactions }: QuickEntryScreenProps) {
  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'JAMA');
  const [amountStr, setAmountStr] = useState<string>(
    editTransaction ? String(editTransaction.amount) : '0'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editTransaction?.paymentMethod || 'CASH'
  );
  const [remarks, setRemarks] = useState<string>(editTransaction?.remarks || '');
  const [notes, setNotes] = useState<string>(editTransaction?.notes || '');
  const [category, setCategory] = useState<string>(() => {
    if (editTransaction?.category) {
      const emoji = getFirstEmoji(editTransaction.category);
      return emoji ? editTransaction.category.slice(emoji.length).trim() : editTransaction.category.trim();
    }
    return 'Other / इतर';
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // States to handle successful saves and adding multiple entries
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState<boolean>(false);
  const [lastSavedDetails, setLastSavedDetails] = useState<{
    type: TransactionType;
    amount: number;
    remarks: string;
    category: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  } | null>(null);

  // Keypad Drawer activation state
  const [isKeypadOpen, setIsKeypadOpen] = useState<boolean>(false);

  // Entry Mode state: Single vs Bulk Entry
  const [entryMode, setEntryMode] = useState<'SINGLE' | 'BULK'>('SINGLE');

  // Helper to create empty bulk row
  const createEmptyBulkRow = (rowType: TransactionType = 'JAMA'): BulkEntryRow => ({
    id: Math.random().toString(36).substring(2, 9),
    type: rowType,
    amountStr: '',
    category: rowType === 'JAMA' ? 'Sales / विक्री' : 'Purchase / खरेदी',
    otherText: '',
    remarks: '',
    paymentMethod: 'CASH',
    notes: '',
  });

  // Bulk Entry Rows State
  const [bulkRows, setBulkRows] = useState<BulkEntryRow[]>(() => [
    createEmptyBulkRow('JAMA'),
    createEmptyBulkRow('UDHAR'),
  ]);

  // Bulk Save Success Receipt State
  const [isBulkSavedSuccessfully, setIsBulkSavedSuccessfully] = useState<boolean>(false);
  const [bulkSavedReceipt, setBulkSavedReceipt] = useState<{
    totalCount: number;
    totalJama: number;
    totalUdhar: number;
    rows: BulkEntryRow[];
  } | null>(null);

  const handleUpdateBulkRow = (id: string, field: keyof BulkEntryRow, value: any) => {
    setBulkRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === 'type') {
          updated.category = value === 'JAMA' ? 'Sales / विक्री' : 'Purchase / खरेदी';
          updated.otherText = '';
        }
        if (field === 'category') {
          updated.otherText = '';
        }
        return updated;
      })
    );
  };

  const handleAddBulkRow = (rowType: TransactionType = 'JAMA') => {
    setBulkRows((prev) => [...prev, createEmptyBulkRow(rowType)]);
  };

  const handleRemoveBulkRow = (id: string) => {
    if (bulkRows.length <= 1) return;
    setBulkRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleResetBulk = () => {
    setBulkRows([
      createEmptyBulkRow('JAMA'),
      createEmptyBulkRow('UDHAR'),
    ]);
    setIsBulkSavedSuccessfully(false);
    setBulkSavedReceipt(null);
    setValidationError(null);
  };

  // Custom Categories States
  const [customJama, setCustomJama] = useState<{ value: string; emoji: string }[]>(() => {
    try {
      const saved = localStorage.getItem('user_custom_jama_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [customUdhar, setCustomUdhar] = useState<{ value: string; emoji: string }[]>(() => {
    try {
      const saved = localStorage.getItem('user_custom_udhar_categories');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Adding Custom Category Inline Dialog State
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatEmoji, setNewCatEmoji] = useState<string>('🏷️');

  // Compute final combined categories list
  const jamaCategories = useMemo(() => {
    const combined = [...DEFAULT_JAMA_CATEGORIES, ...customJama];
    const seen = new Set<string>();
    return combined.filter(c => {
      const lower = c.value.trim().toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [customJama]);

  const udharCategories = useMemo(() => {
    const combined = [...DEFAULT_UDHAR_CATEGORIES, ...customUdhar];
    const seen = new Set<string>();
    return combined.filter(c => {
      const lower = c.value.trim().toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [customUdhar]);

  const activeCategories = type === 'JAMA' ? jamaCategories : udharCategories;

  // Ensure edit transactions' unique category is loaded if it's custom and missing
  useEffect(() => {
    if (editTransaction?.category) {
      const emoji = getFirstEmoji(editTransaction.category);
      const cleanVal = emoji ? editTransaction.category.slice(emoji.length).trim() : editTransaction.category.trim();
      
      const targetCategories = editTransaction.type === 'JAMA' ? jamaCategories : udharCategories;
      const existsInTarget = targetCategories.some(c => c.value.toLowerCase() === cleanVal.toLowerCase());
      if (!existsInTarget) {
        const extractedEmoji = emoji || '🏷️';
        const newRecord = { value: cleanVal, emoji: extractedEmoji };

        if (editTransaction.type === 'JAMA') {
          const updated = [...customJama, newRecord];
          setCustomJama(updated);
          localStorage.setItem('user_custom_jama_categories', JSON.stringify(updated));
        } else {
          const updated = [...customUdhar, newRecord];
          setCustomUdhar(updated);
          localStorage.setItem('user_custom_udhar_categories', JSON.stringify(updated));
        }
      }
    }
  }, [editTransaction, jamaCategories, udharCategories]);

  // Reset category when switching JAMA/UDHAR types if current invalid
  useEffect(() => {
    const validVals = activeCategories.map((c) => c.value);
    const hasCategoryInActive = validVals.includes(category);
    if (!hasCategoryInActive) {
      setCategory(activeCategories[4]?.value || activeCategories[0]?.value || 'Other / इतर');
    }
  }, [type, activeCategories]);

  // Manual Date State
  const [customDate, setCustomDate] = useState<string>(() => {
    if (editTransaction?.createdAt) {
      try {
        return new Date(editTransaction.createdAt).toISOString().split('T')[0];
      } catch (e) {
        return new Date().toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  });

  // Adding Custom Category Function
  const handleAddCustomCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    // We store the category value directly
    const completeValue = `${newCatEmoji} ${trimmed}`;
    const newRecord = { value: trimmed, emoji: newCatEmoji };

    if (type === 'JAMA') {
      const alreadyHas = customJama.some(c => c.value.toLowerCase() === trimmed.toLowerCase());
      if (!alreadyHas) {
        const updated = [...customJama, newRecord];
        setCustomJama(updated);
        localStorage.setItem('user_custom_jama_categories', JSON.stringify(updated));
      }
    } else {
      const alreadyHas = customUdhar.some(c => c.value.toLowerCase() === trimmed.toLowerCase());
      if (!alreadyHas) {
        const updated = [...customUdhar, newRecord];
        setCustomUdhar(updated);
        localStorage.setItem('user_custom_udhar_categories', JSON.stringify(updated));
      }
    }

    setCategory(trimmed);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  // Keypad Handlers
  const handleNumPress = (num: string) => {
    setValidationError(null);
    setAmountStr((prev) => {
      if (prev === '0') {
        if (num === '.') return '0.';
        return num;
      }
      if (num === '.' && prev.includes('.')) return prev;
      if (prev.replace('.', '').length >= 9) return prev;
      return prev + num;
    });
  };

  const handleBackspace = () => {
    setAmountStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setAmountStr('0');
  };

  const handleQuickAdd = (value: number) => {
    setValidationError(null);
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = current + value;
      if (next > 999999999) return '999999999';
      return String(next);
    });
  };

  // Final submit handler for transaction
  const handleSaveSubmit = async () => {
    const finalAmount = parseFloat(amountStr);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setValidationError('Please enter an amount greater than 0.');
      setIsKeypadOpen(true); // Open keypad to let them set positive amount
      return;
    }

    setIsSaving(true);
    setValidationError(null);
    try {
      const dateObj = new Date(customDate);
      if (editTransaction?.createdAt) {
        const origDate = new Date(editTransaction.createdAt);
        dateObj.setHours(origDate.getHours(), origDate.getMinutes(), origDate.getSeconds(), origDate.getMilliseconds());
      } else {
        const now = new Date();
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      const finalCreatedAt = dateObj.toISOString();

      // Find if category selected has emoji prefix to append it for server persistence
      const activeObj = activeCategories.find((c) => c.value === category);
      const dbCategory = activeObj ? `${activeObj.emoji} ${activeObj.value}` : category;

      await onSave({
        type,
        amount: finalAmount,
        paymentMethod,
        remarks: remarks.trim(),
        category: dbCategory,
        createdAt: finalCreatedAt,
        notes: notes.trim(),
      }, editTransaction?.id);

      // Store saved details for the success receipt display
      setLastSavedDetails({
        type,
        amount: finalAmount,
        remarks: remarks.trim(),
        category: dbCategory,
        paymentMethod,
        notes: notes.trim(),
      });
      setIsSavedSuccessfully(true);
    } catch (err: any) {
      setValidationError(err?.message || 'Error occurred while saving transaction.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewEntry = () => {
    // Reset inputs for a brand new transaction to prevent "getting stuck on old data"
    setAmountStr('0');
    setRemarks('');
    setNotes('');
    // Reset category to the first default category of the active list
    const defaults = type === 'JAMA' ? jamaCategories : udharCategories;
    setCategory(defaults[0]?.value || 'Other / इतर');
    setValidationError(null);
    setIsSavedSuccessfully(false);
    setLastSavedDetails(null);
    setIsKeypadOpen(false);
    // No auto-close timer to clear; keep modal open until user action
  };

  // Submit bulk entries
  const handleBulkSaveSubmit = async () => {
    const validRows = bulkRows.filter((r) => {
      const amt = parseFloat(r.amountStr);
      return !isNaN(amt) && amt > 0;
    });

    if (validRows.length === 0) {
      setValidationError('Please enter an amount greater than 0 for at least one entry row.');
      return;
    }

    setIsSaving(true);
    setValidationError(null);

    try {
      let jamaSum = 0;
      let udharSum = 0;
      const savedRows: BulkEntryRow[] = [];

      const dateObj = new Date(customDate);
      const now = new Date();
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      const finalCreatedAt = dateObj.toISOString();

      for (const r of validRows) {
        const amt = parseFloat(r.amountStr);
        if (r.type === 'JAMA') jamaSum += amt;
        else udharSum += amt;

        const categoryList = r.type === 'JAMA' ? jamaCategories : udharCategories;
        const isOther = r.category.toLowerCase().includes('other') || r.category.includes('इतर');
        const effectiveCategory = isOther && r.otherText?.trim()
          ? r.otherText.trim()
          : r.category;
        const activeObj = categoryList.find((c) => c.value === effectiveCategory);
        const dbCategory = activeObj ? `${activeObj.emoji} ${activeObj.value}` : effectiveCategory;

        await onSave({
          type: r.type,
          amount: amt,
          paymentMethod: r.paymentMethod,
          remarks: r.remarks.trim() || (r.type === 'JAMA' ? 'Income Entry' : 'Expense Entry'),
          category: dbCategory,
          createdAt: finalCreatedAt,
          notes: (r.notes || '').trim(),
        });

        savedRows.push({ ...r, amountStr: amt.toString() });
      }

      setBulkSavedReceipt({
        totalCount: validRows.length,
        totalJama: jamaSum,
        totalUdhar: udharSum,
        rows: savedRows,
      });
      setIsBulkSavedSuccessfully(true);
    } catch (err: any) {
      setValidationError(err?.message || 'Error occurred while saving bulk entries.');
    } finally {
      setIsSaving(false);
    }
  };

  // No auto-close effect: keep success screen visible until user taps Add another entry or Close

  const isUdhar = type === 'UDHAR';
  const accentColor = isUdhar ? 'bg-rose-600' : 'bg-emerald-600';
  const textColor = isUdhar ? 'text-rose-600' : 'text-emerald-600';
  const ringColor = isUdhar ? 'focus:ring-rose-500' : 'focus:ring-emerald-500';
  const badgeBg = isUdhar ? 'bg-rose-100/60 text-rose-800 border-rose-200' : 'bg-emerald-100/60 text-emerald-800 border-emerald-200';

  const savedPartiesAndItems = useMemo(() => {
    const frequencyMap: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === type && tx.remarks && tx.remarks.trim().length > 0) {
        const item = tx.remarks.trim();
        frequencyMap[item] = (frequencyMap[item] || 0) + 1;
      }
    });
    return Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
  }, [transactions, type]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Track which bulk row has its suggestions open (by row id, or null)
  const [bulkSuggestionsRowId, setBulkSuggestionsRowId] = useState<string | null>(null);

  const filteredSuggestions = useMemo(() => {
    if (!remarks.trim()) {
      return savedPartiesAndItems.slice(0, 10);
    }
    const query = remarks.toLowerCase().trim();
    return savedPartiesAndItems.filter((item) =>
      item.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [savedPartiesAndItems, remarks]);

  // Compute bulk-row suggestions: filter by row type and current input
  const getBulkRowSuggestions = (rowType: TransactionType, rowRemarks: string) => {
    const frequencyMap: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === rowType && tx.remarks && tx.remarks.trim().length > 0) {
        const item = tx.remarks.trim();
        frequencyMap[item] = (frequencyMap[item] || 0) + 1;
      }
    });
    const sorted = Object.entries(frequencyMap)
      .sort((a, b) => b[1] - a[1])
      .map(([item]) => item);
    if (!rowRemarks.trim()) return sorted.slice(0, 10);
    const q = rowRemarks.toLowerCase().trim();
    return sorted.filter((item) => item.toLowerCase().includes(q)).slice(0, 10);
  };

  if (isBulkSavedSuccessfully && bulkSavedReceipt) {
    const netSum = bulkSavedReceipt.totalJama - bulkSavedReceipt.totalUdhar;
    return (
      <div className="fixed inset-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md flex flex-col justify-between max-w-md mx-auto h-screen shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="w-10"></div>
          <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
            🎉 BULK LOGS SAVED
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Content */}
        <div className="flex-1 flex flex-col items-center justify-start px-5 text-center space-y-4 overflow-y-auto no-scrollbar py-6">
          
          {/* Animated Success Badge */}
          <motion.div 
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.1, 1], opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-lg relative shrink-0"
          >
            <CheckCircle2 className="w-9 h-9 text-emerald-600 stroke-[2.5]" />
          </motion.div>

          <div className="space-y-1">
            <h2 className="text-base font-black text-gray-950 uppercase tracking-wide">
              {bulkSavedReceipt.totalCount} Bulk Entries Saved!
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              {bulkSavedReceipt.totalCount} व्यवहार यशस्वीरित्या जतन केले गेले आहेत 🎉
            </p>
          </div>

          {/* Summary Scorecard */}
          <div className="w-full grid grid-cols-3 gap-2 py-3 border-y border-gray-200/80 text-center">
            <div className="bg-emerald-50/70 border border-emerald-100 p-2 rounded-xl">
              <span className="text-[8px] font-black uppercase text-emerald-700 block">Total Jama (+)</span>
              <span className="text-xs font-black font-mono text-emerald-700">₹{bulkSavedReceipt.totalJama.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-rose-50/70 border border-rose-100 p-2 rounded-xl">
              <span className="text-[8px] font-black uppercase text-rose-700 block">Total Udhar (-)</span>
              <span className="text-xs font-black font-mono text-rose-700">₹{bulkSavedReceipt.totalUdhar.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-900 text-white p-2 rounded-xl border border-slate-950">
              <span className="text-[8px] font-black uppercase text-slate-400 block">Net Sum</span>
              <span className={`text-xs font-black font-mono ${netSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>₹{netSum.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Saved Items Table */}
          <div className="w-full bg-white border border-gray-150 rounded-2xl p-3 shadow-xs space-y-2 text-left">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1.5">
              Saved Entries List ({bulkSavedReceipt.rows.length})
            </span>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1 space-y-2">
              {bulkSavedReceipt.rows.map((row, idx) => {
                const isUd = row.type === 'UDHAR';
                return (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs font-semibold gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded ${isUd ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isUd ? 'UDHAR' : 'JAMA'}
                        </span>
                        <span className="font-bold text-gray-800 truncate">{row.remarks || (isUd ? 'Expense' : 'Income')}</span>
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5 truncate">{cleanCategoryName(row.category)} • {row.paymentMethod}</span>
                    </div>
                    <span className={`font-mono font-black shrink-0 ${isUd ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isUd ? '-' : '+'}₹{parseFloat(row.amountStr).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-gray-100 p-4 space-y-2.5 sticky bottom-0 z-20 shadow-lg">
          <button
            onClick={handleResetBulk}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer"
          >
            <ListPlus className="w-4 h-4 text-white" />
            <span>Add More Bulk Entries / आणखी नोंदी करा</span>
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-50 border border-gray-250 hover:bg-gray-100 text-gray-700 py-3 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span>Go to Dashboard / मुख्य पान</span>
          </button>
        </div>

      </div>
    );
  }

  if (isSavedSuccessfully && lastSavedDetails) {
    const isSavedUdhar = lastSavedDetails.type === 'UDHAR';
    const accentBg = isSavedUdhar ? 'bg-rose-50/50' : 'bg-emerald-50/50';
    const accentText = isSavedUdhar ? 'text-rose-600' : 'text-emerald-600';
    const accentBorder = isSavedUdhar ? 'border-rose-100' : 'border-emerald-100';
    const iconColor = isSavedUdhar ? 'text-rose-500' : 'text-emerald-500';
    const typeLabel = isSavedUdhar ? 'उधार / UDHAR (EXPENSE)' : 'जमा / JAMA (INCOME)';

    return (
      <div className="fixed inset-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md flex flex-col justify-between max-w-md mx-auto h-screen shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div className="w-10"></div>
          <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
            {editTransaction ? '✅ LOG UPDATED' : '🎉 LOG SAVED'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6 overflow-y-auto no-scrollbar py-6">
          
          {/* Animated Success Badge */}
          <motion.div 
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.1, 1], opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`w-20 h-20 rounded-full ${accentBg} border-2 ${accentBorder} flex items-center justify-center shadow-lg relative`}
          >
            <Check className={`w-10 h-10 ${iconColor} stroke-[3]`} />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
              className="absolute inset-0 border border-dashed rounded-full p-1 scale-110"
              style={{ borderColor: isSavedUdhar ? '#fca5a5' : '#86efac' }}
            />
          </motion.div>

          {/* Core confirmation text */}
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-gray-950 uppercase tracking-wide">
              {editTransaction ? 'Log Updated Successfully!' : 'Entry Saved Successfully!'}
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              नोंद यशस्वीरित्या जतन केली गेली आहे 🎉
            </p>
          </div>

          {/* Receipt/Details Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="w-full bg-white border border-gray-150 rounded-3xl p-5 shadow-xs space-y-4 text-left"
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isSavedUdhar ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'} border`}>
                {typeLabel}
              </span>
              <span className="text-[10px] font-black text-gray-400 font-mono">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Amount / रक्कम</span>
                <span className={`text-3xl font-black font-mono tracking-tight ${accentText}`}>
                  ₹{lastSavedDetails.amount.toLocaleString('en-IN')}
                </span>
              </div>

              {lastSavedDetails.remarks && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Party / Remarks / नाव-तपशील</span>
                  <span className="text-xs font-black text-gray-800 break-words block">{lastSavedDetails.remarks}</span>
                </div>
              )}

              {lastSavedDetails.notes && (
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Notes / अधिक तपशील</span>
                  <span className="inline-flex items-start gap-2 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-100 p-2.5 rounded-xl break-words block">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                    <span>{lastSavedDetails.notes}</span>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Category / श्रेणी</span>
                  <span className="text-xs font-bold text-gray-700 block truncate inline-flex items-center gap-2">
                    {getCategoryIcon(lastSavedDetails.category)}
                    <span>{cleanCategoryName(lastSavedDetails.category)}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Mode / माध्यम</span>
                  <span className="text-xs font-bold text-gray-700 block uppercase inline-flex items-center gap-2">
                    {getPaymentMethodIcon(lastSavedDetails.paymentMethod)}
                    <span>{lastSavedDetails.paymentMethod === 'CASH' ? 'Cash / रोख' : lastSavedDetails.paymentMethod === 'UPI' ? 'UPI / Online' : 'Khata / खाते'}</span>
                  </span>
                </div>
              </div>
            </div>

          </motion.div>

        </div>

        {/* Action Buttons Footer */}
        <div className="bg-white border-t border-gray-100 p-4 space-y-3 sticky bottom-0 z-20 shadow-lg">
          
          <button
            onClick={handleAddNewEntry}
            className={`w-full ${accentColor} text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider transition shadow-lg hover:brightness-105 cursor-pointer duration-300 active:scale-[0.98]`}
          >
            <Plus className="w-5 h-5 text-white stroke-[3.5]" />
            <span>Add another entry / नवीन नोंद करा</span>
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-50 border border-gray-250 hover:bg-gray-100 text-gray-700 py-3 px-6 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition duration-300 active:scale-[0.98]"
          >
            <BookOpen className="w-4 h-4 text-gray-500" />
            <span>GO TO DASHBOARD / मुख्य पान</span>
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md flex flex-col justify-between max-w-md mx-auto h-screen shadow-2xl overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <button
          onClick={onClose}
          id="back-to-dashboard-btn"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-sm font-black text-gray-800 uppercase tracking-wider">
          {editTransaction ? 'Edit Rojmel Log' : 'New Rojmel Log'}
        </span>
        <div className="w-10"></div>
      </div>

      {/* ENTRY MODE TAB SWITCHER (SINGLE VS BULK) */}
      {!editTransaction && (
        <div className="px-4 pt-3">
          <div className="flex bg-gray-200/60 p-1 rounded-2xl border border-gray-200 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setEntryMode('SINGLE');
                setValidationError(null);
              }}
              className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                entryMode === 'SINGLE'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Save className="w-3.5 h-3.5" /> Single Entry (एकमेव नोंद)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryMode('BULK');
                setValidationError(null);
              }}
              className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                entryMode === 'BULK'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Bulk Entries (अनेक नोंदी)
            </button>
          </div>
        </div>
      )}

      {entryMode === 'BULK' && !editTransaction ? (
        <>
          {/* BULK ENTRY MULTI-ROW FORM */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28">
            
            {/* Validation Error Display */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Common Date Selector */}
            <div className="bg-white border border-gray-150 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-2">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block">Bulk Log Date / तारीख</label>
                <span className="text-xs font-bold text-gray-800">सर्व नोंदींसाठी दिनांक</span>
              </div>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 border border-gray-250 rounded-xl p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Bulk Rows List */}
            <div className="space-y-3.5">
              {bulkRows.map((row, index) => {
                const isRowUdhar = row.type === 'UDHAR';
                const rowCategories = isRowUdhar ? udharCategories : jamaCategories;
                const isOther = row.category.toLowerCase().includes('other') || row.category.includes('इतर');

                return (
                  <div 
                    key={row.id} 
                    className={`bg-white border rounded-3xl p-4 shadow-sm space-y-3 transition ${
                      parseFloat(row.amountStr) > 0 
                        ? isRowUdhar ? 'border-rose-200 bg-rose-50/10' : 'border-emerald-200 bg-emerald-50/10'
                        : 'border-gray-150'
                    }`}
                  >
                    {/* Row Header & Type Switcher */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Entry #{index + 1}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {/* Type Switcher */}
                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateBulkRow(row.id, 'type', 'JAMA')}
                            className={`px-2.5 py-1 text-[9px] font-black rounded uppercase transition cursor-pointer ${
                              !isRowUdhar ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400'
                            }`}
                          >
                            + Jama
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateBulkRow(row.id, 'type', 'UDHAR')}
                            className={`px-2.5 py-1 text-[9px] font-black rounded uppercase transition cursor-pointer ${
                              isRowUdhar ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-400'
                            }`}
                          >
                            - Udhar
                          </button>
                        </div>

                        {/* Delete Row Button */}
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBulkRow(row.id)}
                            className="p-1 text-gray-300 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="space-y-2.5">
                      {/* Amount & Remarks Grid */}
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Amount (₹) *</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={row.amountStr}
                            onChange={(e) => handleUpdateBulkRow(row.id, 'amountStr', e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2 text-xs font-black font-mono text-gray-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </div>
                        <div className="col-span-7 relative">
                          <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Remarks / Party Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Cash sale, Repairs..."
                            value={row.remarks}
                            onChange={(e) => {
                              handleUpdateBulkRow(row.id, 'remarks', e.target.value);
                              setBulkSuggestionsRowId(row.id);
                            }}
                            onFocus={() => setBulkSuggestionsRowId(row.id)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                          {/* Autocomplete Dropdown */}
                          {bulkSuggestionsRowId === row.id && (() => {
                            const suggestions = getBulkRowSuggestions(row.type, row.remarks);
                            return suggestions.length > 0 ? (
                              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-emerald-200 rounded-xl shadow-xl overflow-hidden z-40">
                                <div className="bg-emerald-50/50 px-3 py-1.5 flex justify-between items-center border-b border-emerald-100">
                                  <span className="text-[9px] font-black uppercase text-emerald-800">Recent Parties / पूर्वीचे व्यवहार</span>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => { e.preventDefault(); setBulkSuggestionsRowId(null); }}
                                    className="text-[9px] text-emerald-600 font-extrabold hover:underline px-1"
                                  >
                                    Close
                                  </button>
                                </div>
                                {suggestions.map((item, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleUpdateBulkRow(row.id, 'remarks', item);
                                      setBulkSuggestionsRowId(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-[10px] text-gray-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold transition cursor-pointer flex justify-between items-center"
                                  >
                                    <span>{item}</span>
                                    <span className="text-[8px] bg-slate-100 text-gray-500 px-1.5 py-0.5 rounded font-mono uppercase">SELECT</span>
                                  </button>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Category & Payment Method Row */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black uppercase text-gray-400 block">Category</label>
                          <select
                            value={row.category}
                            onChange={(e) => handleUpdateBulkRow(row.id, 'category', e.target.value)}
                            className="w-full bg-slate-50 border border-gray-200 rounded-xl p-1.5 text-[10px] font-bold text-gray-700 focus:outline-none focus:border-emerald-600"
                          >
                            {rowCategories.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.emoji} {cleanCategoryName(c.value)}
                              </option>
                            ))}
                          </select>
                          {isOther && (
                            <input
                              type="text"
                              autoFocus
                              placeholder="Please specify... (e.g. Milk, Diesel)"
                              value={row.otherText || ''}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'otherText', e.target.value)}
                              className={`w-full bg-amber-50 border rounded-xl p-1.5 text-[10px] font-bold text-gray-800 placeholder-amber-400 focus:outline-none focus:border-amber-500 transition ${
                                !row.otherText?.trim() ? 'border-amber-300 animate-pulse' : 'border-amber-400'
                              }`}
                            />
                          )}
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-gray-400 block mb-1">Payment Mode</label>
                          <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                            {(['CASH', 'UPI', 'KHATA'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleUpdateBulkRow(row.id, 'paymentMethod', m)}
                                className={`flex-1 py-1 text-[8px] font-extrabold uppercase rounded-lg transition cursor-pointer ${
                                  row.paymentMethod === m
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-gray-500'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div className="pt-1">
                        <label className="text-[8px] font-black uppercase text-gray-400 flex items-center gap-1 mb-1">
                          <MessageSquare className="w-3 h-3" /> Additional Notes (Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Extra details, references... (टीप / अधिक माहिती)"
                          value={row.notes || ''}
                          onChange={(e) => handleUpdateBulkRow(row.id, 'notes', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2 text-[10px] font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none transition leading-relaxed"
                        />
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Quick Add Row Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAddBulkRow('JAMA')}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>+ Add Jama Entry (+ जमा)</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddBulkRow('UDHAR')}
                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-rose-600" />
                <span>+ Add Udhar Entry (- खर्च)</span>
              </button>
            </div>

          </div>

          {/* BULK FOOTER CTA */}
          <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-20 shadow-lg space-y-2">
            {/* Live Summary Bar */}
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 bg-slate-50 p-2 rounded-xl border border-gray-200">
              <span>Valid Entries: {bulkRows.filter(r => parseFloat(r.amountStr) > 0).length}</span>
              <div className="flex gap-2">
                <span className="text-emerald-700">Jama: ₹{bulkRows.filter(r => r.type === 'JAMA').reduce((s, r) => s + (parseFloat(r.amountStr) || 0), 0).toLocaleString('en-IN')}</span>
                <span className="text-rose-700">Udhar: ₹{bulkRows.filter(r => r.type === 'UDHAR').reduce((s, r) => s + (parseFloat(r.amountStr) || 0), 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={handleBulkSaveSubmit}
              disabled={isSaving || bulkRows.filter(r => parseFloat(r.amountStr) > 0).length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-2.5 font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? (
                <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Layers className="w-4 h-4 text-white" />
              )}
              <span>
                {isSaving
                  ? 'Saving Bulk Entries...'
                  : `Save All ${bulkRows.filter(r => parseFloat(r.amountStr) > 0).length} Entries / सर्व नोंदी जतन करा`}
              </span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* COMPACT DETAILED FORM (FILL OUT DETAILS BEFORE AMOUNT) */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
            
            {/* BINARY TOGGLE (JAMA / UDHAR) */}
            <div className="grid grid-cols-2 p-1 bg-gray-150/70 rounded-2xl border border-gray-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => setType('JAMA')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isUdhar
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" /> जमा / JAMA (INCOME)
              </button>
              <button
                type="button"
                onClick={() => setType('UDHAR')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isUdhar
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 rotate-180" /> उधार / UDHAR (EXPENSE)
              </button>
            </div>

            {/* VALIDATION ERROR DISP */}
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 1. CATEGORY SELECTOR & CUSTOM GENERATOR */}
            <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm space-y-3.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                  Category / श्रेणी (व्यवहाराचा प्रकार)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Custom / नवीन बनवा
                </button>
              </div>

              <AnimatePresence>
                {isAddingCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 border border-emerald-250 p-3 rounded-2xl space-y-2.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Create Custom Category
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                      {POPULAR_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setNewCatEmoji(e)}
                          className={`p-1.5 rounded-lg text-sm transition shrink-0 ${
                            newCatEmoji === e ? 'bg-emerald-200 ring-2 ring-emerald-500 scale-110' : 'hover:bg-gray-200'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Category Name (e.g. Milk, Diesel...)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCategory}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        Save / जतन करा
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CATEGORY GRID PILLS */}
              <div className="grid grid-cols-2 gap-2">
                {activeCategories.map((c) => {
                  const cleanName = cleanCategoryName(c.value);
                  const isSelected = category === c.value || category === cleanName;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`p-3 rounded-2xl font-bold text-xs transition duration-200 flex items-center justify-start gap-2.5 cursor-pointer border text-left ${
                        isSelected
                          ? `${badgeBg} font-black border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm`
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base shrink-0">{c.emoji}</span>
                      <span className="truncate">{cleanName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. REMARKS / PARTY NAME WITH AUTOCOMPLETE */}
            <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm space-y-3">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">
                Remarks / Party Name / तपशील (नाव किंवा साहित्य)
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="transaction-remarks-input"
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="e.g., Vilas Ghadashi, Sunil Patil, Repairs..."
                  className={`w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-300 ring-offset-2 focus:ring-1 ${ringColor}`}
                />
              </div>

              {/* Party Suggestions list */}
              {filteredSuggestions.length > 0 && showSuggestions && (
                <div className="bg-white border border-emerald-200 rounded-2xl shadow-xl overflow-hidden mt-1 z-30">
                  <div className="bg-emerald-50/50 px-3 py-1.5 flex justify-between items-center border-b border-emerald-100">
                    <span className="text-[10px] font-black uppercase text-emerald-800">
                      Recent Parties / पूर्वीचे व्यवहार
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="text-[10px] text-emerald-600 font-extrabold hover:underline px-2"
                    >
                      Close
                    </button>
                  </div>
                  {filteredSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRemarks(item);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-3 text-xs text-gray-700 hover:bg-emerald-50 active:bg-emerald-100 font-bold transition cursor-pointer flex justify-between items-center"
                    >
                      <span>{item}</span>
                      <span className="text-[9px] bg-slate-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase animate-pulse">Select</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Popular pills suggestion list */}
              {savedPartiesAndItems.length > 0 && (
                <div className="mt-2 text-left">
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pb-1 pl-0.5">
                    {savedPartiesAndItems.slice(0, 5).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRemarks(item);
                          setShowSuggestions(false);
                        }}
                        className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                          remarks === item
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2b. ADDITIONAL NOTES (OPTIONAL) */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Additional Notes (Optional) / अधिक तपशील
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., specific items, payment balance notes, details etc..."
                rows={2}
                className={`w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-xs font-bold text-gray-800 placeholder-gray-450 focus:outline-none focus:border-gray-350 transition resize-none ${ringColor}`}
              />
            </div>

            {/* 3. PAYMENT METHOD */}
            <div>
              <label className="block text-xs font-bold text-gray-450 uppercase tracking-widest mb-2">
                Payment Mode / व्यवहाराचे माध्यम
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['CASH', 'UPI', 'KHATA'] as const).map((method) => {
                  const isSelected = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 rounded-2xl font-bold text-xs transition duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? `${badgeBg} font-black border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm`
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {getPaymentMethodIcon(method)}
                      <span className="text-[10px] tracking-wide">
                        {method === 'CASH' ? 'Cash / रोख' : method === 'UPI' ? 'UPI / Online' : 'Add to Khata'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. CUSTOM DATE SELECTOR */}
            <div>
              <label className="block text-xs font-bold text-gray-450 uppercase tracking-widest mb-2">
                Date / तारीख (दिनांक)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className={`w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-xs font-bold text-gray-800 focus:outline-none focus:border-gray-300 ring-offset-2 focus:ring-1 ${ringColor}`}
                />
              </div>
            </div>

            {/* 5. INTERACTIVE AMOUNT INPUT BOX (TRIGGER) */}
            <div 
              onClick={() => {
                setIsKeypadOpen(true);
                setValidationError(null);
              }}
              className={`p-4 rounded-3xl bg-white border border-dashed hover:border-solid transition cursor-pointer text-center relative ${
                parseFloat(amountStr) > 0 
                  ? `${isUdhar ? 'border-rose-300 bg-rose-50/10' : 'border-emerald-300 bg-emerald-50/10'}` 
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
              }`}
            >
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Amount / रक्कम (टाकण्यासाठी स्पर्श करा)
              </div>
              <div className="flex items-center justify-center gap-1.5 min-h-[58px]">
                <span className={`text-2xl font-extrabold ${textColor}`}>₹</span>
                <span className={`text-4xl font-black font-mono tracking-tight text-gray-800`}>
                  {parseFloat(amountStr).toLocaleString('en-IN') || '0'}
                </span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 flex items-center justify-center gap-1 mt-1 bg-slate-100 py-1 px-3.5 rounded-full inline-block mx-auto max-w-max">
                {parseFloat(amountStr) > 0 ? 'Tap to Change Amount' : 'Tap here to set Amount Value / रक्कम भरा'}
              </div>
            </div>

          </div>

          {/* FOOTER ACTIONS - IF KEYPAD HIDDEN, SHOW DEFAULT SAVE BUTTON */}
          {!isKeypadOpen && (
            <div className="bg-white border-t border-gray-100 p-4 sticky bottom-0 z-20 shadow-lg">
              <button
                onClick={handleSaveSubmit}
                id="save-entry-btn"
                disabled={isSaving}
                className={`w-full ${accentColor} text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-3.5 font-bold text-sm tracking-wide transition shadow-lg shadow-black/5 disabled:opacity-40 cursor-pointer duration-300 active:scale-[0.98] hover:brightness-105`}
              >
                {isSaving ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {isSaving
                    ? 'Saving Rojmel Entry...'
                    : editTransaction
                    ? 'Update Log Entry / बदल जतन करा'
                    : `Save ${type} Log Entry / जमा-खर्च जतन करा`}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {/* KEYPAD SLIDE-UP DRAWER */}
      <AnimatePresence>
        {isKeypadOpen && (
          <>
            {/* Backdrop overlays clicks */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsKeypadOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 max-w-md mx-auto"
            />

            {/* Scrollable Keypad Slider sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-gray-50 border-t border-gray-200 p-4 rounded-t-3xl max-w-md mx-auto shadow-2xl select-none"
            >
              
              {/* Keypad Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-200/60 mb-3.5">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entering Amount / रक्कम</span>
                  <span className={`text-2xl font-black font-mono flex items-center gap-1 ${textColor}`}>
                    ₹ <span className="text-gray-800 text-3xl font-black">{amountStr}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleClear}
                    className="text-[10px] font-black text-gray-500 hover:text-gray-800 bg-gray-200/70 px-2.5 py-1.5 rounded-lg active:bg-gray-300"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setIsKeypadOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-150 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* QUICK ADD AMOUNT CHIPS (PRESET VALUES) */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[100, 500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAdd(val)}
                    className="bg-white border border-gray-200/80 active:bg-gray-100 text-gray-700 py-2 rounded-xl font-black text-[11px] shadow-xs cursor-pointer transition hover:border-gray-300"
                  >
                    + ₹{val.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {/* NUMERIC KEYPAD BUTTONS GRID */}
              <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleNumPress(btn)}
                    className="bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 py-3.5 rounded-2xl font-black text-xl shadow-xs border border-gray-200/70 transition cursor-pointer flex items-center justify-center"
                  >
                    {btn}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumPress('.')}
                  className="bg-white hover:bg-gray-100 active:bg-gray-250 text-gray-800 py-3.5 rounded-2xl font-black text-xl shadow-xs border border-gray-200/70 transition cursor-pointer flex items-center justify-center"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => handleNumPress('0')}
                  className="bg-white hover:bg-gray-100 active:bg-gray-250 text-gray-800 py-3.5 rounded-2xl font-black text-xl shadow-xs border border-gray-200/70 transition cursor-pointer flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="bg-gray-200 hover:bg-gray-250 text-gray-700 py-3.5 rounded-2xl font-black text-lg shadow-xs border border-gray-250 transition cursor-pointer flex items-center justify-center"
                >
                  ⌫
                </button>
              </div>

              {/* KEYPAD SAVE/DONE BOTTOM CTA */}
              <button
                onClick={() => {
                  if (parseFloat(amountStr) <= 0) {
                    setValidationError('Please enter an amount greater than 0.');
                    return;
                  }
                  setIsKeypadOpen(false);
                }}
                className={`w-full ${accentColor} text-white py-4 px-6 rounded-2xl flex items-center justify-center gap-2 font-black text-sm tracking-widest shadow-md transition-all active:scale-[0.98] duration-200 cursor-pointer`}
              >
                <Check className="w-5 h-5 font-black" />
                <span>CONFIRM AMOUNT / रक्कम निश्चित करा</span>
              </button>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
