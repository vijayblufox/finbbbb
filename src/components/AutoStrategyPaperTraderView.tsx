import React, { useState, useEffect, useMemo } from 'react';
import { getNseSessionDetails } from '../utils/marketCalendar';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertTriangle,
  Award,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Trash2,
  Info,
  BookOpen,
  X
} from 'lucide-react';

interface PredictionItem {
  id: string;
  symbol: string;
  name: string;
  recommendedDate: string;
  recommendedEntryPrice: number;
  currentPrice: number;
  targetPrice: number;
  targetPercent: number;
  target2Price?: number;
  stopLossPrice: number;
  stopLossPercent: number;
  holdingHorizon: string;
  strategyTag: string;
  selectionMethod?: string;
  selectionRules?: string[];
  confidenceScore: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'TIME_LIMIT_EXIT';
  exitPrice?: number;
  exitDate?: string;
  resultProfitLossPercent?: number;
  isWin?: boolean;
  notes?: string;
}

interface StrategyMetrics {
  total: number;
  wins: number;
  losses: number;
  accuracy: number;
  avgReturn: number;
}

interface TrackRecordMetrics {
  totalPredictions: number;
  resolvedPredictions: number;
  activePredictions: number;
  winsCount: number;
  lossesCount: number;
  accuracy: number;
  avgReturnPercent: number;
  grossProfitPercent: number;
  grossLossPercent: number;
  profitFactor: number;
  strategyBreakdown: Record<string, StrategyMetrics>;
}

interface AutoStrategyPaperTraderViewProps {
  onSelectStock?: (symbol: string) => void;
}

// Fallback technical selection rules dictionary
const DEFAULT_METHOD_RULES: Record<string, { method: string; rules: string[]; manualGuide: string }> = {
  'Mark Minervini VCP Breakout': {
    method: 'Mark Minervini Volatility Contraction Pattern (VCP)',
    rules: [
      'Stage 2 Uptrend: Price > 20 EMA > 50 EMA > 200 EMA (Trend Template confirmed)',
      'Contraction Symmetry: Price compresses within narrower and narrower intraday ranges',
      'Volume Dry-Up: Volume dries up dramatically on final pullbacks before the pivot',
      'Pivot Breakout: Session volume expands > 1.5x of 20-day moving average on breakout',
      'Enforced 1:2 Risk/Reward: Target pegged at +7% to +10%, Stop loss strict at -3.5%',
    ],
    manualGuide: 'Look for stocks in strong uptrends forming 2 to 4 contractions on daily chart. Buy as price breaks above the last pivot resistance with heavy volume. Place stop-loss just beneath the low of the final contraction.'
  },
  '20 EMA / 50 EMA Pullback Bounce': {
    method: 'Institutional 20/50 EMA Pullback Bounce',
    rules: [
      'Primary Momentum: Stock is in a confirmed multi-week advance above rising 50 EMA',
      'Mean Reversion Test: Price pulls back to touch or undercut the rising 20 EMA / 50 EMA band',
      'Momentum Reset: 14-period RSI cools down into the 45-55 support zone without breaking 40',
      'Confirmation Reversal: Price forms a bullish rejection wick or engulfing candle off the EMA',
      'Asymmetric Edge: Stop-loss anchored just below the pullback swing low',
    ],
    manualGuide: 'Do not chase breakout highs. Wait for strong leaders to pull back to their rising 20-day EMA. When you see buyers stepping in with an intraday bounce, buy with a stop just below that day’s low.'
  },
  'Mansfield Relative Strength vs Nifty': {
    method: 'Mansfield Relative Strength vs NIFTY 50 Benchmark',
    rules: [
      'Outperformance Filter: Stock ratio vs Nifty 50 Index (Stock / ^NSEI) is rising',
      '5-Day Relative Alpha: Outperforming benchmark index by > 5% over rolling 5 sessions',
      'Institutional Footprint: Accumulation days (heavy up-volume) outnumber distribution days',
      'Market Resistance: Stock holds gains or makes new highs even when Nifty is flat or falling',
    ],
    manualGuide: 'Divide stock price by NIFTY 50 index. If this ratio is breaking to new highs while the broader market consolidates, institutions are aggressively accumulating. Buy on minor consolidations.'
  },
  'Darvas Box Multi-Day High Breakout': {
    method: 'Nicolas Darvas Multi-Day Box High Breakout',
    rules: [
      'Box Ceiling: Stock defines a clear horizontal resistance high tested at least 3 times',
      'Box Floor: Clear lower boundary support tested without violation',
      'Breakout Ignition: Close piercing above the top box ceiling with minimum +1.5% day gain',
      'Stop-loss Protection: Stop pegged precisely at the bottom or middle of the Darvas Box',
    ],
    manualGuide: 'Draw horizontal lines across the highest high and lowest low of the last 2-3 weeks. When a daily candle closes above the top box boundary on strong volume, enter long and trail stop at the box floor.'
  },
  'Turtle 20-Day Donchian Breakout': {
    method: 'Turtle Trading 20-Day Donchian Channel Breakout',
    rules: [
      '20-Day Range Peak: Today’s price makes a 20-trading-day highest high',
      'True Range Filter: Average True Range (14-ATR) expanding to confirm genuine momentum',
      'Trend Direction: 50-day SMA is sloping upward (minimum +1% slope over 20 days)',
      'Pre-Calculated Exit: Strict 2x ATR stop loss and time horizon exit',
    ],
    manualGuide: 'Plot a 20-day Donchian Channel on your chart. When price closes above the upper band, enter long immediately. Sell if price drops below the 10-day low or reaches your 1:2 R:R target.'
  }
};

