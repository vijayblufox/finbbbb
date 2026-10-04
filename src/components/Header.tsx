import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Download, 
  Terminal, 
  Clock, 
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Zap,
  Table,
  Database,
  LineChart,
  Bot
} from 'lucide-react';
import { MarketSummaryItem, StockMeta } from '../types/market';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  availableStocks: StockMeta[];
  summaryItems: MarketSummaryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenDirectory: () => void;
  onOpenAddStockModal: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  lastUpdatedTime: string;
  primaryView: 'swing_calls' | 'data_lake' | 'stock_data';
  onSetPrimaryView: (view: 'swing_calls' | 'data_lake' | 'stock_data') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  availableStocks,
  summaryItems,
  isLoading,
  onRefresh,
  onOpenDirectory,
  onOpenAddStockModal,
  autoRefresh,
  onToggleAutoRefresh,
  lastUpdatedTime,
  primaryView,
  onSetPrimaryView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [istTime, setIstTime] = useState('');
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // Update IST clock and market status
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // IST is UTC + 5:30
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const istDate = new Date(utc + (3600000 * 5.5));
      
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const day = istDate.getDay(); // 0 is Sunday, 6 is Saturday

      const isWeekday = day >= 1 && day <= 5;
      const totalMinutes = hours * 60 + minutes;
      const isOpen = isWeekday && (totalMinutes >= (9 * 60 + 15) && totalMinutes <= (15 * 60 + 30));

      setIsMarketOpen(isOpen);
      setIstTime(istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter stocks for search
  const filteredStocks = searchQuery.trim()
    ? availableStocks.filter(
        s =>
          s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.sector.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if matched in filtered
    if (filteredStocks.length > 0) {
      onSelectSymbol(filteredStocks[0].symbol);
    } else {
      // Direct symbol input (e.g. ZOMATO, TATASTEEL, etc.)
      const formatted = searchQuery.trim().toUpperCase().endsWith('.NS') 
        ? searchQuery.trim().toUpperCase() 
        : `${searchQuery.trim().toUpperCase()}.NS`;
      onSelectSymbol(formatted);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner: Ticker Tape */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 overflow-x-auto text-xs flex items-center gap-6 whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
          <span className={`inline-block w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
          <span>NSE India</span>
          <span className="text-slate-600">·</span>
          <span>{isMarketOpen ? 'Market Live' : 'Market Closed'}</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono-num text-slate-300">{istTime} IST</span>
        </div>

        <div className="flex items-center gap-5">
          {summaryItems.map((item) => {
            const isPos = item.changePercent >= 0;
            const isSelected = item.symbol === currentSymbol;
            return (
              <button
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className={`flex items-center gap-1.5 transition-colors py-0.5 px-2 rounded ${
                  isSelected 
                    ? 'bg-slate-800 text-white font-semibold' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="text-slate-400 font-medium">{item.symbol.replace('.NS', '')}</span>
                <span className="font-mono-num text-slate-200">
                  {item.currentPrice > 0 ? `₹${item.currentPrice.toLocaleString('en-IN')}` : '--'}
                </span>
                <span className={`font-mono-num flex items-center text-[11px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                NSE Swing Strategy Lab & Paper Trader
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/80">
                Autonomous Paper Trading
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live automated paper execution of proven swing strategies · Strict Target/Stop/Time exits · Continuous Daily Data Ingestion
            </p>
          </div>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-2 flex-1 max-w-lg md:ml-auto relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search NSE stock (e.g., RELIANCE, TCS, INFY, or type symbol)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-lg pl-9 pr-20 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono-num"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
              >
                Go
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && filteredStocks.length > 0 && (
              <div 
                className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80"
                onMouseLeave={() => setShowDropdown(false)}
              >
                {filteredStocks.map((stock) => (
                  <button
                    key={stock.symbol}
                    type="button"
                    onClick={() => {
                      onSelectSymbol(stock.symbol);
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-800/70 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 font-mono-num flex items-center gap-1.5">
                        {stock.symbol}
                        <span className="text-[10px] text-slate-400 font-normal">({stock.index})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{stock.name}</div>
                    </div>
                    <span className="text-[11px] text-indigo-400 font-medium">{stock.sector}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Directory browse button */}
          <button
            onClick={onOpenDirectory}
            title="Browse all NSE Stocks & Watchlist"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Browse</span>
          </button>

          {/* Add Stock button */}
          <button
            onClick={onOpenAddStockModal}
            title="Add any stock in NSE stock market"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <span className="text-base leading-none font-bold">+</span>
            <span>Add Stock</span>
          </button>

          {/* Auto-Update Toggle */}
          <button
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? 'Live In-Line Auto-Sync is ON (30s)' : 'Turn ON Live In-Line Auto-Sync'}
            className={`flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-xs font-mono-num transition-colors shrink-0 ${
              autoRefresh
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="hidden sm:inline">Live 30s</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title={`Refresh Now (Last synced: ${lastUpdatedTime || 'Just now'})`}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary 3-Tab Views Strip: Paper Trader, NSE Data Lake, and Stock Chart */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Tab 1: Automated Paper Trader */}
            <button
              onClick={() => onSetPrimaryView('swing_calls')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md ${
                primaryView === 'swing_calls'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white ring-2 ring-indigo-400/50 shadow-indigo-600/30'
                  : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>🤖 AUTO STRATEGY PAPER TRADER</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black tracking-wide">
                CORE
              </span>
            </button>

            {/* Tab 2: NSE Data Lake */}
            <button
              onClick={() => onSetPrimaryView('data_lake')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                primaryView === 'data_lake'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white ring-2 ring-indigo-400/50 shadow-indigo-600/30'
                  : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Database className="w-4 h-4 text-amber-400" />
              <span>📊 NSE DATA LAKE & DAILY INGESTION</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                2,599 STOCKS
              </span>
            </button>

            {/* Tab 3: Stock Chart & Technicals */}
            <button
              onClick={() => onSetPrimaryView('stock_data')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                primaryView === 'stock_data'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <LineChart className="w-4 h-4 text-indigo-400" />
              <span>📈 STOCK CHART & TECHNICALS</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono-num">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {primaryView === 'swing_calls'
                ? 'Mode: Autonomous Strategy Execution Lab'
                : primaryView === 'data_lake'
                ? 'Mode: Daily EOD Ingestion Inspector'
                : `Mode: Inspecting ${currentSymbol}`}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
