import React, { useState, useMemo } from 'react';
import { 
  Download, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Filter,
  FileSpreadsheet,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DailyBar, StockPayload } from '../types/market';

interface DailyDataTableProps {
  stockData: StockPayload;
  onDownloadCsv: () => void;
}

type SortField = 'date' | 'close' | 'changePercent' | 'dayRangePercent' | 'volume' | 'rsi14';
type SortOrder = 'asc' | 'desc';

export const DailyDataTable: React.FC<DailyDataTableProps> = ({ stockData, onDownloadCsv }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchDate, setSearchDate] = useState('');
  const [dayTypeFilter, setDayTypeFilter] = useState<'all' | 'up' | 'down'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'1y' | '6m' | '3m' | '1m'>('1y');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedDate, setCopiedDate] = useState<string | null>(null);

  const { meta, bars } = stockData;

  // Filter bars by range
  const filteredByRange = useMemo(() => {
    if (bars.length === 0) return [];
    if (dateRangeFilter === '1y') return bars;

    const daysCount = dateRangeFilter === '6m' ? 126 : dateRangeFilter === '3m' ? 63 : 21;
    return bars.slice(-daysCount);
  }, [bars, dateRangeFilter]);

  // Filter bars by search and day type
  const filteredBars = useMemo(() => {
    return filteredByRange.filter((bar) => {
      // Day type filter
      if (dayTypeFilter === 'up' && bar.change < 0) return false;
      if (dayTypeFilter === 'down' && bar.change > 0) return false;

      // Search filter
      if (searchDate.trim()) {
        const query = searchDate.toLowerCase();
        const d = new Date(bar.date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
        return (
          bar.date.includes(query) ||
          dayName.includes(query) ||
          monthName.includes(query) ||
          bar.close.toString().includes(query)
        );
      }

      return true;
    });
  }, [filteredByRange, dayTypeFilter, searchDate]);

  // Sort bars
  const sortedBars = useMemo(() => {
    const list = [...filteredBars];
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === 'date') {
        valA = a.timestamp;
        valB = b.timestamp;
      } else if (sortField === 'close') {
        valA = a.close;
        valB = b.close;
      } else if (sortField === 'changePercent') {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (sortField === 'dayRangePercent') {
        valA = a.dayRangePercent;
        valB = b.dayRangePercent;
      } else if (sortField === 'volume') {
        valA = a.volume;
        valB = b.volume;
      } else if (sortField === 'rsi14') {
        valA = a.rsi14 ?? 50;
        valB = b.rsi14 ?? 50;
      }

      if (sortOrder === 'asc') return valA - valB;
      return valB - valA;
    });
    return list;
  }, [filteredBars, sortField, sortOrder]);

  // Max volume for relative volume bar
  const maxVolume = useMemo(() => {
    if (bars.length === 0) return 1;
    return Math.max(...bars.map(b => b.volume)) || 1;
  }, [bars]);

  // Extreme days
  const extremeStats = useMemo(() => {
    if (bars.length === 0) return null;
    let best = bars[0];
    let worst = bars[0];
    let highest = bars[0];
    let lowest = bars[0];

    bars.forEach(b => {
      if (b.changePercent > best.changePercent) best = b;
      if (b.changePercent < worst.changePercent) worst = b;
      if (b.high > highest.high) highest = b;
      if (b.low < lowest.low) lowest = b;
    });

    const upCount = bars.filter(b => b.change > 0).length;
    const downCount = bars.filter(b => b.change < 0).length;
    const winRate = Number(((upCount / bars.length) * 100).toFixed(1));

    return { best, worst, highest, lowest, upCount, downCount, winRate };
  }, [bars]);

  // Pagination
  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedBars.length / pageSize);
  const paginatedBars = useMemo(() => {
    if (pageSize === -1) return sortedBars;
    const start = (currentPage - 1) * pageSize;
    return sortedBars.slice(start, start + pageSize);
  }, [sortedBars, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const copyRowData = (bar: DailyBar) => {
    const text = `NSE:${meta.symbol} | Date: ${bar.date} | O: ₹${bar.open} | H: ₹${bar.high} | L: ₹${bar.low} | C: ₹${bar.close} | Vol: ${bar.volume.toLocaleString('en-IN')}`;
    navigator.clipboard.writeText(text);
    setCopiedDate(bar.date);
    setTimeout(() => setCopiedDate(null), 1800);
  };

  const formatDate = (dateStr: string) => {
    const dt = new Date(dateStr);
    return {
      formatted: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      weekday: dt.toLocaleDateString('en-IN', { weekday: 'short' }),
    };
  };

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
    return vol.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-4">
      {/* 1-Year Historical Quick Summary Strip */}
      {extremeStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Total Trading Days</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono-num text-white">{meta.tradingDaysCount}</span>
              <span className="text-xs text-slate-400">1 Year</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {meta.firstTradingDate} → {meta.lastTradingDate}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Up / Down Days</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold font-mono-num text-emerald-400">{extremeStats.upCount}</span>
              <span className="text-slate-600">/</span>
              <span className="text-lg font-bold font-mono-num text-rose-400">{extremeStats.downCount}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono-num">
              {extremeStats.winRate}% Green Session Rate
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">52-Week High</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono-num text-emerald-300">₹{extremeStats.highest.high.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              On {formatDate(extremeStats.highest.date).formatted}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">52-Week Low</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono-num text-rose-300">₹{extremeStats.lowest.low.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[11px] text-slate-400">
              On {formatDate(extremeStats.lowest.date).formatted}
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Best 1-Day Gain</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono-num text-emerald-400">+{extremeStats.best.changePercent.toFixed(2)}%</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {formatDate(extremeStats.best.date).formatted} (+₹{extremeStats.best.change})
            </span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Worst 1-Day Drop</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono-num text-rose-400">{extremeStats.worst.changePercent.toFixed(2)}%</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {formatDate(extremeStats.worst.date).formatted} (₹{extremeStats.worst.change})
            </span>
          </div>
        </div>
      )}

      {/* Table Action Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Range Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['1y', '6m', '3m', '1m'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRangeFilter(range);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  dateRangeFilter === range
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Up / Down Days Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setDayTypeFilter('all'); setCurrentPage(1); }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                dayTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Days ({filteredByRange.length})
            </button>
            <button
              onClick={() => { setDayTypeFilter('up'); setCurrentPage(1); }}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                dayTypeFilter === 'up' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Up
            </button>
            <button
              onClick={() => { setDayTypeFilter('down'); setCurrentPage(1); }}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                dayTypeFilter === 'down' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-rose-400" />
              Down
            </button>
          </div>

          {/* Search Date Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter date (e.g. Sep, 2026-08, Fri)..."
              value={searchDate}
              onChange={(e) => {
                setSearchDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono-num w-44"
            />
          </div>
        </div>

        {/* Right: Export & Rows per page */}
        <div className="flex items-center gap-2">
          {/* Rows per page selector */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span className="hidden sm:inline">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono-num"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={-1}>All ({sortedBars.length})</option>
            </select>
          </div>

          {/* Download CSV Button */}
          <button
            onClick={onDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV (1Y)</span>
          </button>
        </div>
      </div>

      {/* Main Historical Daily Records Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium select-none">
                <th 
                  onClick={() => handleSort('date')}
                  className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Date & Session</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('close')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Close Price</span>
                    {sortField === 'close' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('changePercent')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Day Return</span>
                    {sortField === 'changePercent' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th className="py-3 px-3 text-right">Open</th>
                <th className="py-3 px-3 text-right">High</th>
                <th className="py-3 px-3 text-right">Low</th>

                <th 
                  onClick={() => handleSort('dayRangePercent')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Day Spread</span>
                    {sortField === 'dayRangePercent' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('volume')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors min-w-[140px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Volume</span>
                    {sortField === 'volume' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th className="py-3 px-3 text-right hidden xl:table-cell">SMA 20</th>
                <th className="py-3 px-3 text-right hidden xl:table-cell">SMA 50</th>
                
                <th 
                  onClick={() => handleSort('rsi14')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>RSI (14)</span>
                    {sortField === 'rsi14' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                  </div>
                </th>

                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono-num">
              {paginatedBars.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
                    No trading records matching current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedBars.map((bar) => {
                  const isUp = bar.change > 0;
                  const isDown = bar.change < 0;
                  const dateInfo = formatDate(bar.date);
                  const volPercent = Math.min(100, Math.round((bar.volume / maxVolume) * 100));

                  return (
                    <tr 
                      key={bar.date}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date & Weekday */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-200">
                          {dateInfo.formatted}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {dateInfo.weekday} · {bar.date}
                        </div>
                      </td>

                      {/* Close Price */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-slate-100 text-[13px]">
                          ₹{bar.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Day Change & % */}
                      <td className="py-2.5 px-3 text-right">
                        <div className={`font-semibold flex items-center justify-end gap-1 ${
                          isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {isUp && <TrendingUp className="w-3 h-3" />}
                          {isDown && <TrendingDown className="w-3 h-3" />}
                          <span>{isUp ? '+' : ''}{bar.changePercent.toFixed(2)}%</span>
                        </div>
                        <div className={`text-[10px] ${isUp ? 'text-emerald-500/80' : isDown ? 'text-rose-500/80' : 'text-slate-400'}`}>
                          {isUp ? '+' : ''}₹{bar.change.toFixed(2)}
                        </div>
                      </td>

                      {/* Open */}
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        ₹{bar.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* High */}
                      <td className="py-2.5 px-3 text-right text-emerald-400/90 font-medium">
                        ₹{bar.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Low */}
                      <td className="py-2.5 px-3 text-right text-rose-400/90 font-medium">
                        ₹{bar.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Day Range Spread */}
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-slate-200 font-medium">₹{bar.dayRange.toFixed(2)}</span>
                        <div className="text-[10px] text-slate-400">
                          {bar.dayRangePercent.toFixed(2)}%
                        </div>
                      </td>

                      {/* Volume with relative bar */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="text-slate-200 font-medium">
                          {formatVolume(bar.volume)}
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.max(5, volPercent)}%` }}
                          />
                        </div>
                      </td>

                      {/* SMA 20 */}
                      <td className="py-2.5 px-3 text-right hidden xl:table-cell text-cyan-400/90">
                        {bar.sma20 ? `₹${bar.sma20.toLocaleString('en-IN')}` : '--'}
                      </td>

                      {/* SMA 50 */}
                      <td className="py-2.5 px-3 text-right hidden xl:table-cell text-amber-400/90">
                        {bar.sma50 ? `₹${bar.sma50.toLocaleString('en-IN')}` : '--'}
                      </td>

                      {/* RSI 14 */}
                      <td className="py-2.5 px-3 text-right hidden lg:table-cell">
                        {bar.rsi14 !== undefined ? (
                          <span className={`font-semibold ${
                            bar.rsi14 >= 70 ? 'text-amber-400' : bar.rsi14 <= 30 ? 'text-cyan-400' : 'text-slate-300'
                          }`}>
                            {bar.rsi14.toFixed(1)}
                          </span>
                        ) : '--'}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => copyRowData(bar)}
                          title="Copy daily candle details to clipboard"
                          className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedDate === bar.date ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-slate-400 hover:text-indigo-300 font-sans">Copy</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedBars.length)} of {sortedBars.length} trading sessions
            </div>
            <div className="flex items-center gap-1.5 font-mono-num">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
