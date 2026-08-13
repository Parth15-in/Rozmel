import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  ChevronRight, 
  X, 
  Printer, 
  LayoutList, 
  TableProperties, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Pencil, 
  Download, 
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  BookOpen,
  AlertCircle,
  Folder,
  IndianRupee,
  Smartphone,
  ClipboardList,
  ShoppingBag,
  ShoppingCart,
  Home,
  Users,
  Zap,
  Car,
  Coffee,
  Wrench,
  MessageSquare,
  Package,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { LedgerTransaction } from '../types';

interface HistoryScreenProps {
  transactions: LedgerTransaction[];
  onEditTransaction: (transaction: LedgerTransaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  userEmail?: string;
}

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM';
type ViewMode = 'LIST' | 'TABLE';

// Helper to check first emoji
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

// Helper to resolve custom emojis
const getCategoryIcon = (category?: string, type?: 'JAMA' | 'UDHAR') => {
  const iconClass = 'w-3.5 h-3.5';
  if (!category) {
    return type === 'JAMA' ? <BookOpen className={iconClass} /> : <Package className={iconClass} />;
  }
  const emoji = getFirstEmoji(category);
  const normalized = (emoji ? category.slice(emoji.length).trim() : category).toLowerCase();
  if (normalized.includes('sale') || normalized.includes('विक्री')) return <ShoppingBag className={iconClass} />;
  if (normalized.includes('payment') || normalized.includes('पेमेंट')) return <IndianRupee className={iconClass} />;
  if (normalized.includes('interest') || normalized.includes('व्याज')) return <TrendingUp className={iconClass} />;
  if (normalized.includes('rent') || normalized.includes('भाडे')) return <Home className={iconClass} />;
  if (normalized.includes('salary') || normalized.includes('पगार')) return <Users className={iconClass} />;
  if (normalized.includes('purchase') || normalized.includes('खरेदी')) return <ShoppingCart className={iconClass} />;
  if (normalized.includes('bill') || normalized.includes('बिले')) return <Zap className={iconClass} />;
  if (normalized.includes('travel') || normalized.includes('प्रवास')) return <Car className={iconClass} />;
  if (normalized.includes('snack') || normalized.includes('नाश्ता')) return <Coffee className={iconClass} />;
  if (normalized.includes('repair') || normalized.includes('दुरुस्ती')) return <Wrench className={iconClass} />;
  return type === 'JAMA' ? <BookOpen className={iconClass} /> : <Package className={iconClass} />;
};

// Helper to remove emoji from name
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

export default function HistoryScreen({ 
  transactions, 
  onEditTransaction, 
  onDeleteTransaction, 
  userEmail 
}: HistoryScreenProps) {
  // Filters local states
  const [searchText, setSearchText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'JAMA' | 'UDHAR'>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'CASH' | 'UPI' | 'KHATA'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [isSortedDesc, setIsSortedDesc] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState<boolean>(false);

  // Custom date ranges
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date search in category section
  const [dateSearchText, setDateSearchText] = useState('');

  // Delete Confirmation overlay states
  const [txToDelete, setTxToDelete] = useState<LedgerTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Print Preview Dialog
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Derive unique categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [transactions]);

  // Helper: format date as DD/MM/YYYY
  const formatDateIndian = (dateStr: string) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Compute filtered logs
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    return transactions.filter((t) => {
      // 1. Search keyword (supports remarks, category, notes, amount, method, and DD/MM/YYYY date)
      const searchLower = searchText.trim().toLowerCase();
      const txDateFormattedStr = formatDateIndian(t.createdAt).toLowerCase();
      const matchSearch =
        searchLower === '' ||
        (t.remarks || '').toLowerCase().includes(searchLower) ||
        (t.category || '').toLowerCase().includes(searchLower) ||
        (t.notes || '').toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchLower) ||
        (t.paymentMethod || '').toLowerCase().includes(searchLower) ||
        txDateFormattedStr.includes(searchLower);

      // 2. Type Filter
      const matchType = selectedType === 'ALL' || t.type === selectedType;

      // 3. Method Filter
      const matchMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;

      // 4. Category Filter
      const matchCategory = selectedCategory === 'ALL' || t.category === selectedCategory;

      // 5. Date search filter (DD/MM/YYYY text match)
      const dateSearchLower = dateSearchText.trim().toLowerCase();
      const txDateStr = formatDateIndian(t.createdAt).toLowerCase();
      const matchDateSearch = dateSearchLower === '' || txDateStr.includes(dateSearchLower);

      // 6. Date preset filter
      let matchDate = true;
      const txDate = new Date(t.createdAt);

      if (selectedPreset === 'TODAY') {
        matchDate = txDate >= today;
      } else if (selectedPreset === 'YESTERDAY') {
        const endOfYesterday = new Date(today);
        endOfYesterday.setSeconds(-1);
        matchDate = txDate >= yesterday && txDate <= endOfYesterday;
      } else if (selectedPreset === 'WEEK') {
        matchDate = txDate >= weekAgo;
      } else if (selectedPreset === 'MONTH') {
        matchDate = txDate >= monthAgo;
      } else if (selectedPreset === 'CUSTOM') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0,0,0,0);
          matchDate = matchDate && txDate >= start;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23,59,59,999);
          matchDate = matchDate && txDate <= end;
        }
      }

      return matchSearch && matchType && matchMethod && matchCategory && matchDate && matchDateSearch;
    }).sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return isSortedDesc ? timeB - timeA : timeA - timeB;
    });
  }, [
    transactions,
    searchText,
    selectedType,
    selectedMethod,
    selectedCategory,
    selectedPreset,
    customStartDate,
    customEndDate,
    isSortedDesc,
    dateSearchText
  ]);

  // Compute stats for filtered logs
  const filteredStats = useMemo(() => {
    let jama = 0;
    let udhar = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'JAMA') {
        jama += t.amount;
      } else {
        udhar += t.amount;
      }
    });
    return {
      jama,
      udhar,
      balance: jama - udhar,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Date formatter for lists - DD/MM/YYYY Indian style
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[d.getDay()];
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const clearAllFilters = () => {
    setSearchText('');
    setSelectedPreset('ALL');
    setSelectedType('ALL');
    setSelectedMethod('ALL');
    setSelectedCategory('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setDateSearchText('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`flex flex-col overflow-hidden bg-[#faf9f6] font-sans transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[200] h-screen' : 'flex-1 h-full'}`}>
      
      {/* FILTER STICKY TOP CONTROLLER - Collapsible with ^ toggle */}
      {!isFiltersCollapsed && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white border-b border-gray-150 p-3 sm:p-4 space-y-2.5 shrink-0 shadow-xs"
        >
        
        {/* Search Bar + Sort/View Mode Toggles */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search remarks, categories, rupees..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-slate-50 border border-gray-250 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
              id="history-search-input"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchText && (
              <button 
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-2 py-0.5 px-1 hover:bg-gray-100 rounded text-slate-400 font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Button */}
          <button
            onClick={() => setIsSortedDesc(!isSortedDesc)}
            title={isSortedDesc ? "Newest First" : "Oldest First"}
            className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
          </button>

          {/* View Model Toggle */}
          <div className="flex bg-slate-50 border border-gray-200 p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'LIST' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              title="Cards View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'TABLE' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
              title="Spreadsheet Table View"
            >
              <TableProperties className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Date Presets Selector Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {(['ALL', 'TODAY', 'YESTERDAY', 'WEEK', 'MONTH', 'CUSTOM'] as DatePreset[]).map((p) => {
            const labels: Record<DatePreset, string> = {
              ALL: 'All Logs',
              TODAY: 'Today',
              YESTERDAY: 'Yesterday',
              WEEK: '7 Days',
              MONTH: '30 Days',
              CUSTOM: 'Custom Range 📅'
            };
            return (
              <button
                key={p}
                onClick={() => setSelectedPreset(p)}
                className={`text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border shrink-0 transition cursor-pointer tracking-wider ${
                  selectedPreset === p
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Custom Date Parameters Triggered ONLY under Custom Presets option */}
        {selectedPreset === 'CUSTOM' && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-xl"
          >
            <div>
              <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Start Date / प्रारंभ</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-lg p-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">End Date / शेवट</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-lg p-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-600"
              />
            </div>
          </motion.div>
        )}

        {/* Filter Pills Layout: Types & Methods */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
          {/* Method Filters */}
          <div className="flex flex-wrap gap-1">
            {(['ALL', 'CASH', 'UPI', 'KHATA'] as const).map((method) => (
              <button
                key={method}
                onClick={() => setSelectedMethod(method)}
                className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded-md border transition cursor-pointer uppercase ${
                  selectedMethod === method
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {method === 'ALL' ? (
                  'All Modes'
                ) : method === 'CASH' ? (
                  <span className="inline-flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> CASH</span>
                ) : method === 'UPI' ? (
                  <span className="inline-flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> UPI</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> KHATA</span>
                )}
              </button>
            ))}
          </div>

          {/* Type filters */}
          <div className="flex gap-1 border-l border-gray-200 pl-2 shrink-0">
            {(['ALL', 'JAMA', 'UDHAR'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2 py-1 text-[9px] font-black rounded-md border transition cursor-pointer uppercase text-center w-11 ${
                  selectedType === type
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-white text-slate-400 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Category Carousel filter + Date Search */}
        {categoriesList.length > 1 && (
          <div className="space-y-2 border-t border-gray-50 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[8px] font-black uppercase text-slate-400 shrink-0">Folder / श्रेणी:</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {categoriesList.map((catName) => {
                  const isAll = catName === 'ALL';
                  const displayLabel = isAll ? 'All Categories' : cleanCategoryName(catName);
                  return (
                    <button
                      key={catName}
                      onClick={() => setSelectedCategory(catName)}
                      className={`px-2 py-1 text-[9px] font-black rounded-lg border transition shrink-0 cursor-pointer ${
                        selectedCategory === catName
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-500 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isAll ? (
                        <span className="inline-flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" /> All</span>
                      ) : (
                        <span className="inline-flex items-center gap-1">{getCategoryIcon(catName)}<span>{displayLabel}</span></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Date search row */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search by date DD/MM/YYYY..."
                value={dateSearchText}
                onChange={(e) => setDateSearchText(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-xl py-1.5 pl-8 pr-7 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                id="history-date-search-input"
              />
              {dateSearchText && (
                <button
                  onClick={() => setDateSearchText('')}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        </motion.div>
      )}

      {/* FILTER ACTIVE COUNTER & EXPORT ACTION ROW WITH PULL-UP ^ TOGGLE */}
      <div className="px-3.5 py-2 bg-slate-100 flex items-center justify-between border-b border-gray-150 text-[10px] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-600 font-bold truncate">
          <Filter className="text-emerald-600 w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Found {filteredTransactions.length} transaction entries</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Print preview */}
          {filteredTransactions.length > 0 && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black rounded-lg py-1 px-1.5 uppercase hover:bg-emerald-100 cursor-pointer flex items-center gap-1 text-[9px]"
            >
              <Printer className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline">Statement / प्रिंट</span>
              <span className="sm:hidden">Print</span>
            </button>
          )}

          {/* Reset Filters */}
          {(searchText !== '' || selectedPreset !== 'ALL' || selectedType !== 'ALL' || selectedMethod !== 'ALL' || selectedCategory !== 'ALL' || dateSearchText !== '') && (
            <button
              onClick={clearAllFilters}
              className="text-rose-600 hover:text-rose-800 uppercase font-black tracking-tight cursor-pointer text-[9px] px-1"
            >
              Reset
            </button>
          )}

          {/* ^ Fullscreen Pull-Up Toggle Button (Icon Only) */}
          <button
            onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            title={isFiltersCollapsed ? "Show Filters" : "Fullscreen Mode (^)"}
            className={`p-1.5 rounded-lg font-black transition cursor-pointer border shadow-xs flex items-center justify-center shrink-0 ${
              isFiltersCollapsed 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
            }`}
            id="pullup-bigscreen-btn"
          >
            {isFiltersCollapsed ? (
              <ChevronDown className="w-4 h-4 text-white" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* REAL-TIME FILTERED STATS SUMMARY BANNER */}
      {filteredTransactions.length > 0 && (
        <div className="px-4 py-3 bg-white border-b border-gray-150 grid grid-cols-3 gap-2.5 shrink-0 text-center shadow-inner">
          <div className="bg-emerald-50/50 border border-emerald-100/70 p-2 rounded-xl">
            <span className="text-[8px] font-black uppercase text-emerald-600 block">Filtered Deposits / जमा (+)</span>
            <span className="text-xs font-black font-mono text-emerald-700 tracking-tight">
              ₹ {filteredStats.jama.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-rose-50/50 border border-rose-105/70 p-2 rounded-xl">
            <span className="text-[8px] font-black uppercase text-rose-605 block text-rose-505">Filtered Paid / खर्च (-)</span>
            <span className="text-xs font-black font-mono text-rose-700 tracking-tight">
              ₹ {filteredStats.udhar.toLocaleString('en-IN')}
            </span>
          </div>

          <div className={`p-2 rounded-xl border ${filteredStats.balance >= 0 ? 'bg-slate-900 border-slate-950 text-white shadow-xs' : 'bg-rose-50 text-rose-820 border-rose-220 font-bold'}`}>
            <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">Filtered Net</span>
            <span className={`text-xs font-black font-mono tracking-tight block truncate ${filteredStats.balance >=0 ? 'text-emerald-400' : 'text-red-500'}`}>
              ₹ {filteredStats.balance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC HISTORICAL DATA SCROLL FRAME */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3.5 h-full">
            <BookOpen className="w-12 h-12 text-slate-300" />
            <h3 className="text-sm font-black text-slate-700">No Historical Logs Found</h3>
            <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
              No daily rojmel log entries matches your active filters/presets. Adjust filters or register a new transaction.
            </p>
            {(searchText || selectedPreset !== 'ALL' || selectedType !== 'ALL' || selectedMethod !== 'ALL' || selectedCategory !== 'ALL') && (
              <button
                onClick={clearAllFilters}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-950 text-white text-[10px] uppercase font-black px-4 py-2 rounded-xl shadow-md transition cursor-pointer"
              >
                Clear Filters / रीसेट करा
              </button>
            )}
          </div>
        ) : viewMode === 'LIST' ? (
          /* CARD LIST VIEW mode */
          <div className="p-4 space-y-2 pb-24">
            {filteredTransactions.map((t) => {
              const isUdhar = t.type === 'UDHAR';
              return (
                <div 
                  key={t.id}
                  className="bg-white border border-gray-150 hover:border-gray-300 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-xs transition"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 border mt-0.5 ${
                      isUdhar 
                        ? 'bg-rose-50 border-rose-100 text-rose-600' 
                        : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      {isUdhar ? 'खर्च' : 'जमा'}
                    </span>
                    
                    <div className="min-w-0">
                      {/* Remarks */}
                      <p className="text-xs font-black text-slate-800 leading-tight break-words">
                        {t.remarks || 'Cash/Direct Rojmel Entry'}
                      </p>

                      {t.notes && (
                        <p className="text-[10px] text-gray-500 italic mt-1 bg-[#faf9f6]/95 p-1.5 rounded-lg border border-gray-150 break-words max-w-[280px]">
                          <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{t.notes}</span>
                        </p>
                      )}
                      
                      {/* Secondary meta flags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 border border-gray-180 text-slate-500 inline-flex items-center gap-1">
                          {t.paymentMethod === 'CASH' ? <><IndianRupee className="w-3.5 h-3.5" /> CASH</> : t.paymentMethod === 'UPI' ? <><Smartphone className="w-3.5 h-3.5" /> UPI</> : <><BookOpen className="w-3.5 h-3.5" /> KHATA</>}
                        </span>
                        
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-205 text-slate-600 flex items-center gap-1 max-w-[150px] truncate">
                          {getCategoryIcon(t.category, t.type)} {cleanCategoryName(t.category)}
                        </span>
                      </div>

                      {/* Date & staff */}
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-slate-400 font-bold">
                        <span>{formatDate(t.createdAt)}</span>
                        <span>•</span>
                        <span>{formatTime(t.createdAt)}</span>
                        {t.createdByDisplayName && t.createdByEmail !== userEmail && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-600"><Pencil className="w-3.5 h-3.5" />{t.createdByDisplayName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column Right */}
                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <span className={`text-sm font-black font-mono tracking-tight ${isUdhar ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isUdhar ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN')}
                    </span>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-350 hover:text-emerald-700 rounded-lg transition border border-gray-150 hover:border-emerald-100"
                        title="Edit Entry"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setTxToDelete(t);
                          setDeleteError(null);
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-350 hover:text-rose-600 rounded-lg transition border border-gray-150 hover:border-rose-100"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* SPREADSHEET TABLE VIEW MODE */
          <div className="p-2 pb-24 overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-xs text-xs font-sans min-w-[500px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider divide-x divide-slate-800">
                  <th className="py-3 px-2.5 text-center w-12">Type</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Remarks / Party Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-2.5 text-center w-16">Mode</th>
                  <th className="py-3 px-3 text-right">Rupees (₹)</th>
                  <th className="py-3 px-2 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredTransactions.map((t) => {
                  const isUdhar = t.type === 'UDHAR';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/75 transition even:bg-slate-50/25 divide-x divide-gray-100">
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block py-0.5 px-1.5 rounded text-[8px] font-black uppercase border ${
                          isUdhar ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}>
                          {isUdhar ? 'OUT' : 'IN'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[10px] text-slate-450 whitespace-nowrap">
                        <span className="block text-slate-700">{formatDate(t.createdAt)}</span>
                        <span className="text-[9px] text-slate-400 font-medium block">{formatTime(t.createdAt)}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 break-words max-w-[180px]">
                        <div>{t.remarks || 'Cash transaction'}</div>
                        {t.notes && (
                          <div className="text-[9.5px] text-slate-500 font-medium italic mt-0.5 bg-[#faf9f6]/95 p-1 rounded border border-gray-150 break-words">
                            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{t.notes}</span>
                          </div>
                        )}
                        {t.createdByDisplayName && t.createdByEmail !== userEmail && (
                          <span className="text-[7.5px] text-emerald-600 block font-semibold mt-0.5">Staff: {t.createdByDisplayName}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-500 text-[11px] truncate max-w-[120px]">
                        <span className="inline-flex items-center gap-1">{getCategoryIcon(t.category, t.type)}<span>{cleanCategoryName(t.category)}</span></span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-[9px] font-black uppercase text-slate-500 select-none">
                        {t.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono tracking-tight whitespace-nowrap">
                        <span className={isUdhar ? 'text-red-650' : 'text-emerald-650'}>
                          {isUdhar ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditTransaction(t)}
                            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded transition border border-transparent hover:border-gray-200"
                            title="Edit"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setTxToDelete(t);
                              setDeleteError(null);
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition border border-transparent hover:border-red-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRINT PREVIEW COMPONENT DIALOG (Statement Generation view) */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex flex-col justify-between max-w-md mx-auto h-screen shadow-2xl overflow-hidden font-sans">
            
            {/* Header print config */}
            <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wider">Ledger Statement Preview</span>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Printable Document container */}
            <div className="flex-1 overflow-y-auto bg-white p-6 dark-print-section text-slate-900" id="print-area">
              
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h1 className="text-xl font-bold tracking-tight uppercase text-slate-990">Business Rojmel Register</h1>
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">Historical Balance Statement / खाते स्टेटमेंट</p>
                <div className="text-[9px] text-slate-400 font-bold">
                  Generated On: {(() => { const now = new Date(); const dd = String(now.getDate()).padStart(2,'0'); const mm = String(now.getMonth()+1).padStart(2,'0'); const yyyy = now.getFullYear(); const hh = String(now.getHours()).padStart(2,'0'); const min = String(now.getMinutes()).padStart(2,'0'); return `${dd}/${mm}/${yyyy} ${hh}:${min}`; })()}
                </div>
              </div>

              {/* Filtering Parameters Applied Indicator */}
              <div className="grid grid-cols-2 gap-3 py-3 border-b border-gray-100 text-[10px] text-slate-600">
                <div>
                  <span className="font-extrabold block text-[8px] text-slate-405 uppercase tracking-wide">Report Scope Scope</span>
                  <span className="font-bold text-slate-700">Preset Filter: {selectedPreset}</span>
                </div>
                <div>
                  <span className="font-extrabold block text-[8px] text-slate-405 uppercase tracking-wide">Refined By</span>
                  <span className="font-bold text-slate-700">Type: {selectedType}, Method: {selectedMethod}</span>
                </div>
              </div>

              {/* Summary Scoreboard in Print */}
              <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-slate-900/50 text-center">
                <div className="p-1.5 border border-dashed border-emerald-300 bg-emerald-50/10 rounded">
                  <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-wide">TOTAL JAMA / जमा</span>
                  <span className="text-xs font-black font-mono text-emerald-700">₹{filteredStats.jama.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-1.5 border border-dashed border-rose-300 bg-rose-50/10 rounded">
                  <span className="text-[8px] font-black text-rose-600 block uppercase tracking-wide">TOTAL UDHAR / खर्च</span>
                  <span className="text-xs font-black font-mono text-rose-700">₹{filteredStats.udhar.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-1.5 border border-slate-900 bg-slate-900 text-white rounded">
                  <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wide text-white/80">NET SUM SAVED</span>
                  <span className={`text-xs font-black font-mono ${filteredStats.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    ₹{filteredStats.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Transactions printable table list */}
              <div className="pt-4 space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Entries Listing ({filteredTransactions.length} logs)</h3>
                
                <table className="w-full text-left text-[9px] border-collapse min-w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-900 font-black text-slate-700 uppercase">
                      <th className="py-1.5 w-16">Date</th>
                      <th className="py-1.5">Remarks / Party</th>
                      <th className="py-1.5 text-center w-12">Mode</th>
                      <th className="py-1.5 text-right w-16">Jama (+)</th>
                      <th className="py-1.5 text-right w-16">Udhar (-)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransactions.map((t) => {
                      const isUdhar = t.type === 'UDHAR';
                      return (
                        <tr key={t.id} className="align-top">
                          <td className="py-2 font-mono text-slate-500 text-[8px]">
                            {(() => { const d = new Date(t.createdAt); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}
                          </td>
                          <td className="py-2 pr-2">
                            <span className="font-bold text-slate-800 block text-[9.5px]">{t.remarks || 'Cash/Direct Rojmel Log'}</span>
                            {t.notes && (
                              <span className="text-[8px] text-slate-500 block italic leading-tight mb-0.5">Note: {t.notes}</span>
                            )}
                            <span className="text-[7.5px] text-slate-400 block">{cleanCategoryName(t.category)}</span>
                          </td>
                          <td className="py-2 text-center uppercase font-bold text-slate-500 font-mono text-[8px]">
                            {t.paymentMethod}
                          </td>
                          <td className="py-2 text-right font-bold text-emerald-600 font-mono text-[9px]">
                            {!isUdhar ? `₹${t.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2 text-right font-bold text-rose-600 font-mono text-[9px]">
                            {isUdhar ? `₹${t.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Thank you and disclaimer in Print */}
              <div className="mt-8 border-t border-dashed border-gray-300 pt-4 text-center text-[8px] text-slate-400">
                <p>This statement constitutes an electronically generated snapshot log register of your Rojmel ledger records.</p>
                <p className="mt-1 font-bold text-slate-500 text-[9px]">🏪 Smart Rojmel Shop Ledger Dashboard</p>
              </div>

            </div>

            {/* Sticky Actions print trigger bottom */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-2 text-center">
              <button
                onClick={handlePrint}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Trigger System Print Dialog / प्रिंट काढा</span>
              </button>
              
              <button
                onClick={() => setShowPrintModal(false)}
                className="w-full bg-slate-800 border border-slate-750 text-slate-350 hover:bg-slate-700 font-bold py-2 px-6 rounded-xl text-[10px] uppercase transition cursor-pointer"
              >
                Go Back / मागे जा
              </button>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* FINAL TRANSACTION DELETION CONSENT OVERLAY */}
      {txToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-red-500/20 max-w-sm transition-all text-slate-900">
            
            <div className="flex items-center gap-3 text-red-650 mb-4">
              <span className="p-3 bg-red-50 rounded-2xl border border-red-100 shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-900">Final Deletion Permission</h3>
                <p className="text-[8px] text-red-600 uppercase tracking-widest font-extrabold">Permanent record removal consent</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Are you sure you want to permanently delete this entry from your business history files? This operation is irreversible.
            </p>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mb-4 text-xs space-y-2 font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Remarks/Party:</span>
                <span className="font-extrabold text-slate-800 truncate max-w-[150px]">
                  {txToDelete.remarks || 'Cash Transaction'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount / रक्कम:</span>
                <span className={`font-mono font-black ${txToDelete.type === 'UDHAR' ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{txToDelete.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type / व्यवहार:</span>
                <span className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase ${
                  txToDelete.type === 'UDHAR' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {txToDelete.type === 'UDHAR' ? 'EXPENSE / उधार' : 'DEPOSIT / जमा'}
                </span>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 bg-red-50 text-red-700 text-[10px] p-2 rounded-xl border border-red-200 flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Response actions block */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs rounded-xl tracking-wide transition cursor-pointer"
              >
                Cancel / मागे जा
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
                className="py-3 bg-red-650 hover:bg-red-700 text-white font-black text-xs rounded-xl tracking-wide transition shadow-md cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Permanent Delete'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
