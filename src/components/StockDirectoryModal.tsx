import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Layers, 
  ChevronRight, 
  TrendingUp,
  SlidersHorizontal,
  Building2,
  Plus,
  Star
} from 'lucide-react';
import { StockMeta } from '../types/market';

interface StockDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: StockMeta[];
  currentSymbol: string;
  onSelectStock: (symbol: string) => void;
  onOpenAddStockModal: () => void;
  watchlist: string[];
  onToggleWatchlist: (symbol: string) => void;
}

export const StockDirectoryModal: React.FC<StockDirectoryModalProps> = ({
  isOpen,
  onClose,
  stocks,
  currentSymbol,
  onSelectStock,
  onOpenAddStockModal,
  watchlist,
  onToggleWatchlist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  if (!isOpen) return null;

  // Extract unique sectors
  const sectors = ['All', 'Watchlist', ...Array.from(new Set(stocks.map(s => s.sector)))];

  // Filter stocks
  const filtered = stocks.filter(s => {
    if (selectedCategory === 'Watchlist') {
      if (!watchlist.includes(s.symbol)) return false;
    } else if (selectedCategory !== 'All') {
      if (s.sector !== selectedCategory) return false;
    }

    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q) ||
      s.index.toLowerCase().includes(q)
    );
  });

  const visibleStocks = filtered.slice(0, displayLimit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              National Stock Exchange (NSE) Directory
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select or add any listed NSE stock or index to examine 1-year daily historical records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAddStockModal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Stock</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by symbol, company name or sector (e.g. Tata, HDFC, Defense, Rail)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono-num"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {sectors.map(sec => (
                <option key={sec} value={sec}>
                  {sec === 'Watchlist' ? `⭐ Watchlist (${watchlist.length})` : sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid of Stocks */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-800/60 max-h-[55vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleStocks.map((stock) => {
              const isSelected = stock.symbol === currentSymbol;
              const isStarred = watchlist.includes(stock.symbol);

              return (
                <div
                  key={stock.symbol}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between group relative ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-600 shadow-md ring-1 ring-indigo-500/50'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelectStock(stock.symbol);
                        onClose();
                      }}
                      className="text-left flex-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 font-mono-num text-sm group-hover:text-indigo-300 transition-colors">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                          {stock.index}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {stock.name}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(stock.symbol);
                      }}
                      title={isStarred ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      className="p-1 hover:bg-slate-700/60 rounded text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} />
                    </button>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-indigo-400 font-medium">{stock.sector}</span>
                    <button
                      onClick={() => {
                        onSelectStock(stock.symbol);
                        onClose();
                      }}
                      className="text-slate-400 group-hover:text-white font-medium flex items-center gap-0.5"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {filtered.length > displayLimit && (
            <div className="pt-4 pb-2 text-center">
              <button
                type="button"
                onClick={() => setDisplayLimit(prev => prev + 90)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
              >
                Load More Stocks (Showing {displayLimit} of {filtered.length})
              </button>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-xs space-y-3">
              <p>No NSE stocks match &ldquo;{query}&rdquo; in {selectedCategory}.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAddStockModal();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add &ldquo;{query || 'New Stock'}&rdquo; to Terminal</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} NSE stocks & indices shown</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onOpenAddStockModal();
              }}
              className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>Add custom ticker</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
