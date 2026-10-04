import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  ShieldAlert, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Play, 
  RotateCcw, 
  RefreshCw, 
  Filter, 
  Briefcase, 
  CheckCircle2, 
  Layers, 
  BarChart3, 
  ArrowRight, 
  ExternalLink,
  Wallet,
  Calendar,
  AlertCircle,
  Bot,
  BookOpen,
  Compass,
  Calculator,
  Database,
  Save,
  Check,
  FlaskConical,
  Award
} from 'lucide-react';
import { StockMeta } from '../types/market';
import { PlaygroundPosition, PlaygroundState } from '../types/playground';
import { MonthlyPnLChart } from './MonthlyPnLChart';
import { PerformanceDashboard } from './PerformanceDashboard';
import { StrategyLibraryModal } from './StrategyLibraryModal';
import { AiAnalysisModal } from './AiAnalysisModal';
import { MathProofModal } from './MathProofModal';
import { PaperTradeJournal } from './PaperTradeJournal';
import { BacktestLabModal } from './BacktestLabModal';
import { getNseSessionDetails } from '../utils/marketCalendar';
import { HistoricalPredictionsView } from './HistoricalPredictionsView';
import { TradeMathDerivation } from '../utils/indianSwingStrategies';

interface SwingCallItem {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  entryPrice: number;
  targetPrice: number;
  targetPercent: number;
  target2Price: number;
  target2Percent: number;
  stopLossPrice: number;
  stopLossPercent: number;
  riskRewardRatio: number;
  action: string;
  holdingHorizon: string;
  suggestedHoldingDays: number;
  confidenceScore: number;
  strategiesMet: string[];
  minerviniScore: string;
  stage: string;
  recommendedPositionShares: number;
  mathProof?: TradeMathDerivation;
}

interface MarketSwingCallsViewProps {
  onSelectStockAndGoToData: (symbol: string) => void;
  availableStocks: StockMeta[];
  watchlist: string[];
}

const STORAGE_KEY = 'nse_swing_playground_v4_authentic_only';
const INITIAL_CAPITAL = 1000000; // 10 Lakh INR