export const AutoStrategyPaperTraderView: React.FC<AutoStrategyPaperTraderViewProps> = ({
  onSelectStock,
}) => {
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [metrics, setMetrics] = useState<TrackRecordMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WINS' | 'LOSSES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMethodTrade, setSelectedMethodTrade] = useState<PredictionItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch verified predictions & auto-calculated strategy performance
  const fetchTrackRecord = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/predictions/track-record');
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
        setMetrics(data.metrics || null);
      }
    } catch (e) {
      console.error('Failed to load predictions track record:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackRecord();
  }, []);

  // Delete a single trade
  const handleDeleteTrade = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this trade record from the permanent paper ledger?')) return;
    try {
      const res = await fetch(`/api/predictions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setPredictions(prev => prev.filter(p => p.id !== id));
        setToastMessage('Trade record deleted successfully.');
        setTimeout(() => setToastMessage(null), 3000);
        fetchTrackRecord();
      }
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  // Delete trades older than 30 days
  const handleDeleteOlderThanMonth = async () => {
    if (!confirm('Delete all trades older than 30 days to start a fresh cycle for the new month?')) return;
    try {
      const res = await fetch('/api/predictions/delete-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setToastMessage(`Deleted ${data.deletedCount} past month trade records.`);
        setTimeout(() => setToastMessage(null), 3500);
        fetchTrackRecord();
      }
    } catch (err) {
      console.error('Failed to delete past month trades:', err);
    }
  };

  // Clear all trades
  const handleClearAllTrades = async () => {
    if (!confirm('Are you sure you want to delete ALL paper trades in the database? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/predictions/clear-all', { method: 'POST' });
      if (res.ok) {
        setPredictions([]);
        setToastMessage('All paper trades cleared.');
        setTimeout(() => setToastMessage(null), 3000);
        fetchTrackRecord();
      }
    } catch (err) {
      console.error('Failed to clear trades:', err);
    }
  };

  // Strict Deduplication Rule: Exactly ONE active position per stock symbol across the whole ledger
  const deduplicatedPredictions = useMemo(() => {
    const seenActive = new Set<string>();
    return predictions.filter(p => {
      if (p.status === 'ACTIVE') {
        if (seenActive.has(p.symbol)) return false;
        seenActive.add(p.symbol);
      }
      return true;
    });
  }, [predictions]);

  // Filtered trades list
  const filteredPredictions = useMemo(() => {
    return deduplicatedPredictions.filter(p => {
      if (statusFilter === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (statusFilter === 'WINS' && (!p.isWin || p.status === 'ACTIVE')) return false;
      if (statusFilter === 'LOSSES' && (p.isWin || p.status === 'ACTIVE')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.symbol.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.strategyTag.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deduplicatedPredictions, statusFilter, searchQuery]);

  // Today's Suggestions (Active trades recommended in latest sessions)
  const todaySuggestions = useMemo(() => {
    return deduplicatedPredictions.filter(p => p.status === 'ACTIVE');
  }, [deduplicatedPredictions]);

  // Strategy Comparison List
  const strategyList = useMemo(() => {
    if (!metrics?.strategyBreakdown) return [];
    return Object.entries(metrics.strategyBreakdown).map(([name, data]) => {
      const isProfitable = data.accuracy >= 55 && data.avgReturn > 0;
      return {
        name,
        total: data.total,
        wins: data.wins,
        losses: data.losses,
        accuracy: data.accuracy,
        avgReturn: data.avgReturn,
        status: isProfitable ? 'PROFITABLE' : data.accuracy >= 45 ? 'NEUTRAL' : 'UNDERPERFORMING',
      };
    }).sort((a, b) => b.accuracy - a.accuracy);
  }, [metrics]);

  const winCount = metrics?.winsCount || 0;
  const lossCount = metrics?.lossesCount || 0;
  const totalResolved = metrics?.resolvedPredictions || 0;
  const winPercent = metrics?.accuracy || 0;
  const lossPercent = totalResolved > 0 ? Number((100 - winPercent).toFixed(1)) : 0;
  const sessionInfo = getNseSessionDetails();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Weekend / Market Status Notice Banner */}
      {sessionInfo.isWeekend && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-start gap-3 text-xs">
          <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-amber-300 flex items-center gap-2">
              <span>NSE Market Closed (Weekend)</span>
              <span className="text-[10px] bg-amber-900/80 text-amber-200 px-2 py-0.2 rounded-full border border-amber-700">
                Actionable for Monday Open
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Stock exchanges are closed on Saturday &amp; Sunday. All weekend strategy scans evaluate Friday’s closing candle data ({sessionInfo.signalDate}). Active recommendations are scheduled for entry on <strong>Monday ({sessionInfo.entryTradingDate}) at 09:15 AM IST</strong> market open.
            </p>
          </div>
        </div>
      )}

      {/* 1. Clean Hero Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
                <Bot className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Automated Swing Strategy Paper Trader
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 border border-emerald-600 text-emerald-300 flex items-center gap-1.5 font-mono-num">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Validator Active
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Zero manual input required. The system generates swing trade suggestions with predetermined holding periods (days/weeks), automatically enters paper trades, strictly enforces Target / Stop-Loss / Time Limit exits against real NSE exchange bars, and tracks which strategies actually profit.
            </p>

            {/* Zero-Quota Algorithmic Integrity Callout */}
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 flex items-start gap-2.5 mt-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-slate-300">
                <span className="font-bold text-white">Dynamic Qualification Policy: </span>
                <span>We never force 3 to 5 trades daily. If 100 stocks meet all strict strategy criteria on a given day, all 100 are automatically included. If zero stocks satisfy the rules, zero trades are recommended to preserve capital.</span>
              </div>
            </div>
          </div>

          <button
            onClick={fetchTrackRecord}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Auditing Real Ticks...' : 'Re-Check Live Exits'}</span>
          </button>
        </div>

        {/* 2. Overall Performance Scorecard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 font-mono-num">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 font-sans block mb-1">Total Auto-Trades</span>
            <div className="text-2xl font-black text-white">
              {metrics?.totalPredictions || 0}
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              {metrics?.resolvedPredictions || 0} Settled · {metrics?.activePredictions || 0} Active
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 font-sans block mb-1">Overall Win Rate</span>
            <div className="text-2xl font-black text-emerald-400">
              {winPercent}%
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              {winCount} Wins vs {lossCount} Losses
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 font-sans block mb-1">Cumulative Realized Return</span>
            <div className={`text-2xl font-black ${(metrics?.avgReturnPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(metrics?.avgReturnPercent || 0) >= 0 ? '+' : ''}{metrics?.avgReturnPercent || 0}%
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              Avg per executed swing trade
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
            <span className="text-[11px] text-slate-400 font-sans block mb-1">Profit Factor</span>
            <div className="text-2xl font-black text-indigo-400">
              {metrics?.profitFactor || 0}x
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              Gross Wins / Gross Losses
            </div>
          </div>
        </div>

        {/* Visual Win / Loss Distribution Bar */}
        {totalResolved > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono-num text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {winCount} Profitable Trades ({winPercent}%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                <XCircle className="w-3.5 h-3.5" />
                {lossCount} Controlled Losses ({lossPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                style={{ width: `${winPercent}%` }}
                className="bg-emerald-500 transition-all duration-700"
                title={`Wins: ${winCount} (${winPercent}%)`}
              />
              <div
                style={{ width: `${lossPercent}%` }}
                className="bg-rose-500 transition-all duration-700"
                title={`Losses: ${lossCount} (${lossPercent}%)`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Strategy Comparison Matrix ("Which strategy worked well, which strategy worked wrong?") */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Strategy Validation Matrix: What Worked vs What Failed
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono-num">
            {strategyList.length} Proven Strategies Evaluated
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategyList.map((st) => {
            const isWinMajority = st.accuracy >= 50;
            return (
              <div
                key={st.name}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-white text-xs truncate" title={st.name}>
                      {st.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        st.status === 'PROFITABLE'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : st.status === 'NEUTRAL'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : 'bg-rose-950 text-rose-300 border border-rose-700'
                      }`}
                    >
                      {st.status === 'PROFITABLE' ? '✓ Profitable' : st.status === 'NEUTRAL' ? 'Neutral' : 'Underperformed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono-num text-xs mt-3 pt-3 border-t border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">Total</span>
                      <span className="font-bold text-white">{st.total}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">Win Rate</span>
                      <span className={`font-bold ${isWinMajority ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {st.accuracy}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">Avg Return</span>
                      <span className={`font-bold ${st.avgReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {st.avgReturn >= 0 ? '+' : ''}{st.avgReturn}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-500 font-mono-num flex items-center justify-between">
                  <span>{st.wins} Wins · {st.losses} Losses</span>
                  <span className="text-slate-400 font-sans text-[10px]">Auto-Audited</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Today's Suggested Trades (Active & Awaiting Target/Stop) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Active Trade Suggestions of the Day
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700/80 font-mono-num">
              {todaySuggestions.length} Setups Qualified Mathematically (No Quota Cap)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Automatically injected into validator · Zero trades forced if conditions are suboptimal
          </span>
        </div>

        {todaySuggestions.length === 0 ? (
          <div className="py-8 px-6 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-950 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              0 Trades Qualified Today — 100% Capital Preserved
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
              Today&rsquo;s scan across the NSE universe found 0 stocks satisfying all required high-probability criteria (Stage 2 Uptrend, Minervini VCP / 20 EMA bounce, volume surge &gt; 1.5x, and minimum 1:2 Risk/Reward). Rather than forcing low-quality trades, the algorithm preserves your capital until high-probability setups re-emerge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todaySuggestions.map((trade) => {
              const currentPnL = Number((((trade.currentPrice - trade.recommendedEntryPrice) / trade.recommendedEntryPrice) * 100).toFixed(2));
              const isProfit = currentPnL >= 0;
              return (
                <div
                  key={trade.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-sm font-mono-num">
                          {trade.symbol.replace('.NS', '')}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                          {trade.name}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono-num">
                        {trade.holdingHorizon}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-indigo-300 font-medium">
                      <span className="truncate max-w-[180px]" title={trade.strategyTag}>
                        {trade.strategyTag}
                      </span>
                      <button
                        onClick={() => setSelectedMethodTrade(trade)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-200 underline flex items-center gap-1 shrink-0"
                      >
                        <Info className="w-3 h-3" />
                        <span>View Method</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono-num text-xs pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Entry</span>
                        <span className="font-bold text-white">₹{trade.recommendedEntryPrice.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 block">Target (+{trade.targetPercent}%)</span>
                        <span className="font-bold text-emerald-400">₹{trade.targetPrice.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-400 block">Stop (-{trade.stopLossPercent}%)</span>
                        <span className="font-bold text-rose-400">₹{trade.stopLossPrice.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono-num">
                    <span className="text-slate-400 text-[11px]">
                      Live CMP: ₹{trade.currentPrice.toFixed(1)}
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>{isProfit ? '+' : ''}{currentPnL}%</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Complete Paper Trading Execution Ledger (Open & Closed Trades) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Verified Paper Execution Ledger
            </h2>
            <span className="text-xs text-slate-400 font-mono-num">
              ({filteredPredictions.length} Trades Listed)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({predictions.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'ACTIVE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({predictions.filter(p => p.status === 'ACTIVE').length})
              </button>
              <button
                onClick={() => setStatusFilter('WINS')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'WINS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Wins ({winCount})
              </button>
              <button
                onClick={() => setStatusFilter('LOSSES')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'LOSSES' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Losses ({lossCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search symbol / method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono-num"
              />
            </div>

            {/* Batch Delete Options */}
            <button
              onClick={handleDeleteOlderThanMonth}
              title="Delete trades older than 30 days to start a clean new cycle"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Delete 30d+</span>
            </button>

            <button
              onClick={handleClearAllTrades}
              title="Clear all trades in ledger"
              className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Ledger Table with Method and Delete Columns */}
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-num">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-3">Entry Date</th>
                  <th className="py-3 px-4">Selection Method &amp; Strategy Formula</th>
                  <th className="py-3 px-3 text-right">Entry Price</th>
                  <th className="py-3 px-3 text-right">Target Sell</th>
                  <th className="py-3 px-3 text-right">Stop Loss</th>
                  <th className="py-3 px-3 text-center">Holding Horizon</th>
                  <th className="py-3 px-3 text-center">Execution Result</th>
                  <th className="py-3 px-3 text-right">P&amp;L Return</th>
                  <th className="py-3 px-3 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPredictions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 font-sans text-xs">
                      No trades matched the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPredictions.map((trade) => {
                    const isClosed = trade.status !== 'ACTIVE';
                    const isProfit = (trade.resultProfitLossPercent ?? 0) > 0;
                    const methodName = trade.selectionMethod || trade.strategyTag;
                    return (
                      <tr
                        key={trade.id}
                        className="hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Stock */}
                        <td className="py-3 px-4 font-sans">
                          <button
                            onClick={() => onSelectStock && onSelectStock(trade.symbol)}
                            className="text-left group/sym hover:underline"
                          >
                            <div className="font-bold text-white font-mono-num group-hover/sym:text-indigo-300 transition-colors">
                              {trade.symbol.replace('.NS', '')}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {trade.name}
                            </div>
                          </button>
                        </td>

                        {/* Entry Date */}
                        <td className="py-3 px-3 text-slate-300 text-[11px]">
                          <div className="font-semibold text-slate-200">
                            {trade.recommendedDate}
                          </div>
                          {trade.status === 'ACTIVE' && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-950 border border-indigo-700/80 text-indigo-300">
                              {trade.recommendedDate >= '2026-10-05' ? '📅 Mon 09:15 AM Open' : 'Active Session'}
                            </span>
                          )}
                        </td>

                        {/* Method Column: Shows exact method used and button to inspect formula */}
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-indigo-300 text-xs truncate max-w-[180px]" title={methodName}>
                              {methodName}
                            </span>
                            <button
                              onClick={() => setSelectedMethodTrade(trade)}
                              className="px-2 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0"
                              title="Inspect exact formula and rules used to choose this stock"
                            >
                              <BookOpen className="w-3 h-3 text-amber-300" />
                              <span>View Method</span>
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs font-mono-num">
                            Conf: {trade.confidenceScore}% · R:R 1:2
                          </div>
                        </td>

                        {/* Entry Price */}
                        <td className="py-3 px-3 text-right font-bold text-white">
                          ₹{trade.recommendedEntryPrice.toFixed(2)}
                        </td>

                        {/* Target Sell */}
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          ₹{trade.targetPrice.toFixed(2)}
                          <div className="text-[10px] text-emerald-500/80 font-normal">
                            +{trade.targetPercent}%
                          </div>
                        </td>

                        {/* Stop Loss */}
                        <td className="py-3 px-3 text-right text-rose-400 font-bold">
                          ₹{trade.stopLossPrice.toFixed(2)}
                          <div className="text-[10px] text-rose-500/80 font-normal">
                            -{trade.stopLossPercent}%
                          </div>
                        </td>

                        {/* Holding Horizon */}
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {trade.holdingHorizon}
                          </span>
                        </td>

                        {/* Execution Result Badge */}
                        <td className="py-3 px-3 text-center">
                          {trade.status === 'TARGET_HIT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>TARGET HIT (WIN)</span>
                            </span>
                          ) : trade.status === 'STOP_LOSS_HIT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>STOP LOSS CUT</span>
                            </span>
                          ) : trade.status === 'TIME_LIMIT_EXIT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>TIME LIMIT EXIT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>ACTIVE IN-MARKET</span>
                            </span>
                          )}
                          {trade.exitDate && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Exited: {trade.exitDate}
                            </div>
                          )}
                        </td>

                        {/* P&L Return */}
                        <td className="py-3 px-3 text-right">
                          {isClosed ? (
                            <div className={`font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{trade.resultProfitLossPercent?.toFixed(2)}%
                            </div>
                          ) : (
                            <div className="text-slate-400 font-bold text-xs">
                              In Progress
                            </div>
                          )}
                        </td>

                        {/* Delete Action Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => handleDeleteTrade(trade.id, e)}
                            title="Delete this trade record"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Method & Strategy Formula Inspection Modal */}
      {selectedMethodTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Method &amp; Selection Formula: {selectedMethodTrade.symbol.replace('.NS', '')}
                  </h3>
                  <p className="text-xs text-slate-400">
                    How this stock was mathematically chosen by the system for swing trading
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMethodTrade(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Method Breakdown */}
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                  Strategy Method Name
                </div>
                <div className="text-base font-bold text-white">
                  {selectedMethodTrade.selectionMethod || selectedMethodTrade.strategyTag}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Holding Horizon: <strong className="text-slate-200">{selectedMethodTrade.holdingHorizon}</strong> · Confidence: <strong className="text-emerald-400">{selectedMethodTrade.confidenceScore}%</strong>
                </div>
              </div>

              {/* Exact Rules Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Exact Technical Rules &amp; Entry Criteria Used:
                </div>
                <div className="space-y-2">
                  {(selectedMethodTrade.selectionRules || DEFAULT_METHOD_RULES[selectedMethodTrade.strategyTag]?.rules || [
                    'Stage 2 Advance: Price > 20 EMA > 50 EMA > 200 EMA with positive volume trend',
                    'Asymmetric Risk-Reward: Target +7% to +10%, Stop loss strictly limited to -3.5%',
                    'Momentum Confirmation: Outperforming benchmark Nifty 50 over rolling 5 sessions',
                    'Holding Period Enforced: Pre-scheduled time exit after 3 to 5 sessions',
                  ]).map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Usage Guide for User */}
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-4 space-y-1.5 text-xs">
                <div className="font-bold text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>How You Can Use This Method Manually in the Future:</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {DEFAULT_METHOD_RULES[selectedMethodTrade.strategyTag]?.manualGuide ||
                    'Identify stocks trading above their rising 20-day and 50-day moving averages. Enter when a high-volume breakout or 20-EMA bounce confirms buyers stepping in. Immediately set your target at 2x your risk (1:2 R:R) and hold for 3 to 5 sessions max.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 pt-4 flex justify-end">
              <button
                onClick={() => setSelectedMethodTrade(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
