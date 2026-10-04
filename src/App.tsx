/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  BarChart2, 
  TrendingUp, 
  Code2, 
  GitCompare, 
  Download, 
  AlertCircle, 
  RefreshCw, 
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Plus,
  Star,
  Zap
} from 'lucide-react';
import { Header } from './components/Header';
import { DailyDataTable } from './components/DailyDataTable';
import { ChartCanvas } from './components/ChartCanvas';
import { PerformanceStats } from './components/PerformanceStats';
import { PythonRunnerPanel } from './components/PythonRunnerPanel';
import { StockComparison } from './components/StockComparison';
import { StockDirectoryModal } from './components/StockDirectoryModal';
import { AddStockModal } from './components/AddStockModal';
import { SwingTradeTab } from './components/SwingTradeTab';
import { AutoStrategyPaperTraderView } from './components/AutoStrategyPaperTraderView';
import { NseDataLakeView } from './components/NseDataLakeView';
import { UptimeRobotModal } from './components/UptimeRobotModal';
import { StockMeta, StockPayload, MarketSummaryItem } from './types/market';

const DEFAULT_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS'];

export default function App() {
  const [primaryView, setPrimaryView] = useState<'swing_calls' | 'data_lake' | 'stock_data'>('swing_calls');
  const [currentSymbol, setCurrentSymbol] = useState<string>('RELIANCE.NS');
  const [stockData, setStockData] = useState<StockPayload | null>(null);
  const [availableStocks, setAvailableStocks] = useState<StockMeta[]>([]);
  const [summaryItems, setSummaryItems] = useState<MarketSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'swing' | 'performance' | 'python' | 'compare'>('table');
  const [isDirectoryOpen, setIsDirectoryOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isUptimeModalOpen, setIsUptimeModalOpen] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Watchlist state synced with localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nse_terminal_watchlist');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return DEFAULT_WATCHLIST;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nse_terminal_watchlist', JSON.stringify(watchlist));
    } catch (_) {}
  }, [watchlist]);

  const handleToggleWatchlist = (symbol: string) => {
    setWatchlist(prev => 
      prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]
    );
  };

  // 1. Fetch available stock directory & market ticker summary on mount
  useEffect(() => {
    const fetchInitialData = async (retry = 2) => {
      try {
        const [stocksRes, summaryRes] = await Promise.all([
          fetch('/api/stocks'),
          fetch('/api/market-summary'),
        ]);

        if (stocksRes.ok) {
          const stocksJson = await stocksRes.json();
          setAvailableStocks(stocksJson.stocks || []);
        }

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          setSummaryItems(summaryJson.summary || []);
        }
      } catch (e) {
        if (retry > 0) {
          setTimeout(() => fetchInitialData(retry - 1), 1000);
        } else {
          console.warn('Initial data load attempt deferred:', e);
        }
      }
    };

    fetchInitialData();
  }, []);

  // 2. Fetch 1-Year historical daily data for the selected symbol with auto-retry
  const fetchStockHistory = useCallback(async (sym: string, force: boolean = false, silent: boolean = false, retryCount: number = 2) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const url = `/api/history/${encodeURIComponent(sym)}?range=1y&interval=1d${force ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to load data for ${sym}`);
      }
      const data: StockPayload = await res.json();
      setStockData(data);
      const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastUpdatedTime(nowStr);
    } catch (err: any) {
      if (retryCount > 0) {
        // Auto-retry once or twice in case of momentary connection glitch
        setTimeout(() => {
          fetchStockHistory(sym, force, silent, retryCount - 1);
        }, 900);
        return;
      }
      console.error('Error fetching stock:', err);
      if (!silent) {
        const isNetworkErr = err.message === 'Failed to fetch' || err.name === 'TypeError';
        const msg = isNetworkErr
          ? `Connection to live feed temporarily interrupted. Please click 'Retry' below.`
          : (err.message || 'Error retrieving historical 1-year data');
        setError(msg);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockHistory(currentSymbol);
  }, [currentSymbol, fetchStockHistory]);

  // Periodic 30-second live in-line auto-update
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStockHistory(currentSymbol, true, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentSymbol, fetchStockHistory]);

  const handleSelectSymbol = (symbol: string) => {
    setCurrentSymbol(symbol);
  };

  const handleStockAdded = (newStock: StockMeta) => {
    setAvailableStocks(prev => {
      if (prev.some(s => s.symbol === newStock.symbol)) {
        return prev.map(s => s.symbol === newStock.symbol ? newStock : s);
      }
      return [newStock, ...prev];
    });

    // Add to watchlist automatically
    setWatchlist(prev => prev.includes(newStock.symbol) ? prev : [newStock.symbol, ...prev]);

    // Select and load it
    setCurrentSymbol(newStock.symbol);
  };

  const handleDownloadCsv = () => {
    window.location.href = `/api/export-csv/${encodeURIComponent(currentSymbol)}?range=1y`;
  };

  const isCurrentInWatchlist = watchlist.includes(currentSymbol);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar & Ticker */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => {
          handleSelectSymbol(sym);
          setPrimaryView('stock_data');
        }}
        availableStocks={availableStocks}
        summaryItems={summaryItems}
        isLoading={isLoading}
        onRefresh={() => fetchStockHistory(currentSymbol, true, false)}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onOpenAddStockModal={() => setIsAddModalOpen(true)}
        onOpenUptimeRobot={() => setIsUptimeModalOpen(true)}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(prev => !prev)}
        lastUpdatedTime={lastUpdatedTime}
        primaryView={primaryView}
        onSetPrimaryView={setPrimaryView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {primaryView === 'swing_calls' ? (
          <AutoStrategyPaperTraderView
            onSelectStock={(sym) => {
              handleSelectSymbol(sym);
              setPrimaryView('stock_data');
            }}
          />
        ) : primaryView === 'data_lake' ? (
          <NseDataLakeView
            onSelectStock={(sym) => {
              handleSelectSymbol(sym);
              setPrimaryView('stock_data');
            }}
            availableStocks={availableStocks}
          />
        ) : (
          <>
            {/* Active Stock Hero Banner */}
            {stockData && (
              <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white font-mono-num">
                    {stockData.meta.symbol}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
                    {stockData.meta.index}
                  </span>
                  <span className="text-xs text-slate-400">
                    {stockData.meta.sector}
                  </span>

                  {/* Watchlist Toggle Button */}
                  <button
                    onClick={() => handleToggleWatchlist(stockData.meta.symbol)}
                    className={`ml-2 px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isCurrentInWatchlist
                        ? 'bg-amber-950/40 border-amber-700/60 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isCurrentInWatchlist ? 'fill-amber-400 text-amber-400' : ''}`} />
                    <span>{isCurrentInWatchlist ? 'Watchlist' : 'Add to Watchlist'}</span>
                  </button>

                  {/* Add New Stock Shortcut */}
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/80 text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Stock</span>
                  </button>

                  {/* Swing Trade Quick Jump Button */}
                  <button
                    onClick={() => setActiveTab('swing')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-500/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Swing Prediction</span>
                  </button>
                </div>

                <div className="text-sm text-slate-300 font-medium">
                  {stockData.meta.name}
                </div>
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                  <span>Exchange: NSE India</span>
                  <span>·</span>
                  <span>Currency: INR (₹)</span>
                  <span>·</span>
                  <span>1-Year Trading Sessions: <strong className="text-slate-200">{stockData.meta.tradingDaysCount} days</strong></span>
                  {lastUpdatedTime && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-emerald-400 font-mono-num font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        In-line Synced: {lastUpdatedTime}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Price & 1Y Return */}
              <div className="flex items-center gap-6 self-start md:self-auto border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <div className="text-xs text-slate-400 font-medium">Latest Close</div>
                  <div className="text-3xl font-extrabold font-mono-num text-white">
                    ₹{stockData.meta.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-xs font-semibold font-mono-num flex items-center md:justify-end gap-1 ${
                    stockData.meta.changeToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    <span>{stockData.meta.changeToday >= 0 ? '+' : ''}₹{stockData.meta.changeToday.toFixed(2)}</span>
                    <span>({stockData.meta.changeToday >= 0 ? '+' : ''}{stockData.meta.changePercentToday.toFixed(2)}%)</span>
                  </div>
                </div>

                <div className="border-l border-slate-800 pl-6 text-left md:text-right">
                  <div className="text-xs text-slate-400 font-medium">1-Year Total Return</div>
                  <div className={`text-2xl font-bold font-mono-num ${
                    stockData.meta.totalReturn1Y >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {stockData.meta.totalReturn1Y >= 0 ? '+' : ''}{stockData.meta.totalReturn1Y.toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    52W Range: ₹{stockData.meta.low52w} - ₹{stockData.meta.high52w}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation Controls */}
        <div className="border-b border-slate-800">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none pb-px text-xs font-medium">
            <button
              onClick={() => setActiveTab('swing')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'swing'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Swing Signals & Playground</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-bold">
                AI Predict
              </span>
            </button>

            <button
              onClick={() => setActiveTab('table')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'table'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Daily Details (1-Year Archive)</span>
              {stockData && (
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono-num text-slate-300">
                  {stockData.bars.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'chart'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>OHLCV Candlestick & Technicals</span>
            </button>

            <button
              onClick={() => setActiveTab('performance')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Performance & 52-Week Range</span>
            </button>

            <button
              onClick={() => setActiveTab('python')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'python'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Python & Google Colab Runner</span>
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`py-3 px-3 sm:px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'compare'
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <GitCompare className="w-4 h-4 text-cyan-400" />
              <span>Multi-Stock Comparison</span>
            </button>
          </nav>
        </div>

        {/* Loading Spinner */}
        {isLoading && !stockData && (
          <div className="py-28 flex flex-col items-center justify-center gap-4 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-200">
                Fetching 1-Year Historical Daily Records for {currentSymbol}...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Parsing adjusted OHLCV candles, technical moving averages, and volatility metrics
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <div className="text-rose-200 font-medium text-sm">{error}</div>
            <p className="text-xs text-rose-300/80 max-w-md mx-auto">
              Please check if the NSE ticker is valid (e.g. RELIANCE.NS, TATAPOWER.NS, IRFC.NS, or click Add Stock).
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchStockHistory(currentSymbol)}
                className="px-4 py-2 bg-rose-900/60 hover:bg-rose-900 text-rose-100 rounded-lg text-xs font-semibold transition-colors"
              >
                Retry Fetching
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Add Valid Stock
              </button>
            </div>
          </div>
        )}

        {/* Active Tab Views */}
        {!isLoading && stockData && (
          <div>
            {activeTab === 'swing' && (
              <SwingTradeTab
                currentStock={stockData}
                onSelectStock={handleSelectSymbol}
                availableStocks={availableStocks}
                watchlist={watchlist}
              />
            )}

            {activeTab === 'table' && (
              <DailyDataTable
                stockData={stockData}
                onDownloadCsv={handleDownloadCsv}
              />
            )}

            {activeTab === 'chart' && (
              <ChartCanvas stockData={stockData} />
            )}

            {activeTab === 'performance' && (
              <PerformanceStats stockData={stockData} />
            )}

            {activeTab === 'python' && (
              <PythonRunnerPanel
                stockData={stockData}
                onDownloadCsv={handleDownloadCsv}
              />
            )}

            {activeTab === 'compare' && (
              <StockComparison
                currentSymbol={currentSymbol}
                availableStocks={availableStocks}
                onSelectMainSymbol={handleSelectSymbol}
              />
            )}
          </div>
        )}
        </>
      )}
      </main>

      {/* Stock Directory Modal */}
      <StockDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        stocks={availableStocks}
        currentSymbol={currentSymbol}
        onSelectStock={handleSelectSymbol}
        onOpenAddStockModal={() => setIsAddModalOpen(true)}
        watchlist={watchlist}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStockAdded={handleStockAdded}
        existingStocks={availableStocks}
      />

      {/* UptimeRobot 24/7 Command Center Modal */}
      <UptimeRobotModal
        isOpen={isUptimeModalOpen}
        onClose={() => setIsUptimeModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-400">NSE Historical Terminal</span>
            <span className="mx-2">·</span>
            <span>Comprehensive 1-Year Everyday Daily Stock Data Explorer</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Data Source: Yahoo Finance API & NSE Bhavcopy</span>
            <span>·</span>
            <span>Auto-Adjusted for Splits & Bonuses</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
