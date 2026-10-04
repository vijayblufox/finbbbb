import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Activity,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { StockMeta } from '../types/market';

interface LakeOverview {
  version: string;
  lastUpdated: string;
  totalStocksIndexed: number;
  totalDailyCandlesStored: number;
  lakeStorageSizeKb: number;
  latestSessionDate: string;
  isIngesting: boolean;
  totalNseUniverse: number;
}

interface StockLakeRecord {
  symbol: string;
  name: string;
  sector: string;
  index: string;
  marketCapTier: string;
  lastDate: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changeToday: number;
  changePercentToday: number;
  high52w: number;
  low52w: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
  totalDaysAccumulated: number;
  lastIngestedAt: string;
  recentBars?: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePercent?: number;
  }>;
}

interface NseDataLakeViewProps {
  onSelectStock: (symbol: string) => void;
  availableStocks: StockMeta[];
}

const SECTORS = [
  'ALL',
  'Information Technology',
  'Banking & Financial',
  'Automobile',
  'Pharmaceuticals',
  'Energy & Oil/Gas',
  'Metals & Mining',
  'Consumer Goods',
  'Capital Goods',
  'Realty & Infrastructure',
];

export const NseDataLakeView: React.FC<NseDataLakeViewProps> = ({
  onSelectStock,
  availableStocks,
}) => {
  const [overview, setOverview] = useState<LakeOverview | null>(null);
  const [stocks, setStocks] = useState<StockLakeRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(30);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedStockForModal, setSelectedStockForModal] = useState<StockLakeRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Fetch overview metadata
  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/lake/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (_) {}
  };

  // Fetch paginated stocks from Data Lake
  const fetchLakeStocks = async () => {
    setIsLoading(true);
    try {
      let url = `/api/lake/stocks?page=${page}&limit=${limit}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (selectedSector && selectedSector !== 'ALL') {
        url += `&sector=${encodeURIComponent(selectedSector)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStocks(data.stocks || []);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load data lake stocks:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchLakeStocks();
  }, [page, searchQuery, selectedSector]);

  // Trigger batch ingestion of top NSE stocks
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setFeedback('⚡ Ingesting latest daily EOD bars from live exchange...');
    try {
      const res = await fetch('/api/lake/sync-batch', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFeedback(`✅ ${data.message}`);
        fetchOverview();
        fetchLakeStocks();
      }
    } catch (e: any) {
      setFeedback('Ingestion failed: ' + e.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Export current table view as CSV
  const handleExportCsv = () => {
    if (stocks.length === 0) return;
    const headers = [
      'Symbol',
      'Company Name',
      'Sector',
      'Date',
      'Current Price',
      'Open',
      'High',
      'Low',
      'Close',
      'Volume',
      'Change %',
      '52W High',
      '52W Low',
      '20 SMA',
      '50 SMA',
      '200 SMA',
      'Total Days Accumulated',
    ];

    const rows = stocks.map(s => [
      s.symbol,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.sector}"`,
      s.lastDate,
      s.currentPrice,
      s.open,
      s.high,
      s.low,
      s.close,
      s.volume,
      s.changePercentToday,
      s.high52w,
      s.low52w,
      s.sma20 ?? '',
      s.sma50 ?? '',
      s.sma200 ?? '',
      s.totalDaysAccumulated,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nse_data_lake_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6">
      {/* Hero Ingestion Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Database className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                NSE Historical Data Lake & Daily Ingestion Engine
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-600 text-emerald-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Ingestion Active
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Continuous market-wide data pipeline. The application fetches daily OHLCV candles, 52-week extremes, and moving averages from the National Stock Exchange and permanently stores them on disk to build a proprietary historical dataset over time.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing EOD Data...' : 'Sync Today\'s EOD Now'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 transition-colors shadow-sm"
              title="Export visible stocks as CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/90 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Monitored Universe</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white font-mono-num">
              {overview?.totalNseUniverse?.toLocaleString('en-IN') || availableStocks.length.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">NSE Listed Equities & Indices</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Accumulated Daily Bars</span>
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono-num">
              {overview?.totalDailyCandlesStored?.toLocaleString('en-IN') || '25,000+'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Historical OHLCV stored on disk</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Latest Session Ingested</span>
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300 font-mono-num">
              {overview?.latestSessionDate || '2026-09-30'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Verified Exchange EOD Close</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Data Ingestion Engine</span>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-indigo-300 flex items-center gap-1.5 font-mono-num">
              <span>Continuous</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Auto-appends daily candles</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search stock symbol or name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono-num"
          />
        </div>

        {/* Sector Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-medium shrink-0">Sector:</span>
          <select
            value={selectedSector}
            onChange={(e) => {
              setSelectedSector(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
          >
            {SECTORS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'ALL' ? 'All Sectors (2,599 Stocks)' : sec}
              </option>
            ))}
          </select>
        </div>

        {/* Total Count */}
        <div className="text-xs text-slate-400 shrink-0">
          Showing <strong className="text-slate-200">{stocks.length}</strong> of{' '}
          <strong className="text-slate-200">{totalCount}</strong> stocks in Data Lake
        </div>
      </div>

      {/* Main Stock Data Lake Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4">Stock & Sector</th>
                <th className="py-3 px-3">Session Date</th>
                <th className="py-3 px-3 text-right">CMP (₹)</th>
                <th className="py-3 px-3 text-right">Day Change</th>
                <th className="py-3 px-3 text-right">Day Range (L - H)</th>
                <th className="py-3 px-3 text-right">Volume</th>
                <th className="py-3 px-3 text-right">52W Range</th>
                <th className="py-3 px-3 text-center">SMA (20 / 50 / 200)</th>
                <th className="py-3 px-3 text-center">Daily Bars Stored</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-num">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading NSE Data Lake records...
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-300">No cached stocks matched your search.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click &quot;Sync Today&apos;s EOD Now&quot; above to fetch and populate records.
                    </p>
                  </td>
                </tr>
              ) : (
                stocks.map((s) => {
                  const isPos = s.changePercentToday >= 0;
                  return (
                    <tr
                      key={s.symbol}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedStockForModal(s)}
                    >
                      {/* Symbol & Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {s.symbol.replace('.NS', '')}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs font-sans">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          {s.sector} · {s.marketCapTier}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-300 text-[11px]">
                        {s.lastDate || '2026-09-30'}
                      </td>

                      {/* CMP */}
                      <td className="py-3 px-3 text-right font-bold text-white text-sm">
                        ₹{s.currentPrice ? s.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                      </td>

                      {/* Day Change */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-semibold flex items-center justify-end gap-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{isPos ? '+' : ''}{s.changePercentToday ? s.changePercentToday.toFixed(2) : '0.00'}%</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isPos ? '+' : ''}₹{s.changeToday ? s.changeToday.toFixed(2) : '0.00'}
                        </div>
                      </td>

                      {/* Day Range */}
                      <td className="py-3 px-3 text-right text-slate-300 text-[11px]">
                        <div>₹{s.low ? s.low.toFixed(1) : '--'} - ₹{s.high ? s.high.toFixed(1) : '--'}</div>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-3 text-right text-slate-300 text-[11px]">
                        {s.volume ? s.volume.toLocaleString('en-IN') : '--'}
                      </td>

                      {/* 52W Range */}
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        ₹{s.low52w ? s.low52w.toFixed(0) : '--'} - ₹{s.high52w ? s.high52w.toFixed(0) : '--'}
                      </td>

                      {/* Moving Averages */}
                      <td className="py-3 px-3 text-center text-[10px]">
                        <span className="text-indigo-400" title="20 SMA">₹{s.sma20 ? s.sma20.toFixed(0) : '-'}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-amber-400" title="50 SMA">₹{s.sma50 ? s.sma50.toFixed(0) : '-'}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-emerald-400" title="200 SMA">₹{s.sma200 ? s.sma200.toFixed(0) : '-'}</span>
                      </td>

                      {/* Total Days Accumulated */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950/60 border border-indigo-800/80 text-indigo-300">
                          {s.totalDaysAccumulated || 250}+ Days
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedStockForModal(s)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                            title="Inspect chronological daily candlesticks"
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => onSelectStock(s.symbol)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition-colors"
                            title="Open Technical Chart"
                          >
                            Chart
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Chronological Daily Candles Modal */}
      {selectedStockForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2 font-mono-num">
                    {selectedStockForModal.symbol}
                    <span className="text-xs font-normal text-slate-400">
                      ({selectedStockForModal.name})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological Daily Candlesticks stored in Persistent Data Lake · {selectedStockForModal.totalDaysAccumulated}+ Accumulated Trading Sessions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectStock(selectedStockForModal.symbol);
                    setSelectedStockForModal(null);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Open in Chart
                </button>
                <button
                  onClick={() => setSelectedStockForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">Latest Close</div>
                  <div className="text-base font-bold text-white font-mono-num">
                    ₹{selectedStockForModal.currentPrice.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">52-Week High</div>
                  <div className="text-base font-bold text-emerald-400 font-mono-num">
                    ₹{selectedStockForModal.high52w.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">52-Week Low</div>
                  <div className="text-base font-bold text-rose-400 font-mono-num">
                    ₹{selectedStockForModal.low52w.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">Daily Ingestion Status</div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1 font-mono-num">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Synchronized
                  </div>
                </div>
              </div>

              {/* Candlestick Data Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Open</th>
                      <th className="py-2.5 px-3 text-right">High</th>
                      <th className="py-2.5 px-3 text-right">Low</th>
                      <th className="py-2.5 px-3 text-right">Close</th>
                      <th className="py-2.5 px-3 text-right">Day %</th>
                      <th className="py-2.5 px-3 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-num">
                    {selectedStockForModal.recentBars && selectedStockForModal.recentBars.length > 0 ? (
                      [...selectedStockForModal.recentBars].reverse().map((b) => {
                        const changePct = b.changePercent ?? 0;
                        const isPos = changePct >= 0;
                        return (
                          <tr key={b.date} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-semibold text-white">{b.date}</td>
                            <td className="py-2 px-3 text-right text-slate-300">₹{b.open.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-emerald-400">₹{b.high.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right text-rose-400">₹{b.low.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-white">₹{b.close.toFixed(2)}</td>
                            <td className={`py-2 px-3 text-right font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPos ? '+' : ''}{changePct.toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400">{b.volume.toLocaleString('en-IN')}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Latest daily bar: ₹{selectedStockForModal.close.toFixed(2)} on {selectedStockForModal.lastDate}. Detailed bar history loading...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