export const MarketSwingCallsView: React.FC<MarketSwingCallsViewProps> = ({
  onSelectStockAndGoToData,
  availableStocks,
  watchlist,
}) => {
  const [calls, setCalls] = useState<SwingCallItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [horizonFilter, setHorizonFilter] = useState<'all' | 'quick' | 'weekly' | 'high_score' | 'watchlist'>('all');
  const [activeTabSection, setActiveTabSection] = useState<'journal' | 'calls' | 'active_trades' | 'ledger' | 'historical_predictions' | 'monthly_chart'>('journal');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [marketRegime, setMarketRegime] = useState<{
    status: string;
    niftyPrice: number;
    nifty5DayReturn: number;
    nifty1MonthReturn: number;
    isCorrection: boolean;
    summary: string;
  } | null>(null);

  // 10x-a-day Auto-Scheduler & AI State
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
  const [backtestTargetSymbol, setBacktestTargetSymbol] = useState('CYIENT.NS');
  const [isAutoEvaluating, setIsAutoEvaluating] = useState(false);
  const [aiAnalysisTarget, setAiAnalysisTarget] = useState<{ symbol: string; name?: string; currentPrice?: number } | null>(null);
  const [mathProofTarget, setMathProofTarget] = useState<{ symbol: string; name: string; mathProof?: TradeMathDerivation } | null>(null);
  const [dbStats, setDbStats] = useState<{ connected: boolean; fileSizeKb: number; totalTrades: number; trackedStocksInCache: number } | null>(null);
  const [scanSchedule, setScanSchedule] = useState<{
    autoScanEnabled: boolean;
    intervalMinutes: number;
    scansPerDay: number;
    currentScanCountToday: number;
    lastScanTime: string;
    nextScanTime: string;
    universeSize: number;
  } | null>(null);
  const [nextScanCountdown, setNextScanCountdown] = useState<string>('38m 00s');

  // Playground state: strictly genuine user-executed trades, starts 100% empty
  const [playground, setPlayground] = useState<PlaygroundState>({
    initialCapital: INITIAL_CAPITAL,
    availableCash: INITIAL_CAPITAL,
    positions: [],
    closedTrades: [],
    autoTradeEnabled: true,
  });
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Fetch Database persistence stats
  const fetchDbStats = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data);
      }
    } catch (_) {}
  };

  // 1. Initial Load from Persistent Server Database and verify live prices
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const res = await fetch('/api/database/trades');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.trades)) {
            const openPos = data.trades.filter((t: any) => t.status === 'OPEN');
            const closedPos = data.trades.filter((t: any) => t.status !== 'OPEN');
            const cash = typeof data.capital?.availableCash === 'number' ? data.capital.availableCash : INITIAL_CAPITAL;
            setPlayground({
              initialCapital: INITIAL_CAPITAL,
              availableCash: cash,
              positions: openPos,
              closedTrades: closedPos,
              autoTradeEnabled: true,
            });

            // If there are open positions, immediately evaluate them against real live Yahoo Finance prices
            if (openPos.length > 0) {
              fetch('/api/paper-trades/auto-evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  positions: openPos,
                  closedTrades: closedPos,
                  availableCash: cash,
                }),
              }).then(r => r.json()).then(evaluated => {
                if (evaluated.success) {
                  setPlayground(prev => ({
                    ...prev,
                    positions: evaluated.positions || [],
                    closedTrades: evaluated.closedTrades || [],
                    availableCash: evaluated.availableCash ?? prev.availableCash,
                  }));
                }
              }).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load server trades on mount:', e);
      } finally {
        setIsDbLoaded(true);
        fetchDbStats();
      }
    };
    loadFromDb();
  }, []);

  // 2. Save trades to server only after initial load has occurred
  useEffect(() => {
    if (!isDbLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playground));
      fetch('/api/database/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trades: [...playground.positions, ...playground.closedTrades],
          availableCash: playground.availableCash,
        }),
      }).then(() => fetchDbStats()).catch(() => {});
    } catch (_) {}
  }, [playground, isDbLoaded]);

  // Fetch scan schedule metadata
  const fetchScanSchedule = async () => {
    try {
      const res = await fetch('/api/scan-schedule');
      if (res.ok) {
        const data = await res.json();
        setScanSchedule(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchScanSchedule();
    const interval = setInterval(fetchScanSchedule, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer to next auto-scan
  useEffect(() => {
    if (!scanSchedule?.nextScanTime) return;
    const updateCountdown = () => {
      const diffMs = new Date(scanSchedule.nextScanTime).getTime() - Date.now();
      if (diffMs <= 0) {
        setNextScanCountdown('Scanning now...');
        fetchSwingCalls();
        fetchScanSchedule();
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setNextScanCountdown(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [scanSchedule]);

  // Periodic 30-second live auto-evaluation of open paper positions against real market ticks
  useEffect(() => {
    if (playground.positions.length === 0) return;
    const interval = setInterval(() => {
      fetch('/api/paper-trades/auto-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: playground.positions,
          closedTrades: playground.closedTrades,
          availableCash: playground.availableCash,
        }),
      })
        .then(r => r.json())
        .then(evaluated => {
          if (evaluated.success) {
            setPlayground(prev => ({
              ...prev,
              positions: evaluated.positions || [],
              closedTrades: evaluated.closedTrades || [],
              availableCash: evaluated.availableCash ?? prev.availableCash,
            }));
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [playground.positions, playground.closedTrades, playground.availableCash]);

  // Fetch Market-Wide Swing Calls of the Day from API with retry resilience
  const fetchSwingCalls = async (customSymbols?: string[], retryCount: number = 2) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = '/api/swing-calls';
      if (customSymbols && customSymbols.length > 0) {
        url += `?symbols=${encodeURIComponent(customSymbols.join(','))}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load swing calls`);
      const data = await res.json();
      setCalls(data.calls || []);
      if (data.marketRegime) {
        setMarketRegime(data.marketRegime);
      }
    } catch (err: any) {
      if (retryCount > 0) {
        setTimeout(() => fetchSwingCalls(customSymbols, retryCount - 1), 1000);
        return;
      }
      console.error('Error fetching swing calls:', err);
      const isNetErr = err.message === 'Failed to fetch' || err.name === 'TypeError';
      setError(isNetErr ? 'Live market connection momentarily busy. Click "Retry Scan" to refresh.' : (err.message || 'Unable to load daily swing trade calls'));
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate Deep AI Scan Trigger
  const handleTriggerDeepScan = async () => {
    setIsLoading(true);
    setFeedbackToast('🚀 Running Deep AI Scan across 120+ NSE stocks...');
    try {
      const res = await fetch('/api/trigger-scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setCalls(data.report.calls || []);
          if (data.report.marketRegime) setMarketRegime(data.report.marketRegime);
        }
        fetchScanSchedule();
        setFeedbackToast('✅ Deep AI Scan complete across broad NSE universe!');
      }
    } catch (e: any) {
      setFeedbackToast('Scan failed: ' + e.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  useEffect(() => {
    fetchSwingCalls();
  }, []);

  // Filter calls based on chosen horizon
  const filteredCalls = calls.filter(c => {
    if (horizonFilter === 'quick') {
      return c.holdingHorizon.includes('2 to') || c.holdingHorizon.includes('3 to');
    }
    if (horizonFilter === 'weekly') {
      return c.holdingHorizon.includes('Week') || c.holdingHorizon.includes('5 to');
    }
    if (horizonFilter === 'high_score') {
      return c.confidenceScore >= 85;
    }
    if (horizonFilter === 'watchlist') {
      return watchlist.includes(c.symbol);
    }
    return true;
  });

  // Add Call to Paper Trading Playground
  const handleAddCallToPlayground = (call: SwingCallItem, sharesCount?: number) => {
    const qty = sharesCount || call.recommendedPositionShares || 20;
    const totalCost = qty * call.entryPrice;

    if (totalCost > playground.availableCash) {
      setFeedbackToast(`Insufficient cash! Required ₹${Math.round(totalCost).toLocaleString('en-IN')}, available ₹${Math.round(playground.availableCash).toLocaleString('en-IN')}`);
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    const session = getNseSessionDetails();
    const tradeEntryDate = session.entryTradingDate; // Strictly Monday-Friday trading day

    const newPos: PlaygroundPosition = {
      id: `${call.symbol}_${Date.now()}`,
      symbol: call.symbol,
      name: call.name,
      side: 'BUY',
      entryDate: tradeEntryDate,
      entryPrice: call.entryPrice,
      quantity: qty,
      investedAmount: Math.round(totalCost),
      currentPrice: call.entryPrice,
      targetPrice: call.targetPrice,
      targetPercent: call.targetPercent,
      stopLossPrice: call.stopLossPrice,
      stopLossPercent: call.stopLossPercent,
      holdingHorizon: call.holdingHorizon,
      suggestedHoldingDays: call.suggestedHoldingDays,
      daysHeld: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      status: 'OPEN',
      strategyTag: call.action,
      confidenceScore: call.confidenceScore,
      dailyHistory: [
        {
          date: tradeEntryDate,
          open: call.entryPrice,
          high: call.entryPrice,
          low: call.entryPrice,
          close: call.entryPrice,
          changePercent: 0,
          cumPnLPercent: 0,
          statusDay: session.isWeekend
            ? `Scheduled for Monday Open (${tradeEntryDate}, 09:15 AM IST)`
            : 'Day 0: Trade Entered as per Recommendation',
        }
      ],
    };

    setPlayground(prev => ({
      ...prev,
      availableCash: prev.availableCash - totalCost,
      positions: [newPos, ...prev.positions],
    }));

    setFeedbackToast(`✓ Added ${qty} shares of ${call.symbol} to Paper Trading Playground!`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Auto-Pilot Execution: Allocate capital to top strategy signals automatically
  const handleAutoPilotExecute = async () => {
    if (calls.length === 0) {
      setFeedbackToast('Scanning universe first to identify high-probability strategy setups...');
      await handleTriggerDeepScan();
    }
    setIsAutoEvaluating(true);
    setFeedbackToast('🤖 Autonomous Bot: Allocating capital to top strategy setups...');
    try {
      const res = await fetch('/api/paper-trades/auto-pilot-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calls,
          openPositions: playground.positions,
          availableCash: playground.availableCash,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.countAdded > 0) {
          setPlayground(prev => ({
            ...prev,
            positions: [...data.newPositions, ...prev.positions],
            availableCash: data.availableCash,
          }));
          setFeedbackToast(`✅ Auto-Pilot entered ${data.countAdded} new strategy paper positions!`);
        } else {
          setFeedbackToast('Candidate stocks already monitored in paper journal or limit reached.');
        }
      }
    } catch (e: any) {
      setFeedbackToast('Auto-pilot failed: ' + e.message);
    } finally {
      setIsAutoEvaluating(false);
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  // Automated Live Market Execution: Calls backend live Yahoo Finance evaluator
  const handleAutoResolveAll = async () => {
    if (playground.positions.length === 0) {
      setFeedbackToast('No active positions to evaluate.');
      setTimeout(() => setFeedbackToast(null), 2500);
      return;
    }

    setIsAutoEvaluating(true);
    try {
      const res = await fetch('/api/paper-trades/auto-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: playground.positions,
          closedTrades: playground.closedTrades,
          availableCash: playground.availableCash,
        }),
      });

      if (!res.ok) throw new Error('Live price evaluation failed');
      const data = await res.json();

      setPlayground(prev => ({
        ...prev,
        positions: data.positions || [],
        closedTrades: data.closedTrades || prev.closedTrades,
        availableCash: typeof data.availableCash === 'number' ? data.availableCash : prev.availableCash,
      }));

      if (data.autoClosedCount > 0) {
        setFeedbackToast(`🎯 Live Market Auto-Executed ${data.autoClosedCount} position(s) at Target or Stop-Loss!`);
      } else {
        setFeedbackToast('✓ Live prices evaluated: All open positions within Target & Stop-Loss barriers.');
      }
    } catch (err: any) {
      setFeedbackToast('Live evaluation failed: ' + err.message);
    } finally {
      setIsAutoEvaluating(false);
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  // Single-position live price check
  const handleAutoResolvePosition = async (positionId: string) => {
    const pos = playground.positions.find(p => p.id === positionId);
    if (!pos) return;

    setIsAutoEvaluating(true);
    try {
      const res = await fetch('/api/paper-trades/auto-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: [pos],
          closedTrades: playground.closedTrades,
          availableCash: playground.availableCash,
        }),
      });

      if (!res.ok) throw new Error('Live price check failed');
      const data = await res.json();

      const isClosedNow = !data.positions.some((p: any) => p.id === pos.id);
      const otherPositions = playground.positions.filter(p => p.id !== pos.id);
      const updatedThisPos = data.positions.find((p: any) => p.id === pos.id);

      setPlayground(prev => ({
        ...prev,
        positions: isClosedNow ? otherPositions : [...otherPositions, updatedThisPos || pos],
        closedTrades: data.closedTrades || prev.closedTrades,
        availableCash: typeof data.availableCash === 'number' ? data.availableCash : prev.availableCash,
      }));

      if (isClosedNow) {
        setFeedbackToast(`🎯 Auto-Executed ${pos.symbol}: Reached exit barrier!`);
      } else {
        setFeedbackToast(`Live price for ${pos.symbol}: ₹${updatedThisPos?.currentPrice || pos.currentPrice} (Tracking active)`);
      }
    } catch (err: any) {
      setFeedbackToast('Live check failed: ' + err.message);
    } finally {
      setIsAutoEvaluating(false);
      setTimeout(() => setFeedbackToast(null), 3000);
    }
  };

  // Periodic background live evaluation of open paper trades (every 60 seconds)
  useEffect(() => {
    if (playground.positions.length === 0) return;
    const interval = setInterval(() => {
      handleAutoResolveAll();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [playground.positions.length]);

  // Reset Playground
  const handleResetPlayground = () => {
    if (confirm('Reset paper trading playground balance to ₹10,00,000?')) {
      setPlayground({
        initialCapital: INITIAL_CAPITAL,
        availableCash: INITIAL_CAPITAL,
        positions: [],
        closedTrades: [],
        autoTradeEnabled: true,
      });
      setFeedbackToast('Playground balance reset to ₹10,00,000');
      setTimeout(() => setFeedbackToast(null), 2000);
    }
  };

  // Add trade manually from Paper Trade Journal
  const handleAddTradeFromJournal = (tradeData: Omit<PlaygroundPosition, 'id' | 'daysHeld' | 'unrealizedPnL' | 'unrealizedPnLPercent'>) => {
    const newPos: PlaygroundPosition = {
      ...tradeData,
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      daysHeld: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
    };

    setPlayground(prev => ({
      ...prev,
      availableCash: Math.max(0, prev.availableCash - newPos.investedAmount),
      positions: [newPos, ...prev.positions],
    }));

    setFeedbackToast(`Successfully recorded ${newPos.symbol} in Paper Trade Journal`);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Delete trade from Paper Trade Journal
  const handleDeleteTradeFromJournal = (id: string, isClosed: boolean) => {
    setPlayground(prev => {
      if (isClosed) {
        return {
          ...prev,
          closedTrades: prev.closedTrades.filter(t => t.id !== id),
        };
      } else {
        const pos = prev.positions.find(p => p.id === id);
        const refund = pos ? pos.investedAmount : 0;
        return {
          ...prev,
          availableCash: prev.availableCash + refund,
          positions: prev.positions.filter(p => p.id !== id),
        };
      }
    });
    setFeedbackToast('Trade record removed from Journal');
    setTimeout(() => setFeedbackToast(null), 2000);
  };

  // Portfolio metrics
  const portfolioStats = {
    totalInvested: playground.positions.reduce((acc, p) => acc + p.investedAmount, 0),
    totalCurrentValue: playground.positions.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0),
    get totalPortfolio() {
      return playground.availableCash + this.totalCurrentValue;
    },
    get overallGain() {
      return this.totalPortfolio - playground.initialCapital;
    },
    get overallGainPercent() {
      return (this.overallGain / playground.initialCapital) * 100;
    },
    winRate: playground.closedTrades.length > 0 
      ? Math.round((playground.closedTrades.filter(t => (t.realizedPnL || 0) > 0).length / playground.closedTrades.length) * 100)
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500 text-indigo-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Streamlined Clean Header & Capital Overview (Uncluttered) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">NSE Equity Swing Radar</span>
              <span aria-hidden="true">·</span>
              <span>2,599 Listed Stocks</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">10x Daily Auto-Scanner</span>
              <span aria-hidden="true">·</span>
              <span>Persistent DB Active</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Daily High-Probability Swing Trade Setups
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
              Mathematically derived Target 1 (1:2 R:R), Target 2, and Stop-Loss limits. Track recommendations session-by-session in the Paper Trade Journal.
            </p>
          </div>

          {/* Quick Capital & Win Rate Strip (Clean, single-line typography) */}
          <div className="flex items-center gap-4 bg-slate-950 border border-slate-800/80 px-4 py-3 rounded-lg text-xs font-mono-num shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 font-sans block">Paper Portfolio</span>
              <span className="font-bold text-white text-sm">
                ₹{Math.round(portfolioStats.totalPortfolio).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 font-sans block">Available Cash</span>
              <span className="font-semibold text-slate-300 text-sm">
                ₹{Math.round(playground.availableCash).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 font-sans block">Win Rate</span>
              <span className="font-bold text-emerald-400 text-sm">
                {portfolioStats.winRate}%
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 font-sans block">Realized P&amp;L</span>
              <span className={`font-bold text-sm ${portfolioStats.overallGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioStats.overallGain >= 0 ? '+' : ''}₹{Math.round(portfolioStats.overallGain).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Command & Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTabSection('calls')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTabSection === 'calls'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Today&rsquo;s High-Probability Calls ({calls.length})</span>
          </button>

          <button
            onClick={() => setActiveTabSection('journal')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTabSection === 'journal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paper Trade Journal ({playground.positions.length + playground.closedTrades.length})</span>
          </button>

          <button
            onClick={() => setActiveTabSection('historical_predictions')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTabSection === 'historical_predictions'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Past Predictions &amp; Accuracy</span>
          </button>

          <button
            onClick={() => setActiveTabSection('monthly_chart')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTabSection === 'monthly_chart'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-300" />
            <span>Performance Charts</span>
          </button>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoPilotExecute}
            disabled={isAutoEvaluating}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            title="Automatically open paper trades for today's top proven strategy signals"
          >
            <Bot className="w-3.5 h-3.5 text-white" />
            <span>Auto-Pilot Ingest</span>
          </button>

          <button
            onClick={() => {
              setBacktestTargetSymbol(calls[0]?.symbol || 'CYIENT.NS');
              setIsBacktestModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>1Y Backtest Lab</span>
          </button>

          <button
            onClick={() => setIsStrategyModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>12 Strategies</span>
          </button>

          <button
            onClick={handleTriggerDeepScan}
            disabled={isLoading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Scan Universe</span>
          </button>
        </div>
      </div>

      {/* Filter Row for Calls */}
      {activeTabSection === 'calls' && (
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl">
          <button
            onClick={() => setHorizonFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              horizonFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Calls ({calls.length})
          </button>

          <button
            onClick={() => setHorizonFilter('quick')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              horizonFilter === 'quick'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Sell in 2 to 4 Days</span>
          </button>

          <button
            onClick={() => setHorizonFilter('weekly')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              horizonFilter === 'weekly'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3 h-3 text-indigo-400" />
            <span>Sell in 1 to 2 Weeks</span>
          </button>

          <button
            onClick={() => setHorizonFilter('high_score')}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              horizonFilter === 'high_score'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>High Conviction (&gt;85%)</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. CALLS OF THE DAY VIEW                                  */}
      {/* ======================================================== */}
      {activeTabSection === 'calls' && (
        <div className="space-y-4">
          {/* Nifty 50 Benchmark Market Regime Card */}
          {marketRegime && (
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
              marketRegime.isCorrection 
                ? 'bg-rose-950/30 border-rose-800/80 text-rose-200' 
                : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                  marketRegime.isCorrection ? 'bg-rose-900/50 text-rose-300' : 'bg-emerald-900/50 text-emerald-300'
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-white">
                    <span>NIFTY 50 REGIME: {marketRegime.status}</span>
                    <span className="font-mono-num text-[11px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-300">
                      ₹{marketRegime.niftyPrice.toLocaleString('en-IN')} ({marketRegime.nifty5DayReturn >= 0 ? '+' : ''}{marketRegime.nifty5DayReturn}% 5D / {marketRegime.nifty1MonthReturn >= 0 ? '+' : ''}{marketRegime.nifty1MonthReturn}% 1M)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
                    {marketRegime.summary}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block font-sans">Swing Strategy Directive:</span>
                <span className="font-bold text-white font-mono-num">
                  {marketRegime.isCorrection ? '🛡️ Cash Preservation (No Falling Stocks)' : '⚡ Active Swing Trading'}
                </span>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">
                Scanning NSE Stocks with 36 Quantitative Swing Strategies...
              </p>
              <p className="text-xs text-slate-400">
                Enforcing strict anti-falling knife criteria: requiring positive 5D momentum, green sessions, and 20/50/200 DMA alignment
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-rose-950/40 border border-rose-800 rounded-xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
              <div className="text-rose-200 text-xs font-semibold">{error}</div>
              <button
                onClick={() => fetchSwingCalls()}
                className="px-3 py-1 bg-rose-900 text-rose-100 rounded text-xs font-semibold transition-colors"
              >
                Retry Scan
              </button>
            </div>
          )}

          {!isLoading && !error && filteredCalls.length === 0 && (
            <div className="py-16 text-center space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                  <span>0 Qualified Swing Setups Found — Capital Preserved</span>
                </h4>
                <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
                  <strong>Zero Compulsion Rule:</strong> It is not a compulsion to trade or issue calls daily. The scanner only recommends stocks when they strictly meet authentic criteria (Stage 2 Uptrend, volume breakout, 1:2 R:R, and positive Mansfield RS).
                </p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  When no stocks qualify, sitting in 100% cash is the highest-probability trading decision. The 10x auto-scanner will continuously monitor for emerging setups.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredCalls.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCalls.map((call) => {
                return (
                  <div
                    key={call.symbol}
                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group relative overflow-hidden"
                  >
                    {/* Top Call Action Tag */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-extrabold tracking-wide font-mono-num flex items-center gap-1 shadow-sm">
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>{call.action}</span>
                        </span>

                        <span className="text-[11px] font-mono-num font-bold px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-700/80 text-indigo-300">
                          {call.confidenceScore}% Confluence
                        </span>
                      </div>

                      {/* Stock Title */}
                      <div>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => onSelectStockAndGoToData(call.symbol)}
                            className="text-lg font-black text-white hover:text-indigo-400 font-mono-num flex items-center gap-1 transition-colors"
                          >
                            <span>{call.symbol}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          </button>
                          <span className="text-xs text-slate-400 font-medium">
                            {call.sector}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">
                          {call.name}
                        </div>
                      </div>

                      {/* Explicit Buying & Selling Target Box */}
                      <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5 font-mono-num text-xs">
                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                          <span className="text-slate-400 font-sans">Buy Today / Entry:</span>
                          <span className="font-bold text-white text-sm">
                            ₹{call.entryPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                          <span className="text-emerald-400 font-sans font-semibold">
                            Sell at Target 1 (+{call.targetPercent}%):
                          </span>
                          <span className="font-bold text-emerald-400 text-sm">
                            ₹{call.targetPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                          <span className="text-rose-400 font-sans">
                            Stop-Loss (-{call.stopLossPercent}%):
                          </span>
                          <span className="font-semibold text-rose-400">
                            ₹{call.stopLossPrice.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-0.5 text-[11px]">
                          <span className="text-slate-400 font-sans flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Target Horizon:</span>
                          </span>
                          <span className="font-bold text-amber-300">
                            {call.holdingHorizon}
                          </span>
                        </div>
                      </div>

                      {/* Strategy Catalyst Badges */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                          Confluence Triggers:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {call.strategiesMet.map((sm, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700/80 text-slate-300 font-mono-num"
                            >
                              {sm}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row: Add to Playground + AI Audit + Math Proof + Inspect */}
                    <div className="pt-4 mt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAddCallToPlayground(call)}
                        title={`Target Sell Price: ₹${call.targetPrice} (+${call.targetPercent}%) | Stop-Loss: ₹${call.stopLossPrice} (-${call.stopLossPercent}%)`}
                        className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Arm Auto-Execution Trade</span>
                      </button>

                      <button
                        onClick={() => setMathProofTarget({ symbol: call.symbol, name: call.name, mathProof: call.mathProof })}
                        title="Inspect 100% Mathematical Proof of Stop-Loss, Targets & Holding Horizon"
                        className="py-2 px-2.5 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white rounded-xl text-xs font-bold border border-emerald-700/60 transition-all flex items-center justify-center gap-1 shrink-0"
                      >
                        <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Math Proof</span>
                      </button>

                      <button
                        onClick={() => setAiAnalysisTarget({ symbol: call.symbol, name: call.name, currentPrice: call.currentPrice })}
                        title="Run Deep Institutional AI Quantitative Audit"
                        className="py-2 px-2.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-500/40 transition-all flex items-center justify-center gap-1 shrink-0"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        <span>AI Quant</span>
                      </button>

                      <button
                        onClick={() => {
                          setBacktestTargetSymbol(call.symbol);
                          setIsBacktestModalOpen(true);
                        }}
                        title="Run 1-Year Historical Backtest Simulation on this stock"
                        className="py-2 px-2.5 bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-white rounded-xl text-xs font-bold border border-indigo-700/60 transition-all flex items-center justify-center gap-1 shrink-0"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
                        <span>1Y Test</span>
                      </button>

                      <button
                        onClick={() => onSelectStockAndGoToData(call.symbol)}
                        title="View 1-Year Historical Daily Data & Charts"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 shrink-0"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PAPER TRADE JOURNAL VIEW                               */}
      {/* ======================================================== */}
      {activeTabSection === 'journal' && (
        <PaperTradeJournal
          positions={playground.positions}
          closedTrades={playground.closedTrades}
          onAddTrade={handleAddTradeFromJournal}
          onAutoResolvePosition={handleAutoResolvePosition}
          onAutoResolveAll={handleAutoResolveAll}
          onDeleteTrade={handleDeleteTradeFromJournal}
          onResetJournal={handleResetPlayground}
          isAutoEvaluating={isAutoEvaluating}
        />
      )}

      {/* ======================================================== */}
      {/* 3. PERFORMANCE DASHBOARD (RECHARTS CURVES) VIEW          */}
      {/* ======================================================== */}
      {activeTabSection === 'monthly_chart' && (
        <PerformanceDashboard
          closedTrades={playground.closedTrades}
          initialCapital={playground.initialCapital}
          availableCash={playground.availableCash}
          openPositionsCount={playground.positions.length}
          onResetBalance={handleResetPlayground}
        />
      )}

      {/* ======================================================== */}
      {/* 4. HISTORICAL PREDICTIONS & ACCURACY AUDIT VIEW          */}
      {/* ======================================================== */}
      {activeTabSection === 'historical_predictions' && (
        <HistoricalPredictionsView onSelectStockAndGoToData={onSelectStockAndGoToData} />
      )}

      {/* ======================================================== */}
      {/* 3. ACTIVE AUTOMATED PAPER TRADES VIEW                     */}
      {/* ======================================================== */}
      {activeTabSection === 'active_trades' && (
        <div className="space-y-6">
          {/* Dashboard Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-num text-xs">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Total Portfolio Valuation</span>
              <div className="text-xl font-bold text-white">₹{Math.round(portfolioStats.totalPortfolio).toLocaleString('en-IN')}</div>
              <span className={`text-[11px] font-semibold ${portfolioStats.overallGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioStats.overallGain >= 0 ? '+' : ''}₹{Math.round(portfolioStats.overallGain).toLocaleString('en-IN')} ({portfolioStats.overallGainPercent.toFixed(1)}%)
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Available Cash</span>
              <div className="text-xl font-bold text-slate-200">₹{Math.round(playground.availableCash).toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-slate-500 font-sans">Ready for new calls</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Active Position Capital</span>
              <div className="text-xl font-bold text-cyan-300">₹{Math.round(portfolioStats.totalCurrentValue).toLocaleString('en-IN')}</div>
              <span className="text-[11px] text-slate-400 font-sans">{playground.positions.length} open calls</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Automated Watcher</span>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-Exit: ON</span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans">Sells at Target or Stop</span>
            </div>
          </div>

          {/* Active Positions Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Paper Trades ({playground.positions.length})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {playground.positions.length > 0 && (
                  <button
                    onClick={handleAutoResolveAll}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Auto-Resolve All Open Calls</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTabSection('calls')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Add from Daily Calls</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Stock & Strategy</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Current Price</th>
                    <th className="py-2.5 px-3 text-right">Shares & Capital</th>
                    <th className="py-2.5 px-3 text-right">Sell Target</th>
                    <th className="py-2.5 px-3 text-right">Stop Loss</th>
                    <th className="py-2.5 px-3 text-right">Live P&L</th>
                    <th className="py-2.5 px-3 text-center">Auto Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono-num">
                  {playground.positions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                        No active paper trades currently running. Switch to &ldquo;Today&rsquo;s High-Probability Calls&rdquo; to add calls!
                      </td>
                    </tr>
                  ) : (
                    playground.positions.map((pos) => {
                      const isUp = pos.unrealizedPnL >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onSelectStockAndGoToData(pos.symbol)}
                              className="font-bold text-white hover:text-indigo-400 transition-colors text-left"
                            >
                              {pos.symbol}
                            </button>
                            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                              <span className="text-indigo-400">{pos.strategyTag}</span>
                              <span>·</span>
                              <span>{pos.holdingHorizon}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-medium text-slate-200">
                            ₹{pos.entryPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right font-bold text-white">
                            ₹{pos.currentPrice.toFixed(2)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <span className="font-semibold text-slate-100">{pos.quantity} shares</span>
                            <div className="text-[10px] text-slate-400">₹{pos.investedAmount.toLocaleString('en-IN')}</div>
                          </td>

                          <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                            ₹{pos.targetPrice.toFixed(2)}
                            <div className="text-[10px] text-emerald-500/80">+{pos.targetPercent}%</div>
                          </td>

                          <td className="py-3 px-3 text-right text-rose-400 font-semibold">
                            ₹{pos.stopLossPrice.toFixed(2)}
                            <div className="text-[10px] text-rose-500/80">-{pos.stopLossPercent}%</div>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}₹{pos.unrealizedPnL.toFixed(2)}
                            </div>
                            <div className={`text-[10px] font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isUp ? '+' : ''}{pos.unrealizedPnLPercent}%
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                              AUTO-MONITORED
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleAutoResolvePosition(pos.id)}
                                title="Check live price now to auto-execute if target or stop-loss triggered"
                                className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded border border-indigo-600/50 text-[11px] font-sans font-semibold transition-colors flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>Check Live</span>
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
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. REALIZED TRADES LEDGER VIEW                            */}
      {/* ======================================================== */}
      {activeTabSection === 'ledger' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-2">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Auto-Executed Closed Trades Ledger ({playground.closedTrades.length})</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Every trade life-cycle concluded at predicted Target Price or Stop-Loss without manual selling
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetPlayground}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset Balance</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Stock & Strategy</th>
                    <th className="py-2.5 px-3">Entry & Exit Date</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Exit Price</th>
                    <th className="py-2.5 px-3 text-right">Shares</th>
                    <th className="py-2.5 px-3 text-right">Realized P&L</th>
                    <th className="py-2.5 px-3 text-left">Execution Reason</th>
                    <th className="py-2.5 px-3 text-center">Outcome</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono-num">
                  {playground.closedTrades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        No closed paper trades yet. When you add and execute calls from &ldquo;Today&rsquo;s High-Probability Calls&rdquo;, your authentic trade ledger will appear here.
                      </td>
                    </tr>
                  ) : (
                    playground.closedTrades.map((t, idx) => {
                    const isWin = (t.realizedPnL || 0) > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-200">
                          <button
                            onClick={() => onSelectStockAndGoToData(t.symbol)}
                            className="hover:text-indigo-400 transition-colors text-left"
                          >
                            {t.symbol}
                          </button>
                          <div className="text-[10px] text-slate-500 font-sans">{t.strategyTag}</div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          <div>In: {t.entryDate}</div>
                          <div>Out: {t.exitDate || 'N/A'}</div>
                        </td>

                        <td className="py-2.5 px-3 text-right text-slate-300">
                          ₹{t.entryPrice.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          ₹{t.exitPrice?.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {t.quantity}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}₹{t.realizedPnL?.toLocaleString('en-IN')}
                          </span>
                          <div className={`text-[10px] ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isWin ? '+' : ''}{t.realizedPnLPercent}%
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-left text-[11px] font-sans text-slate-300">
                          {t.autoExitReason || (isWin ? 'Target Hit at predicted level' : 'Stop Loss triggered')}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isWin ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {isWin ? 'WIN 🎯' : 'LOSS 🛑'}
                          </span>
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
      )}

      {/* Strategy Knowledge Base Modal */}
      <StrategyLibraryModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
      />

      {/* AI Deep Institutional Audit Modal */}
      <AiAnalysisModal
        isOpen={!!aiAnalysisTarget}
        onClose={() => setAiAnalysisTarget(null)}
        symbol={aiAnalysisTarget?.symbol || null}
        stockName={aiAnalysisTarget?.name}
        currentPrice={aiAnalysisTarget?.currentPrice}
      />

      {/* 100% Mathematical Proof Modal */}
      <MathProofModal
        isOpen={!!mathProofTarget}
        onClose={() => setMathProofTarget(null)}
        symbol={mathProofTarget?.symbol || ''}
        name={mathProofTarget?.name || ''}
        mathProof={mathProofTarget?.mathProof}
      />

      {/* 1-Year Historical Backtest & Strategy Validation Simulator */}
      <BacktestLabModal
        isOpen={isBacktestModalOpen}
        onClose={() => setIsBacktestModalOpen(false)}
        defaultSymbol={backtestTargetSymbol}
      />
    </div>
  );
};
