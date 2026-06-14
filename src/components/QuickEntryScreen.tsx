import React, { useState, useMemo, useEffect } from 'react';
import { TransactionType, PaymentMethod, LedgerTransaction } from '../types';
import { ArrowLeft, Wallet, Smartphone, BookOpen, AlertCircle, Save, Plus, Check, Calendar, ChevronRight, X, Sparkles, IndianRupee, MessageSquare, Tag, ShoppingBag, TrendingUp, Home, Users, Zap, Car, Coffee, Wrench, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  

  const filteredSuggestions = useMemo(() => {
    if (!remarks.trim()) {
      return savedPartiesAndItems.slice(0, 10);
    }
    const query = remarks.toLowerCase().trim();
    return savedPartiesAndItems.filter((item) =>
      item.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [savedPartiesAndItems, remarks]);

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
                    className="text-gray-400 hover:text-gray-600 h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Tea & Snacks / चहा-नाश्ता"
                    className="flex-1 bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    disabled={!newCatName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1 shrink-0"
                  >
                    Save
                  </button>
                </div>
                {/* Emoji List */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-gray-400">Select Symbol / चिन्ह निवडा:</span>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                    {POPULAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewCatEmoji(emoji)}
                        className={`text-sm p-1.5 rounded-lg border shrink-0 transition cursor-pointer ${
                          newCatEmoji === emoji
                            ? 'bg-emerald-100 border-emerald-400 font-bold scale-110'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
            {activeCategories.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`py-2 rounded-xl px-3 font-bold text-xs border tracking-tight transition duration-150 flex items-center gap-2 cursor-pointer text-left min-w-0 ${
                    isSelected
                      ? `${badgeBg} border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-500/10`
                      : 'bg-gray-50/55 text-gray-600 border-gray-200/60 hover:bg-gray-100/50'
                  }`}
                >
                  <span className="text-sm shrink-0">{getCategoryIcon(cat.value)}</span>
                  <span className="truncate text-[11px] font-bold">{cat.value.split(' / ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. PARTY NAME / REMARKS WITH AUTOCOMPLETE */}
        <div className="relative">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            Remarks / Party Name / तपशील (नाव किंवा साहित्य)
          </label>
          <div className="relative">
            <input
              type="text"
              id="transaction-remarks-input"
              value={remarks}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setRemarks(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder={isUdhar ? "e.g., Vilas Ghadashi, Sunil Patil, Repairs..." : "e.g., Cash Sale, Advance, Commission..."}
              className={`w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-350 transition ${ringColor}`}
            />
            {remarks && (
              <button
                type="button"
                onClick={() => {
                  setRemarks('');
                  setShowSuggestions(true);
                }}
                className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 p-1 rounded-full w-5 h-5 flex items-center justify-center font-bold transition cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-150 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
              <div className="p-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
                  Saved list / जतन केलेली नावे
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
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`py-3 text-xs rounded-2xl font-bold border transition duration-150 flex flex-col items-center gap-1 cursor-pointer ${
                paymentMethod === 'CASH'
                  ? `${badgeBg} border-emerald-500 ring-2 ring-emerald-500/20`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <IndianRupee className="w-4 h-4" />
              <span className="text-[10px]">Cash / रोख</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`py-3 text-xs rounded-2xl font-bold border transition duration-150 flex flex-col items-center gap-1 cursor-pointer ${
                paymentMethod === 'UPI'
                  ? `${badgeBg} border-emerald-500 ring-2 ring-emerald-500/20`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[10px]">UPI / Online</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('KHATA')}
              className={`py-3 text-xs rounded-2xl font-bold border transition duration-150 flex flex-col items-center gap-1 cursor-pointer ${
                paymentMethod === 'KHATA'
                  ? `${badgeBg} border-emerald-500 ring-2 ring-emerald-500/20`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-[10px]">Add to Khata</span>
            </button>
          </div>
        </div>

        {/* 4. MANUAL DATE */}
        <div>
          <label className="block text-xs font-bold text-gray-450 uppercase tracking-widest mb-2">
            Date / तारीख (दिनांक)
          </label>
          <div className="relative">
            <input
              type="date"
              id="transaction-date-input"
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
