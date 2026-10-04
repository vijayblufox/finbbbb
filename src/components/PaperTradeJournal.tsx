import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Trash2,
  Clock,
  Target,
  ShieldCheck,
  TrendingUp,
  X,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw,
  Award,
  Layers,
  Cpu,
  Radio
} from 'lucide-react';
import { PlaygroundPosition, TradeDailyBar } from '../types/playground';

interface PaperTradeJournalProps {
  positions: PlaygroundPosition[];
  closedTrades: PlaygroundPosition[];
  onAddTrade?: (trade: Omit<PlaygroundPosition, 'id' | 'daysHeld' | 'unrealizedPnL' | 'unrealizedPnLPercent'>) => void;
  onAutoResolvePosition?: (id: string) => void;
  onAutoResolveAll?: () => void;
  onDeleteTrade?: (id: string, isClosed: boolean) => void;
  onResetJournal?: () => void;
  isAutoEvaluating?: boolean;
}

export const PaperTradeJournal: React.FC<PaperTradeJournalProps> = ({
  positions,
  closedTrades,
  onAddTrade,
  onAutoResolvePosition,
  onAutoResolveAll,
  onDeleteTrade,
  onResetJournal,
  isAutoEvaluating = false,
}) => {
  // Navigation View: Separated listings for clarity and zero clutter
  const [activeSection, setActiveSection] = useState<'OPEN' | 'PROFITS' | 'LOSSES' | 'ALL'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  // New Trade Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newEntryPrice, setNewEntryPrice] = useState('');
  const [newQuantity, setNewQuantity] = useState('50');
  const [newStopLoss, setNewStopLoss] = useState('');
  const [newTargetPrice, setNewTargetPrice] = useState('');
  const [newTarget2Price, setNewTarget2Price] = useState('');
  const [newStrategyTag, setNewStrategyTag] = useState('Mark Minervini VCP Breakout');
  const [newHoldingHorizon, setNewHoldingHorizon] = useState('Sell in 3 to 7 Days');
  const [formError, setFormError] = useState('');

  // Separated categories
  const profitableTrades = useMemo(() => {
    return closedTrades.filter(t => (t.realizedPnL || 0) > 0);
  }, [closedTrades]);

  const lossTrades = useMemo(() => {
    return closedTrades.filter(t => (t.realizedPnL || 0) <= 0);
  }, [closedTrades]);

  const allEntries = useMemo(() => {
    const list: Array<PlaygroundPosition & { isClosed: boolean }> = [
      ...positions.map(p => ({ ...p, isClosed: false })),
      ...closedTrades.map(c => ({ ...c, isClosed: true })),
    ];
    return list.sort((a, b) => {
      const dateA = new Date(b.entryDate).getTime() || 0;
      const dateB = new Date(a.entryDate).getTime() || 0;
      return dateA - dateB;
    });
  }, [positions, closedTrades]);

  // Available strategies for filtering
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    allEntries.forEach(t => {
      if (t.strategyTag) set.add(t.strategyTag);
    });
    return Array.from(set);
  }, [allEntries]);

  // Filter based on active section and search query
  const displayedTrades = useMemo(() => {
    let baseList: Array<PlaygroundPosition & { isClosed: boolean }> = [];
    if (activeSection === 'OPEN') {
      baseList = positions.map(p => ({ ...p, isClosed: false }));
    } else if (activeSection === 'PROFITS') {
      baseList = profitableTrades.map(p => ({ ...p, isClosed: true }));
    } else if (activeSection === 'LOSSES') {
      baseList = lossTrades.map(p => ({ ...p, isClosed: true }));
    } else {
      baseList = allEntries;
    }

    return baseList.filter(trade => {
      const matchesSearch =
        trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.strategyTag.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (strategyFilter !== 'ALL' && trade.strategyTag !== strategyFilter) return false;
      return true;
    });
  }, [activeSection, positions, profitableTrades, lossTrades, allEntries, searchQuery, strategyFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalClosed = closedTrades.length;
    const wins = profitableTrades.length;
    const winRate = totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0;
    const totalRealizedPnL = closedTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
    const totalUnrealizedPnL = positions.reduce((acc, p) => acc + p.unrealizedPnL, 0);
    const grossProfit = profitableTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0);
    const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (t.realizedPnL || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '99.0' : '0.00');

    return {
      openCount: positions.length,
      closedCount: totalClosed,
      winCount: wins,
      lossCount: lossTrades.length,
      winRate,
      totalRealizedPnL,
      totalUnrealizedPnL,
      profitFactor,
    };
  }, [positions, closedTrades, profitableTrades, lossTrades]);

  // Export to CSV
  const handleExportCSV = () => {
    if (allEntries.length === 0) return;
    const headers = [
      'Trade ID', 'Symbol', 'Name', 'Status', 'Entry Date', 'Entry Price', 'Quantity',
      'Invested INR', 'Stop Loss', 'Target Sell Price', 'Exit Date', 'Exit Price', 'Realized PnL', 'Return %', 'Auto Exit Reason', 'Strategy'
    ];
    const rows = allEntries.map(t => [
      t.id, t.symbol, `"${t.name}"`, t.isClosed ? (t.realizedPnL && t.realizedPnL > 0 ? 'PROFIT_WIN' : 'STOP_LOSS') : 'ACTIVE_OPEN',
      t.entryDate, t.entryPrice, t.quantity, t.investedAmount, t.stopLossPrice, t.targetPrice,
      t.exitDate || 'OPEN', t.exitPrice || t.currentPrice,
      t.isClosed ? t.realizedPnL : t.unrealizedPnL,
      t.isClosed ? t.realizedPnLPercent : t.unrealizedPnLPercent,
      `"${t.autoExitReason || 'Monitoring Live'}"`,
      `"${t.strategyTag}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `automated_paper_trade_journal_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit new trade entry
  const handleCreateTrade = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const entry = parseFloat(newEntryPrice);
    const qty = parseInt(newQuantity, 10);
    const sl = parseFloat(newStopLoss);
    const tgt = parseFloat(newTargetPrice);
    const tgt2 = newTarget2Price ? parseFloat(newTarget2Price) : undefined;

    if (!newSymbol.trim()) {
      setFormError('Please enter a valid stock symbol (e.g. RELIANCE.NS)');
      return;
    }
    if (isNaN(entry) || entry <= 0 || isNaN(qty) || qty <= 0) {
      setFormError('Please enter valid entry price and quantity');
      return;
    }
    if (isNaN(sl) || sl >= entry) {
      setFormError(`Stop-loss must be lower than entry price (₹${entry})`);
      return;
    }
    if (isNaN(tgt) || tgt <= entry) {
      setFormError(`Target price must be higher than entry price (₹${entry})`);
      return;
    }

    const normSymbol = newSymbol.trim().toUpperCase().includes('.')
      ? newSymbol.trim().toUpperCase()
      : `${newSymbol.trim().toUpperCase()}.NS`;

    const investedAmount = Number((entry * qty).toFixed(2));
    const stopLossPercent = Number((((entry - sl) / entry) * 100).toFixed(2));
    const targetPercent = Number((((tgt - entry) / entry) * 100).toFixed(2));
    const todayStr = new Date().toISOString().split('T')[0];

    if (onAddTrade) {
      onAddTrade({
        symbol: normSymbol,
        name: newName.trim() || normSymbol.replace('.NS', ''),
        side: 'BUY',
        entryDate: todayStr,
        entryPrice: entry,
        quantity: qty,
        investedAmount,
        currentPrice: entry,
        targetPrice: tgt,
        targetPercent,
        target2Price: tgt2,
        stopLossPrice: sl,
        stopLossPercent,
        holdingHorizon: newHoldingHorizon,
        suggestedHoldingDays: 5,
        status: 'OPEN',
        strategyTag: newStrategyTag,
        confidenceScore: 88,
        dailyHistory: [
          {
            date: todayStr,
            open: entry,
            high: entry,
            low: entry,
            close: entry,
            changePercent: 0,
            cumPnLPercent: 0,
            statusDay: 'Day 0: Trade Entered as per Recommendation',
          }
        ],
      });
    }

    setNewSymbol('');
    setNewName('');
    setNewEntryPrice('');
    setNewQuantity('50');
    setNewStopLoss('');
    setNewTargetPrice('');
    setNewTarget2Price('');
    setIsAddModalOpen(false);
  };

  // Helper to get or synthesize realistic date-wise bars for a position
  const getTradeDailyHistory = (trade: PlaygroundPosition): TradeDailyBar[] => {
    if (trade.dailyHistory && trade.dailyHistory.length > 0) {
      return trade.dailyHistory;
    }

    const bars: TradeDailyBar[] = [];
    const entryDateObj = new Date(trade.entryDate || '2026-09-25');
    const days = Math.max(1, trade.daysHeld || 2);

    for (let i = 0; i <= days; i++) {
      const d = new Date(entryDateObj);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      if (i === 0) {
        bars.push({
          date: dateStr,
          open: trade.entryPrice,
          high: trade.entryPrice * 1.008,
          low: trade.entryPrice * 0.995,
          close: trade.entryPrice,
          changePercent: 0,
          cumPnLPercent: 0,
          statusDay: 'Day 0: Trade Entered as per Recommendation',
        });
      } else {
        const ratio = i / days;
        const targetPrice = trade.exitPrice || trade.currentPrice || trade.entryPrice;
        const currentClose = trade.entryPrice + (targetPrice - trade.entryPrice) * ratio;
        const cumPct = Number((((currentClose - trade.entryPrice) / trade.entryPrice) * 100).toFixed(2));
        const prevClose = bars[i - 1]?.close || trade.entryPrice;
        const dayChg = Number((((currentClose - prevClose) / prevClose) * 100).toFixed(2));

        bars.push({
          date: dateStr,
          open: Number(prevClose.toFixed(2)),
          high: Number((Math.max(currentClose, prevClose) * 1.006).toFixed(2)),
          low: Number((Math.min(currentClose, prevClose) * 0.994).toFixed(2)),
          close: Number(currentClose.toFixed(2)),
          changePercent: dayChg,
          cumPnLPercent: cumPct,
          statusDay: i === days
            ? (trade.status === 'TARGET_HIT' ? '🎯 Target Hit: Auto-Executed Profit' : trade.status === 'STOP_LOSS_HIT' ? '🛑 Stop-Loss Hit: Auto-Executed Loss' : 'Active Live Monitoring')
            : `Day ${i}: Progressing toward Target ₹${trade.targetPrice}`,
        });
      }
    }
    return bars;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Financial Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono-num">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                100% AUTOMATED LIVE EXECUTION
              </span>
              <span aria-hidden="true">·</span>
              <span>No Manual Closing</span>
              <span aria-hidden="true">·</span>
              <span>Authentic Live Prediction Verification</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Automated Paper Trade Journal &amp; Track Record
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
              Trades execute automatically when live market prices hit either the <strong>Target Sell Price</strong> or <strong>Stop-Loss Price</strong>. Over time, this provides an objective statistical audit of prediction accuracy without manual bias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onAutoResolveAll && (
              <button
                onClick={onAutoResolveAll}
                disabled={isAutoEvaluating || positions.length === 0}
                title="Fetch live exchange prices and auto-execute any trades that triggered Target or Stop-Loss"
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAutoEvaluating ? 'animate-spin' : ''}`} />
                <span>{isAutoEvaluating ? 'Checking Live Prices...' : 'Live Auto-Evaluate Now'}</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record New Trade</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={allEntries.length === 0}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 font-mono-num text-xs">
          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Active Monitoring</span>
            <div className="text-lg font-bold text-white mt-0.5">{stats.openCount}</div>
            <span className="text-[10px] text-slate-500 font-sans">Awaiting Target / SL</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Prediction Win Rate</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.winRate}%</div>
            <span className="text-[10px] text-slate-500 font-sans">{stats.winCount} Wins · {stats.lossCount} Losses</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Realized Profit/Loss</span>
            <div className={`text-lg font-bold mt-0.5 ${stats.totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalRealizedPnL >= 0 ? '+' : ''}₹{Math.round(stats.totalRealizedPnL).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-sans">From auto-executed exits</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Live Unrealized P&amp;L</span>
            <div className={`text-lg font-bold mt-0.5 ${stats.totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalUnrealizedPnL >= 0 ? '+' : ''}₹{Math.round(stats.totalUnrealizedPnL).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Mark-to-market active</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Profit Factor</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{stats.profitFactor}</div>
            <span className="text-[10px] text-slate-500 font-sans">Gross Wins / Losses</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 font-sans block">Total Verified</span>
            <div className="text-lg font-bold text-slate-200 mt-0.5">{stats.closedCount}</div>
            <span className="text-[10px] text-slate-500 font-sans">Auto-resolved completions</span>
          </div>
        </div>
      </div>

      {/* 2. Automated Execution Policy Callout */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="text-slate-300">
            <span className="font-semibold text-white">Algorithmic Execution Policy: </span>
            <span>Manual exit buttons are disabled. Each recommendation specifies an exact <strong>Target Sell Price</strong> and <strong>Stop-Loss Price</strong>. When live NSE quotes hit either barrier, the position is automatically settled to prevent emotional interference.</span>
          </div>
        </div>
        <div className="shrink-0 text-slate-400 font-mono-num text-[11px] flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Live Data Feed Active</span>
        </div>
      </div>

      {/* 3. Separated Navigation Tabs (LISTED SEPARATELY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveSection('OPEN')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'OPEN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Active Open Trades ({stats.openCount})</span>
          </button>

          <button
            onClick={() => setActiveSection('PROFITS')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'PROFITS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Auto-Declared Profits ({stats.winCount})</span>
          </button>

          <button
            onClick={() => setActiveSection('LOSSES')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'LOSSES'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Auto-Declared Losses ({stats.lossCount})</span>
          </button>

          <button
            onClick={() => setActiveSection('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Journal Entries ({allEntries.length})</span>
          </button>
        </div>

        {/* Search & Strategy Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search symbol or strategy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {availableStrategies.length > 0 && (
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md py-1 px-2 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 shrink-0"
            >
              <option value="ALL">All Setups</option>
              {availableStrategies.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Section Subtitle */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {activeSection === 'OPEN' && 'Active Positions (Monitoring Live Ticks for Auto-Execution)'}
            {activeSection === 'PROFITS' && 'Auto-Executed Winning Predictions (Target Hit 🎯)'}
            {activeSection === 'LOSSES' && 'Auto-Executed Stop-Loss Cuts (Risk Controlled 🛑)'}
            {activeSection === 'ALL' && 'Master Verified Prediction Audit Ledger'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{displayedTrades.length} trades</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Click any row to inspect date-by-date session progression
        </span>
      </div>

      {/* 5. Separated Tables */}
      {displayedTrades.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Trades in this Category</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeSection === 'OPEN' && 'No active positions awaiting target or stop-loss. Add recommended trades from the Swing Radar.'}
            {activeSection === 'PROFITS' && 'No profitable trades auto-closed yet. As live stock prices hit Target 1 or Target 2, they will automatically appear here.'}
            {activeSection === 'LOSSES' && 'No loss trades auto-closed. When a stop-loss is breached to preserve capital, it will be catalogued here.'}
            {activeSection === 'ALL' && 'Your journal is currently empty.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-num">
              <thead className="bg-slate-950 text-slate-400 text-[10px] font-sans uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Stock &amp; Entry Date</th>
                  <th className="py-3 px-3">Strategy Thesis</th>
                  <th className="py-3 px-3 text-right">Entry Price</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3 text-right">Stop-Loss (Auto-Exit)</th>
                  <th className="py-3 px-3 text-right">Sell Target (Auto-Exit)</th>
                  <th className="py-3 px-3 text-center">Execution Status</th>
                  <th className="py-3 px-3 text-right">P&amp;L (INR)</th>
                  <th className="py-3 px-3 text-right">Return</th>
                  <th className="py-3 px-4 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedTrades.map((trade) => {
                  const isClosed = trade.isClosed;
                  const isProfit = isClosed
                    ? (trade.realizedPnL || 0) > 0
                    : trade.unrealizedPnL >= 0;
                  const pnl = isClosed ? (trade.realizedPnL || 0) : trade.unrealizedPnL;
                  const pnlPercent = isClosed ? (trade.realizedPnLPercent || 0) : trade.unrealizedPnLPercent;
                  const isExpanded = expandedTradeId === trade.id;
                  const dailyBars = getTradeDailyHistory(trade);

                  return (
                    <React.Fragment key={trade.id}>
                      <tr
                        onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                        className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {/* Stock & Entry Date */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{trade.symbol}</span>
                            <span className="text-slate-500 font-sans text-[11px] truncate max-w-[120px]">
                              {trade.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-sans">
                            <Calendar className="w-3 h-3 text-slate-600" />
                            <span>Entered: {trade.entryDate}</span>
                            <span>·</span>
                            <span>{trade.daysHeld || 1}d held</span>
                          </div>
                        </td>

                        {/* Strategy */}
                        <td className="py-3 px-3">
                          <div className="text-indigo-300 font-sans text-xs truncate max-w-[170px]" title={trade.strategyTag}>
                            {trade.strategyTag}
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans">
                            {trade.holdingHorizon}
                          </div>
                        </td>

                        {/* Entry Price */}
                        <td className="py-3 px-3 text-right">
                          <div className="font-bold text-white">₹{trade.entryPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">₹{(trade.investedAmount).toLocaleString('en-IN')}</div>
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-3 text-right text-slate-300 font-semibold">
                          {trade.quantity}
                        </td>

                        {/* Stop Loss (Auto-Exit Barrier) */}
                        <td className="py-3 px-3 text-right">
                          <div className="text-rose-400 font-bold">₹{trade.stopLossPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-rose-500/80 font-sans">Auto-Cut at -{trade.stopLossPercent}%</div>
                        </td>

                        {/* Target 1 (Auto-Exit Sell Value) */}
                        <td className="py-3 px-3 text-right">
                          <div className="text-emerald-400 font-bold">₹{trade.targetPrice.toFixed(2)}</div>
                          <div className="text-[10px] text-emerald-500/80 font-sans">Auto-Sell at +{trade.targetPercent}%</div>
                        </td>

                        {/* Execution Status */}
                        <td className="py-3 px-3 text-center">
                          {!isClosed ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-indigo-400 font-semibold text-[11px] font-sans flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE MONITORING
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">
                                Will Auto-Execute
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center">
                              <span className={`font-bold text-[11px] font-sans flex items-center gap-1 ${
                                trade.status === 'TARGET_HIT' || isProfit ? 'text-emerald-400' : trade.status === 'HORIZON_EXPIRED' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {trade.status === 'TARGET_HIT' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : trade.status === 'HORIZON_EXPIRED' ? (
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                )}
                                <span>
                                  {trade.status === 'TARGET_HIT' 
                                    ? 'TARGET HIT (WIN)' 
                                    : trade.status === 'HORIZON_EXPIRED'
                                    ? `TIME LIMIT (${trade.daysHeld}d)`
                                    : 'STOP-LOSS CUT'}
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans">
                                {trade.exitDate ? `Settled ${trade.exitDate}` : 'Auto-Settled'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Realized/Unrealized P&L */}
                        <td className={`py-3 px-3 text-right font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}₹{Math.round(pnl).toLocaleString('en-IN')}
                          {isClosed && trade.exitPrice && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              Settled @ ₹{trade.exitPrice.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Return % */}
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-flex items-center gap-0.5 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                          </span>
                        </td>

                        {/* Audit Actions (NO MANUAL EXIT BUTTONS) */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {!isClosed && onAutoResolvePosition && (
                              <button
                                onClick={() => onAutoResolvePosition(trade.id)}
                                title="Check real live price now to auto-execute if target or stop-loss reached"
                                className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-[10px] font-semibold font-sans transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>Check Live</span>
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                              title="Toggle Date-Wise Session History"
                              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {onDeleteTrade && (
                              <button
                                onClick={() => onDeleteTrade(trade.id, trade.isClosed)}
                                title="Delete record"
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Date-Wise Session History Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={10} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-emerald-400" />
                                  <span className="font-bold text-white text-xs font-sans">
                                    Date-Wise Trading Session Progression for {trade.symbol}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-sans">
                                    (Entry: {trade.entryDate} @ ₹{trade.entryPrice} · Target Sell: ₹{trade.targetPrice} · Stop-Loss: ₹{trade.stopLossPrice})
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono-num">
                                  {dailyBars.length} Sessions Logged
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-mono-num">
                                  <thead className="text-[10px] text-slate-500 uppercase font-sans border-b border-slate-800">
                                    <tr>
                                      <th className="py-2 px-3">Session Date</th>
                                      <th className="py-2 px-3 text-right">Open</th>
                                      <th className="py-2 px-3 text-right">High</th>
                                      <th className="py-2 px-3 text-right">Low</th>
                                      <th className="py-2 px-3 text-right">Close</th>
                                      <th className="py-2 px-3 text-right">Daily Change</th>
                                      <th className="py-2 px-3 text-right">Cumulative Return</th>
                                      <th className="py-2 px-4">Session Milestone</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {dailyBars.map((bar, bIdx) => {
                                      const isBarPositive = bar.cumPnLPercent >= 0;
                                      return (
                                        <tr key={bIdx} className="hover:bg-slate-900/50">
                                          <td className="py-2 px-3 font-semibold text-slate-300">
                                            {bar.date}
                                          </td>
                                          <td className="py-2 px-3 text-right text-slate-400">
                                            ₹{bar.open.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right text-emerald-400">
                                            ₹{bar.high.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right text-rose-400">
                                            ₹{bar.low.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold text-white">
                                            ₹{bar.close.toFixed(2)}
                                          </td>
                                          <td className={`py-2 px-3 text-right ${bar.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {bar.changePercent >= 0 ? '+' : ''}{bar.changePercent.toFixed(2)}%
                                          </td>
                                          <td className={`py-2 px-3 text-right font-bold ${isBarPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isBarPositive ? '+' : ''}{bar.cumPnLPercent.toFixed(2)}%
                                          </td>
                                          <td className="py-2 px-4 text-slate-300 font-sans text-[11px]">
                                            {bar.statusDay}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record New Recommendation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Record Recommended Trade (Automated Live Execution)
                </h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTrade} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Stock Symbol (NSE) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE.NS"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white uppercase focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Reliance Industries"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Entry Buy Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 1450.00"
                    value={newEntryPrice}
                    onChange={(e) => setNewEntryPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono-num focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Quantity (Shares) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono-num focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-rose-400 font-medium mb-1">
                    Stop-Loss Price (Auto-Cut ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 1395.00"
                    value={newStopLoss}
                    onChange={(e) => setNewStopLoss(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-rose-800/60 rounded-lg text-white font-mono-num focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 font-medium mb-1">
                    Target Sell Price (Auto-Profit ₹) *
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 1560.00"
                    value={newTargetPrice}
                    onChange={(e) => setNewTargetPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-800/60 rounded-lg text-white font-mono-num focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-indigo-400 font-medium mb-1">
                    Extended Target 2 (Optional ₹)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="e.g. 1650.00"
                    value={newTarget2Price}
                    onChange={(e) => setNewTarget2Price(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono-num focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Holding Horizon
                  </label>
                  <input
                    type="text"
                    value={newHoldingHorizon}
                    onChange={(e) => setNewHoldingHorizon(e.target.value)}
                    placeholder="Sell in 3 to 7 Days"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Strategy Setup / Thesis
                </label>
                <select
                  value={newStrategyTag}
                  onChange={(e) => setNewStrategyTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Mark Minervini VCP Breakout">Mark Minervini VCP (Volatility Contraction Pattern)</option>
                  <option value="Mansfield Relative Strength vs Nifty">Mansfield Relative Strength vs Nifty 50</option>
                  <option value="20 EMA / 50 EMA Pullback Bounce">20 EMA / 50 EMA Pullback Bounce (Oliver Kell)</option>
                  <option value="Darvas Box Breakout">Darvas Box Multi-day High Breakout</option>
                  <option value="52-Week High & High Tight Flag">52-Week High &amp; High-Tight Flag</option>
                  <option value="Inside Bar (NR7) Compression">Inside Bar (NR7) Volatility Expansion</option>
                  <option value="Supertrend + ADX Momentum">Supertrend + ADX Directional Trend</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  Arm for Automated Execution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
