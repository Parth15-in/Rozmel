import React, { useState, useMemo } from 'react';
import { LedgerWorkspace, LedgerTransaction, LedgerMember } from '../types';
import HistoryScreen from './HistoryScreen';
import {
  Users,
  Search,
  Plus,
  LogOut,
  Calendar,
  Trash2,
  TrendingUp,
  TrendingDown,
  Cloud,
  CloudOff,
  Filter,
  User,
  AlertCircle,
  Pencil,
  X
} from 'lucide-react';

interface LedgerDashboardProps {
  currentLedger: LedgerWorkspace | null;
  transactions: LedgerTransaction[];
  members: LedgerMember[];
  userEmail: string;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenQuickEntry: () => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onEditTransaction: (transaction: LedgerTransaction) => void;
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

const getCategoryEmoji = (category?: string, type?: 'JAMA' | 'UDHAR') => {
  if (!category) return type === 'JAMA' ? '💼' : '📦';
  const emoji = getFirstEmoji(category);
  if (emoji) return emoji;

  const val = category.toLowerCase();
  if (val.includes('sale') || val.includes('विक्री')) return '🛍️';
  if (val.includes('payment') || val.includes('मिळाले')) return '💸';
  if (val.includes('commis') || val.includes('कमिशन')) return '🪙';
  if (val.includes('interest') || val.includes('व्याज')) return '📈';
  if (val.includes('purchase') || val.includes('खरेदी')) return '🛒';
  if (val.includes('rent') || val.includes('भाडे')) return '🏠';
  if (val.includes('salary') || val.includes('पगार')) return '👥';
  if (val.includes('bill') || val.includes('बिले')) return '⚡';
  if (val.includes('travel') || val.includes('प्रवास')) return '🚗';
  if (val.includes('snack') || val.includes('नाश्ता')) return '☕';
  if (val.includes('repair') || val.includes('दुरुस्ती')) return '🔧';
  return type === 'JAMA' ? '💼' : '📦';
};

const cleanCategoryName = (category?: string) => {
  if (!category) return 'Other';
  const trimmed = category.trim();
  const emoji = getFirstEmoji(trimmed);
  let cleaned = trimmed;
  if (emoji) {
    cleaned = trimmed.slice(emoji.length).trim();
  }
  return cleaned.split(' / ')[0];
};

export default function LedgerDashboard({
  currentLedger,
  transactions,
  members,
  userEmail,
  onLogout,
  onOpenSettings,
  onOpenQuickEntry,
  onDeleteTransaction,
  onEditTransaction,
}: LedgerDashboardProps) {
  const [searchText, setSearchText] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'KHATA'>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'JAMA' | 'UDHAR'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Active Panel & Analytics States
  const [activePanel, setActivePanel] = useState<'LOG' | 'REPORTS' | 'HISTORY'>('LOG');
  const [reportTimeframe, setReportTimeframe] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [reportViewType, setReportViewType] = useState<'CATEGORY' | 'PARTY'>('CATEGORY');

  // Custom Deletion Permission Dialog States
  const [txToDelete, setTxToDelete] = useState<LedgerTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Format Date for Header
  const formattedToday = useMemo(() => {
    const d = new Date();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', weekday: 'long' };
    return d.toLocaleDateString('en-IN', options);
  }, []);

  // Get unique categories list from active visible transactions
  const uniqueCategories = useMemo(() => {
    const catsSet = new Set<string>();
    const defaultCats = [
      'Sales / विक्री',
      'Payment Received / पेमेंट मिळाले',
      'Interest Income / व्याज उत्पन्न',
      'Rental Income / भाडे उत्पन्न',
      'Purchase / खरेदी',
      'Supplier Payment / पुरवठादार पेमेंट',
      'Salary / पगार',
      'Rent & Bills / भाडे आणि बिले',
      'Other Expense / इतर खर्च',
      'Other / इतर',
    ];
    defaultCats.forEach(cat => catsSet.add(cat));
    transactions.forEach(t => {
      if (t.category) catsSet.add(t.category);
    });
    return ['ALL', ...Array.from(catsSet)];
  }, [transactions]);

  // Filter and compute transactions with smart multi-field search
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const searchLower = searchText.trim().toLowerCase();
      const matchSearch =
        searchLower === '' ||
        (t.remarks || '').toLowerCase().includes(searchLower) ||
        (t.category || '').toLowerCase().includes(searchLower) ||
        (t.notes || '').toLowerCase().includes(searchLower) ||
        t.amount.toString().toLowerCase().includes(searchLower) ||
        (t.paymentMethod || '').toLowerCase().includes(searchLower);
      const matchMethod = selectedMethodFilter === 'ALL' || t.paymentMethod === selectedMethodFilter;
      const matchType = selectedTypeFilter === 'ALL' || t.type === selectedTypeFilter;
      const matchCategory = selectedCategoryFilter === 'ALL' || t.category === selectedCategoryFilter;
      return matchSearch && matchMethod && matchType && matchCategory;
    });
  }, [transactions, searchText, selectedMethodFilter, selectedTypeFilter, selectedCategoryFilter]);

  // Calculations for dashboard indicators
  const stats = useMemo(() => {
    let jamaTotal = 0;
    let udharTotal = 0;

    transactions.forEach((t) => {
      if (t.type === 'JAMA') {
        jamaTotal += t.amount;
      } else {
        udharTotal += t.amount;
      }
    });

    const closingBalance = jamaTotal - udharTotal;

    return {
      jamaTotal,
      udharTotal,
      closingBalance,
    };
  }, [transactions]);

  // Group transactions by calendar dates
  const groupedTransactions = useMemo(() => {
    const groups: { [dateStr: string]: LedgerTransaction[] } = {};
    filteredTransactions.forEach((t) => {
      // Date label formatting
      const dateVal = new Date(t.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let key = dateVal.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (dateVal.toDateString() === today.toDateString()) {
        key = 'Today (आज)';
      } else if (dateVal.toDateString() === yesterday.toDateString()) {
        key = 'Yesterday (काल)';
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // Analytical Reports Stats computation
  const reportStats = useMemo(() => {
    const jamaNameMap: Record<string, number> = {};
    const udharNameMap: Record<string, number> = {};
    const jamaCategoryMap: Record<string, number> = {};
    const udharCategoryMap: Record<string, number> = {};
    let totalJama = 0;
    let totalUdhar = 0;

    const now = new Date();
    const timeLimit = new Date();
    if (reportTimeframe === 'WEEK') {
      timeLimit.setDate(now.getDate() - 7);
    } else if (reportTimeframe === 'MONTH') {
      timeLimit.setDate(now.getDate() - 30);
    } else {
      timeLimit.setDate(now.getDate() - 365);
    }

    const filteredByTime = transactions.filter((t) => {
      try {
        return new Date(t.createdAt) >= timeLimit;
      } catch (e) {
        return false;
      }
    });

    filteredByTime.forEach((t) => {
      const nameLabel = (t.remarks || 'Cash Transaction').trim();
      const catLabel = t.category || 'Other / इतर';
      if (t.type === 'JAMA') {
        jamaNameMap[nameLabel] = (jamaNameMap[nameLabel] || 0) + t.amount;
        jamaCategoryMap[catLabel] = (jamaCategoryMap[catLabel] || 0) + t.amount;
        totalJama += t.amount;
      } else {
        udharNameMap[nameLabel] = (udharNameMap[nameLabel] || 0) + t.amount;
        udharCategoryMap[catLabel] = (udharCategoryMap[catLabel] || 0) + t.amount;
        totalUdhar += t.amount;
      }
    });

    const sortedJamaNames = Object.entries(jamaNameMap)
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);

    const sortedUdharNames = Object.entries(udharNameMap)
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);

    const sortedJamaCategories = Object.entries(jamaCategoryMap)
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);

    const sortedUdharCategories = Object.entries(udharCategoryMap)
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum);

    return {
      sortedJamaNames,
      sortedUdharNames,
      sortedJamaCategories,
      sortedUdharCategories,
      totalJama,
      totalUdhar,
      transactionsCount: filteredByTime.length
    };
  }, [transactions, reportTimeframe]);

  const handleDeleteClick = (id: string, remarks: string, amount: number) => {
    const found = transactions.find((t) => t.id === id);
    if (found) {
      setTxToDelete(found);
      setDeleteError(null);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-gray-150 h-screen font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-gray-100 shadow-xs px-5 pt-4 pb-3 flex flex-col shrink-0">
        <div className="flex items-center justify-between">
          
          {/* Active Ledger Info */}
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shrink-0">
              <span className="text-xl">🏪</span>
            </span>
            <div className="max-w-[160px]">
              <h1 className="text-sm font-extrabold text-gray-900 truncate">
                {currentLedger ? currentLedger.name : 'Personal Rojmel'}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                {isOnline ? (
                  <span className="flex items-center gap-0.5 text-emerald-600">
                    <Cloud className="w-3 h-3" /> Live Sync
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-amber-500">
                    <CloudOff className="w-3 h-3" /> Offline
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              id="open-settings-btn"
              className="px-3 py-2 bg-gray-50 border border-gray-150 hover:bg-gray-100 rounded-xl flex items-center gap-1.5 text-xs font-bold text-gray-600 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Staff ({members.length})</span>
            </button>
            <button
              onClick={onLogout}
              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date / Calendar Row with View Toggles */}
        <div className="flex justify-between items-center mt-3.5 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{formattedToday}</span>
          </div>

          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200 shrink-0 shadow-inner">
            <button
              onClick={() => setActivePanel('LOG')}
              id="view-logs-tab-btn"
              className={`px-2.5 py-1.5 text-[9px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                activePanel === 'LOG'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Today / आजचे
            </button>
            <button
              onClick={() => setActivePanel('HISTORY')}
              id="view-history-tab-btn"
              className={`px-2.5 py-1.5 text-[9px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                activePanel === 'HISTORY'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              History / इतिहास
            </button>
            <button
              onClick={() => setActivePanel('REPORTS')}
              id="view-reports-tab-btn"
              className={`px-2.5 py-1.5 text-[9px] uppercase tracking-wider font-extrabold rounded-lg transition-all cursor-pointer ${
                activePanel === 'REPORTS'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Reports / रिपोर्ट
            </button>
          </div>
        </div>
      </div>

      {/* TRANSACTION LOGS SUB-VIEW */}
      {activePanel === 'LOG' && (
        <>
          {/* DASHBOARD SUMMARY PANEL (CLOSING BALANCE / JAMA / UDHAR) */}
          <div className="px-5 pt-4 pb-1 space-y-3 shrink-0">
            
            {/* Prominent Live Closing Balance Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"></div>
              
              <div className="relative">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Closing Balance / निव्वळ शिल्लक
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-emerald-400">₹</span>
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                    {stats.closingBalance.toLocaleString('en-IN')}
                  </span>
                </div>
                
                <div className="flex items-center gap-1 text-[11px] mt-2.5 text-slate-300">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${stats.closingBalance >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span>{stats.closingBalance >= 0 ? "Book Safe (नफ्यात)" : "Negative Status"}</span>
                </div>
              </div>
            </div>

            {/* Side-by-Side Subactions Total Cards */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Total JAMA - Green */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-1 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Jama / जमा (In)</span>
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1.5 truncate">
                  ₹ {stats.jamaTotal.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Total UDHAR - Red */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-1 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Udhar / उधार (Out)</span>
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-rose-700 mt-1.5 truncate">
                  ₹ {stats.udharTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* FILTER CONTROLS */}
          <div className="px-5 py-3 shrink-0 bg-[#faf9f6] z-10 border-b border-gray-200/50 space-y-2">
            {/* Remarks / Party Name Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search parties, categories, amounts or remarks..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 pl-9 pr-8 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              {searchText && (
                <button
                  onClick={() => setSearchText('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Badge indicator */}
            {(searchText !== '' || selectedMethodFilter !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedCategoryFilter !== 'ALL') && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-1.5 px-2 animate-fade-in text-[10px]">
                <div className="flex items-center gap-1 text-slate-500 font-semibold">
                  <Filter className="w-3 h-3 text-emerald-600" />
                  <span>Filtered ({filteredTransactions.length} logs found)</span>
                </div>
                <button
                  onClick={() => {
                    setSearchText('');
                    setSelectedMethodFilter('ALL');
                    setSelectedTypeFilter('ALL');
                    setSelectedCategoryFilter('ALL');
                  }}
                  className="text-[10px] font-black text-rose-600 hover:text-rose-700 cursor-pointer uppercase tracking-tight"
                >
                  Clear All (रीसेट करा)
                </button>
              </div>
            )}

            {/* Triple Filters Panel: Payment Method + Mode Types */}
            <div className="flex items-center gap-3 justify-between py-0.5">
              {/* Payment Method Pills */}
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'CASH', 'UPI', 'KHATA'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethodFilter(method)}
                    className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-lg transition border cursor-pointer uppercase ${
                      selectedMethodFilter === method
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {method === 'ALL' ? 'ALL 🏦' : method === 'CASH' ? 'CASH 💵' : method === 'UPI' ? 'UPI 📱' : 'KHATA 📖'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                {(['ALL', 'JAMA', 'UDHAR'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`w-10 text-center py-1 text-[9px] font-extrabold tracking-tight rounded-md transition cursor-pointer border ${
                      selectedTypeFilter === type
                        ? 'bg-gray-800 text-white border-gray-800 font-bold'
                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Horizontal Category Filter Row */}
            {uniqueCategories.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-t border-gray-100 mt-1 pt-2 animate-fade-in">
                <span className="text-[9px] font-black uppercase tracking-wide text-gray-400 flex items-center gap-1 shrink-0">
                  📁 Category / श्रेणी:
                </span>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {uniqueCategories.map((catName) => {
                    const isAll = catName === 'ALL';
                    const displayLabel = isAll ? 'All' : cleanCategoryName(catName);
                    return (
                      <button
                        key={catName}
                        onClick={() => setSelectedCategoryFilter(catName)}
                        className={`px-2.5 py-1 text-[9px] font-black rounded-lg border transition shrink-0 cursor-pointer ${
                          selectedCategoryFilter === catName
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-450 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {isAll ? ' All' : `${getCategoryEmoji(catName)} ${displayLabel}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* CHRONOLOGICALLY SCROLLABLE TIMELINE BODY */}
          <div className="flex-1 overflow-y-auto px-5 pb-24 divide-y divide-gray-150">
            {Object.keys(groupedTransactions).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <span className="text-4xl">
                  {searchText !== '' || selectedMethodFilter !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' ? '🔍' : '🧾'}
                </span>
                <h3 className="text-sm font-semibold text-gray-700 mt-3">
                  {searchText !== '' || selectedMethodFilter !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedCategoryFilter !== 'ALL'
                    ? 'No matching logs found'
                    : 'No Rojmel log entries found'}
                </h3>
                <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed mx-auto">
                  {searchText !== '' || selectedMethodFilter !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedCategoryFilter !== 'ALL'
                    ? 'Try adjusting your search terms or resetting the filter parameters.'
                    : 'Tap the green floating action button below to add your first transaction.'}
                </p>
                {(searchText !== '' || selectedMethodFilter !== 'ALL' || selectedTypeFilter !== 'ALL' || selectedCategoryFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchText('');
                      setSelectedMethodFilter('ALL');
                      setSelectedTypeFilter('ALL');
                      setSelectedCategoryFilter('ALL');
                    }}
                    className="mt-3 bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider py-2 px-4 rounded-xl shadow-xs transition duration-200 cursor-pointer"
                  >
                    Reset Filters / रीसेट करा
                  </button>
                )}
              </div>
            ) : (
              Object.keys(groupedTransactions).map((dateKey) => (
                <div key={dateKey} className="py-4 first:pt-2 space-y-2.5">
                  
                  {/* Date Group Header */}
                  <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <span>{dateKey}</span>
                    <span className="w-16 h-[1px] bg-gray-200/50"></span>
                  </div>

                  {/* Transactions in Date Group */}
                  <div className="space-y-2">
                    {groupedTransactions[dateKey].map((t) => {
                      const itemIsUdhar = t.type === 'UDHAR';
                      const pMethodLabel =
                        t.paymentMethod === 'CASH'
                          ? '💵 Cash'
                          : t.paymentMethod === 'UPI'
                          ? '📱 UPI / Online'
                          : '📖 Khata';

                      const dateObj = new Date(t.createdAt);
                      const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });

                      return (
                        <div
                          key={t.id}
                          className="bg-white border border-gray-150 rounded-2xl p-3.5 flex items-center justify-between shadow-xs hover:border-gray-300 transition gap-2"
                        >
                          {/* Left Block: Icon Indicator + Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Transaction Circle Indicator */}
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border uppercase font-bold text-xs ${
                              itemIsUdhar
                                ? 'bg-rose-50 border-rose-100 text-rose-600'
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                            }`}>
                              {t.type[0]}
                            </span>
                            
                            <div className="min-w-0">
                              {/* Remarks / Party Name */}
                              <p className="text-xs font-bold text-gray-800 truncate">
                                {t.remarks || 'Cash Transaction'}
                              </p>
                              {/* Payment method + Category + Timestamp */}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap col-span-2">
                                <span className="text-[10px] bg-gray-100 border border-gray-200/40 text-gray-500 font-semibold px-2 py-0.5 rounded-md">
                                  {pMethodLabel}
                                </span>
                                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-650 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                  {getCategoryEmoji(t.category, t.type)} {cleanCategoryName(t.category)}
                                </span>
                                <span className="text-[9px] text-gray-400 font-medium">
                                  {formattedTime}
                                </span>
                              </div>
                              {/* Notes */}
                              {t.notes && (
                                <p className="text-[10px] text-gray-500 italic mt-1 bg-[#faf9f6] p-1.5 rounded-lg border border-gray-100 break-words max-w-[280px]">
                                  📝 {t.notes}
                                </p>
                              )}
                              {/* Created By Staff Detail */}
                              {t.createdByDisplayName && t.createdByEmail !== userEmail && (
                                <div className="text-[8px] text-emerald-600 mt-1 font-semibold truncate max-w-[150px]">
                                  ✍️ staff: {t.createdByDisplayName}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Block: Amount & Action Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-black font-mono tracking-tight ${
                              itemIsUdhar ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                              {itemIsUdhar ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN')}
                            </span>
                            
                            {/* Edit entry trigger */}
                            <button
                              onClick={() => onEditTransaction(t)}
                              className="p-1.5 hover:bg-emerald-50 text-gray-300 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                              title="Edit log entry"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete entry trigger */}
                            <button
                              onClick={() => handleDeleteClick(t.id, t.remarks, t.amount)}
                              className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-55 rounded-lg transition cursor-pointer"
                              title="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* FLOAT ACTION STICKY BOTTOM BUTTON (3-SECOND QUICK ENTRY) */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-xs px-5 z-20 font-sans">
            <button
              onClick={onOpenQuickEntry}
              id="quick-entry-fab"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full py-4 text-sm tracking-wide shadow-2xl flex items-center justify-center gap-2.5 transition active:scale-95 duration-150 cursor-pointer"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span>Quick Entry (नवीन जमा/उधार)</span>
            </button>
          </div>
        </>
      )}

      {/* HISTORICAL REGISTERS & ADVANCED AUDITING SCREEN */}
      {activePanel === 'HISTORY' && (
        <HistoryScreen
          transactions={transactions}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
          userEmail={userEmail}
        />
      )}

      {/* ANALYTICS & REPORTS PANEL */}
      {activePanel === 'REPORTS' && (
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-10 space-y-5 bg-[#faf9f6]">
          {/* TIME DURATION SELECTOR CARD */}
          <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-xs space-y-3.5">
            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">Report Duration / कालावधी</h3>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-150">
                <button
                  onClick={() => setReportTimeframe('WEEK')}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer uppercase ${
                    reportTimeframe === 'WEEK'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  7 Days / ७ दिवस
                </button>
                <button
                  onClick={() => setReportTimeframe('MONTH')}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer uppercase ${
                    reportTimeframe === 'MONTH'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  30 Days / ३० दिवस
                </button>
                <button
                  onClick={() => setReportTimeframe('YEAR')}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer uppercase ${
                    reportTimeframe === 'YEAR'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  365 Days / वर्ष
                </button>
              </div>
            </div>

            {/* Analysis type selector */}
            <div className="border-t border-gray-100 pt-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2.5">Group By Breakdown / विश्लेषण प्रकार</h3>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-150">
                <button
                  onClick={() => setReportViewType('CATEGORY')}
                  className={`py-2 text-[9px] font-extrabold rounded-lg transition-all cursor-pointer uppercase flex items-center justify-center gap-1 ${
                    reportViewType === 'CATEGORY'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  📁 Categories / श्रेणीनुसार
                </button>
                <button
                  onClick={() => setReportViewType('PARTY')}
                  className={`py-2 text-[9px] font-extrabold rounded-lg transition-all cursor-pointer uppercase flex items-center justify-center gap-1 ${
                    reportViewType === 'PARTY'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  👥 Parties / तपशीलनुसार
                </button>
              </div>
            </div>
          </div>

          {reportStats.transactionsCount === 0 ? (
            <div className="bg-white border border-gray-150 rounded-2xl p-10 text-center space-y-3">
              <span className="text-4xl">📊</span>
              <p className="text-xs font-bold text-gray-700">No data for selected period</p>
              <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto">
                No transaction logs are found within the chosen duration to format reports.
              </p>
            </div>
          ) : (
            <>
              {/* PERIOD SUMMARY BLOCK */}
              <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"></div>
                <div className="relative">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Net Period Balance / केवळ शिल्लक</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold text-emerald-400">₹</span>
                    <span className="text-2xl font-black font-mono tracking-tight text-white">
                      {(reportStats.totalJama - reportStats.totalUdhar).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="mt-5 space-y-1.55">
                    <div className="flex justify-between text-[11px] font-bold text-slate-300">
                      <span>Total Jama: ₹{reportStats.totalJama.toLocaleString('en-IN')}</span>
                      <span>Total Udhar: ₹{reportStats.totalUdhar.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-400 h-full" 
                        style={{ width: `${(reportStats.totalJama / (reportStats.totalJama + reportStats.totalUdhar || 1)) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${(reportStats.totalUdhar / (reportStats.totalJama + reportStats.totalUdhar || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-[9px] text-slate-405 flex justify-between pt-1">
                      <span>Based on {reportStats.transactionsCount} entries</span>
                      {reportStats.totalJama + reportStats.totalUdhar > 0 ? (
                        <span>Expense is {Math.round((reportStats.totalUdhar / (reportStats.totalJama + reportStats.totalUdhar || 1)) * 100)}% of turnover</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* INCOME ANALYSIS (JAMA BY NAME / CATEGORY) */}
              <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in border-e border-emerald-100">
                <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {reportViewType === 'CATEGORY' 
                      ? 'Income by Category / जमा विभागवारी' 
                      : 'Income by Party / जमा विश्लेषण (Top 10)'}
                  </span>
                </h3>

                {((reportViewType === 'CATEGORY' ? reportStats.sortedJamaCategories : reportStats.sortedJamaNames).length === 0) ? (
                  <p className="text-[11px] text-gray-400 py-4 text-center">No income transactions logged in this duration.</p>
                ) : (
                  <div className="space-y-4">
                    {(reportViewType === 'CATEGORY' ? reportStats.sortedJamaCategories : reportStats.sortedJamaNames).slice(0, 10).map((item, idx) => {
                      const percent = reportStats.totalJama > 0 
                        ? Math.round((item.sum / reportStats.totalJama) * 100) 
                        : 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                            <span className="truncate max-w-[180px] flex items-center gap-1.5">
                              {reportViewType === 'CATEGORY' && (
                                <span className="text-sm shrink-0">{getCategoryEmoji(item.name, 'JAMA')}</span>
                              )}
                              <span>{reportViewType === 'CATEGORY' ? cleanCategoryName(item.name) : (item.name || 'Personal/Cash Jama')}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-emerald-600">₹{item.sum.toLocaleString('en-IN')}</span>
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">{percent}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* EXPENSE ANALYSIS (UDHAR BY NAME / CATEGORY) */}
              <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in border-e border-rose-100">
                <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {reportViewType === 'CATEGORY' 
                      ? 'Expense by Category / खर्च विभागवारी' 
                      : 'Expense by Party / खर्च विश्लेषण (Top 10)'}
                  </span>
                </h3>

                {((reportViewType === 'CATEGORY' ? reportStats.sortedUdharCategories : reportStats.sortedUdharNames).length === 0) ? (
                  <p className="text-[11px] text-gray-400 py-4 text-center">No expense transactions logged in this duration.</p>
                ) : (
                  <div className="space-y-4">
                    {(reportViewType === 'CATEGORY' ? reportStats.sortedUdharCategories : reportStats.sortedUdharNames).slice(0, 10).map((item, idx) => {
                      const percent = reportStats.totalUdhar > 0 
                        ? Math.round((item.sum / reportStats.totalUdhar) * 100) 
                        : 100;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                            <span className="truncate max-w-[180px] flex items-center gap-1.5">
                              {reportViewType === 'CATEGORY' && (
                                <span className="text-sm shrink-0">{getCategoryEmoji(item.name, 'UDHAR')}</span>
                              )}
                              <span>{reportViewType === 'CATEGORY' ? cleanCategoryName(item.name) : (item.name || 'Anonymous Udhar/Out')}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-rose-600">₹{item.sum.toLocaleString('en-IN')}</span>
                              <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono font-bold">{percent}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* CUSTOM CONFIRMATION OVERLAY FOR HIGHER VALUE DELETION (FINAL DELETION PERMISSION) */}
      {txToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-red-500/20 max-w-sm transition-all">
            
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <span className="p-3 bg-red-50 rounded-2xl border border-red-100 shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-900">Final Deletion Permission / परवानगी</h3>
                <p className="text-[9px] text-red-600 uppercase tracking-widest font-extrabold">Final Deletion Consent Required</p>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Are you sure you want to permanently delete this entry from your business ledger records? This action cannot be undone.
            </p>

            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 mb-4 text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-gray-400">Remarks/Party:</span>
                <span className="font-extrabold text-gray-800 truncate max-w-[160px]">
                  {txToDelete.remarks || 'Cash Transaction'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Amount / रक्कम:</span>
                <span className={`font-mono font-black ${txToDelete.type === 'UDHAR' ? 'text-red-600' : 'text-emerald-600'}`}>
                  ₹{txToDelete.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type / व्यवहार:</span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                  txToDelete.type === 'UDHAR' ? 'bg-rose-50 text-rose-705 border border-rose-100' : 'bg-emerald-50 text-emerald-707 border border-emerald-100'
                }`}>
                  {txToDelete.type === 'UDHAR' ? 'EXPENSE (UDHAR)' : 'INCOME (JAMA)'}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 bg-red-50 text-red-700 text-[11px] p-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Response actions block */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl tracking-wide transition cursor-pointer"
              >
                No, Cancel / मागे फिरा
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await onDeleteTransaction(txToDelete.id);
                    setTxToDelete(null);
                  } catch (err: any) {
                    setDeleteError(err?.message || 'Failed to remove transaction.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl tracking-wide transition shadow-md cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Trash2 className="w-3.5 h-3.5 animate-bounce" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete / कट करा'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
