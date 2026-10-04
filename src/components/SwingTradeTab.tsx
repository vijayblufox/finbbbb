import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Target, 
  ShieldAlert, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Play, 
  RotateCcw, 
  ArrowUpRight, 
  Sparkles, 
  Sliders, 
  Layers, 
  Activity, 
  DollarSign, 
  Wallet,
  Check,
  ChevronRight,
  Info,
  Briefcase,
  XCircle
} from 'lucide-react';
import { StockPayload, StockMeta } from '../types/market';
import { PlaygroundPosition, PlaygroundState } from '../types/playground';
import { analyzeSwingTrade, SwingSignal } from '../utils/swingEngine';

interface SwingTradeTabProps {
  currentStock: StockPayload;
  onSelectStock: (symbol: string) => void;
  availableStocks: StockMeta[];
  watchlist: string[];
}

const STORAGE_KEY = 'nse_swing_playground_v1';
const INITIAL_CAPITAL = 1000000; // 10 Lakh INR

export const SwingTradeTab: React.FC<SwingTradeTabProps> = ({
  currentStock,
  onSelectStock,
  availableStocks,
  watchlist,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'signal' | 'playground' | 'scanner'>('signal');
  const [tradeSharesInput, setTradeSharesInput] = useState<number>(25);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Playground state loaded from localStorage
  const [playground, setPlayground] = useState<PlaygroundState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      initialCapital: INITIAL_CAPITAL,
      availableCash: INITIAL_CAPITAL,
      positions: [],
      closedTrades: [],
      autoTradeEnabled: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(playground));
    } catch (_) {}
  }, [playground]);

  // Compute Swing Signal on currently active stock
  const signal: SwingSignal = useMemo(() => {
    return analyzeSwingTrade(currentStock);
  }, [currentStock]);

  // Update default share quantity based on ATR risk
  useEffect(() => {
    if (signal.recommendedPositionSizeShares) {
      setTradeSharesInput(signal.recommendedPositionSizeShares);
    }
  }, [signal.recommendedPositionSizeShares]);

  // Sync open positions with current stock price if matching
  useEffect(() => {
    if (!currentStock?.meta?.currentPrice) return;
    const currentPrice = currentStock.meta.currentPrice;
    const currentSymbol = currentStock.meta.symbol;

    setPlayground(prev => {
      let hasChanges = false;
      const updatedPositions = prev.positions.map(pos => {
        if (pos.symbol === currentSymbol) {
          const unrealizedPnL = (currentPrice - pos.entryPrice) * pos.quantity;
          const unrealizedPnLPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
          
          let status = pos.status;
          if (currentPrice >= pos.targetPrice) status = 'TARGET_HIT';
          else if (currentPrice <= pos.stopLossPrice) status = 'STOP_LOSS_HIT';
          else status = 'OPEN';

          hasChanges = true;
          return {
            ...pos,
            currentPrice,
            unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
            unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
            status,
          };
        }
        return pos;
      });

      if (!hasChanges) return prev;
      return { ...prev, positions: updatedPositions };
    });
  }, [currentStock]);

  // Add current signal to Playground (Paper Trade)
  const handleAddToPlayground = (sharesToBuy?: number) => {
    const qty = sharesToBuy || tradeSharesInput || 10;
    const totalCost = qty * signal.entryPrice;

    if (totalCost > playground.availableCash) {
      setFeedbackToast(`Insufficient cash! Required ₹${Math.round(totalCost).toLocaleString('en-IN')}, available ₹${Math.round(playground.availableCash).toLocaleString('en-IN')}`);
      setTimeout(() => setFeedbackToast(null), 3000);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newPosition: PlaygroundPosition = {
      id: `${currentStock.meta.symbol}_${Date.now()}`,
      symbol: currentStock.meta.symbol,
      name: currentStock.meta.name,
      side: 'BUY',
      entryDate: todayStr,
      entryPrice: signal.entryPrice,
      quantity: qty,
      investedAmount: Math.round(totalCost),
      currentPrice: signal.entryPrice,
      targetPrice: signal.target1,
      targetPercent: signal.target1Percent,
      stopLossPrice: signal.stopLoss,
      stopLossPercent: signal.stopLossPercent,
      holdingHorizon: signal.expectedHorizon,
      suggestedHoldingDays: signal.suggestedHoldingDays,
      daysHeld: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      status: 'OPEN',
      strategyTag: signal.action,
      confidenceScore: signal.confidenceScore,
    };

    setPlayground(prev => ({
      ...prev,
      availableCash: prev.availableCash - totalCost,
      positions: [newPosition, ...prev.positions],
    }));

    setFeedbackToast(`✓ Added ${qty} shares of ${currentStock.meta.symbol} to Paper Trading Playground!`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Close an active position manually or when target is hit
  const handleClosePosition = (positionId: string) => {
    const pos = playground.positions.find(p => p.id === positionId);
    if (!pos) return;

    const exitPrice = pos.currentPrice;
    const realizedPnL = (exitPrice - pos.entryPrice) * pos.quantity;
    const realizedPnLPercent = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const todayStr = new Date().toISOString().split('T')[0];

    const closedPos: PlaygroundPosition = {
      ...pos,
      exitDate: todayStr,
      exitPrice,
      realizedPnL: Number(realizedPnL.toFixed(2)),
      realizedPnLPercent: Number(realizedPnLPercent.toFixed(2)),
      status: pos.status === 'TARGET_HIT' ? 'TARGET_HIT' : pos.status === 'STOP_LOSS_HIT' ? 'STOP_LOSS_HIT' : 'CLOSED_MANUALLY',
    };

    setPlayground(prev => ({
      ...prev,
      availableCash: prev.availableCash + (pos.quantity * exitPrice),
      positions: prev.positions.filter(p => p.id !== positionId),
      closedTrades: [closedPos, ...prev.closedTrades],
    }));

    setFeedbackToast(`Sold ${pos.quantity} shares of ${pos.symbol} at ₹${exitPrice} (P&L: ${realizedPnL >= 0 ? '+' : ''}₹${Math.round(realizedPnL).toLocaleString('en-IN')})`);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  // Reset Playground capital
  const handleResetPlayground = () => {
    if (confirm('Reset paper trading balance back to ₹10,00,000 and clear all positions?')) {
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

  // Portfolio calculations
  const portfolioStats = useMemo(() => {
    const totalInvestedInPositions = playground.positions.reduce((acc, p) => acc + p.investedAmount, 0);
    const totalCurrentPositionValue = playground.positions.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0);
    const totalUnrealizedPnL = totalCurrentPositionValue - totalInvestedInPositions;
    const totalPortfolioValue = playground.availableCash + totalCurrentPositionValue;
    const totalOverallGain = totalPortfolioValue - playground.initialCapital;
    const totalOverallGainPercent = (totalOverallGain / playground.initialCapital) * 100;

    const winningTrades = playground.closedTrades.filter(t => (t.realizedPnL || 0) > 0);
    const winRate = playground.closedTrades.length > 0
      ? Math.round((winningTrades.length / playground.closedTrades.length) * 100)
      : 0;

    return {
      totalPortfolioValue: Math.round(totalPortfolioValue),
      availableCash: Math.round(playground.availableCash),
      totalCurrentPositionValue: Math.round(totalCurrentPositionValue),
      totalUnrealizedPnL: Math.round(totalUnrealizedPnL),
      totalOverallGain: Math.round(totalOverallGain),
      totalOverallGainPercent: Number(totalOverallGainPercent.toFixed(2)),
      winRate,
      closedCount: playground.closedTrades.length,
      openCount: playground.positions.length,
    };
  }, [playground]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-950 border border-indigo-500 text-indigo-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('signal')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'signal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Active Swing Prediction</span>
          </button>

          <button
            onClick={() => setActiveSubTab('playground')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paper Trading Playground</span>
            {playground.positions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-full font-mono-num">
                {playground.positions.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick balance badge */}
        <div className="flex items-center gap-3 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono-num">
          <span className="text-slate-400 font-sans">Playground Capital:</span>
          <span className="font-bold text-white">₹{portfolioStats.totalPortfolioValue.toLocaleString('en-IN')}</span>
          <span className={`font-semibold ${portfolioStats.totalOverallGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ({portfolioStats.totalOverallGain >= 0 ? '+' : ''}{portfolioStats.totalOverallGainPercent}%)
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. ACTIVE SWING PREDICTION VIEW                          */}
      {/* ======================================================== */}
      {activeSubTab === 'signal' && (
        <div className="space-y-6">
          {/* Main Action Plan Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background watermark */}
            <div className="absolute right-4 top-2 text-indigo-500/5 pointer-events-none select-none text-9xl font-black font-mono-num">
              {signal.verdict.split(' ')[0]}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Column: Verdict & Strategy Description */}
              <div className="space-y-3 max-w-xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide font-mono-num flex items-center gap-1.5 shadow-md ${
                    signal.verdict === 'STRONG BUY'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/50'
                      : signal.verdict === 'BUY'
                      ? 'bg-emerald-700 text-emerald-100'
                      : signal.verdict === 'NEUTRAL'
                      ? 'bg-amber-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>{signal.action}</span>
                  </span>

                  <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 font-mono-num flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{signal.confidenceScore}% Confluence Probability</span>
                  </span>

                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono-num flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{signal.expectedHorizon}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>{currentStock.meta.symbol}</span>
                    <span className="text-sm font-normal text-slate-400">· {currentStock.meta.name}</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {signal.summaryReason}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 font-mono-num pt-1">
                  <span>Regime: <strong className="text-slate-200 font-sans">{signal.marketRegime}</strong></span>
                  <span>·</span>
                  <span>Minervini SEPA: <strong className="text-emerald-400">{signal.minerviniScore.passed}/8 Passed</strong></span>
                  <span>·</span>
                  <span>Stage: <strong className="text-indigo-300">{signal.stage.name.split(':')[0]}</strong></span>
                </div>
              </div>

              {/* Right Column: Execution Targets & "Add to Playground" Button */}
              <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-xl space-y-4 shrink-0 min-w-[320px]">
                <div className="grid grid-cols-3 gap-3 text-center border-b border-slate-800 pb-3 font-mono-num">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Buy / Entry</span>
                    <span className="text-base font-bold text-white">₹{signal.entryPrice}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-emerald-400 block font-sans">Target 1 (+{signal.target1Percent}%)</span>
                    <span className="text-base font-bold text-emerald-400">₹{signal.target1}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-rose-400 block font-sans">Stop-Loss (-{signal.stopLossPercent}%)</span>
                    <span className="text-base font-bold text-rose-400">₹{signal.stopLoss}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono-num text-slate-300">
                  <span className="text-slate-400">Risk-to-Reward Ratio:</span>
                  <span className="font-bold text-emerald-300">1 : {signal.riskRewardRatio}</span>
                </div>

                {/* Add to Playground Action Row */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-num">
                      <span className="text-slate-400 text-[11px] font-sans">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={tradeSharesInput}
                        onChange={(e) => setTradeSharesInput(Math.max(1, Number(e.target.value)))}
                        className="w-16 bg-transparent text-white font-bold focus:outline-none text-xs"
                      />
                      <span className="text-[11px] text-slate-400 ml-auto">
                        (₹{(tradeSharesInput * signal.entryPrice).toLocaleString('en-IN')})
                      </span>
                    </div>

                    <button
                      onClick={() => handleAddToPlayground()}
                      disabled={signal.action === 'SELL / AVOID'}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Add to Playground</span>
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block text-center">
                    Execute risk-free paper trade to test this prediction with ₹10L virtual capital.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Matrix & Criteria Breakdown (All 10 Dimensions) */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Multi-Strategy Confluence Analysis (36 Quant Rules)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {signal.strategiesTriggered.map((strat, idx) => {
                const isBull = strat.signal === 'BULLISH';
                const isBear = strat.signal === 'BEARISH';

                return (
                  <div 
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                      isBull
                        ? 'bg-slate-900/90 border-emerald-500/30 shadow-sm'
                        : isBear
                        ? 'bg-slate-900/60 border-rose-500/30'
                        : 'bg-slate-900/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-bold text-slate-200 leading-tight">
                        {strat.name}
                      </span>
                      <span className={`text-[10px] font-mono-num font-bold px-1.5 py-0.5 rounded ${
                        isBull
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isBear
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {strat.signal}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-normal">
                      {strat.description}
                    </p>

                    {strat.valueDisplay && (
                      <div className="text-[11px] font-mono-num text-indigo-300 font-semibold pt-1 border-t border-slate-800/80">
                        {strat.valueDisplay}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Minervini SEPA 8-Step Checklist & Weinstein Stage Box */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Minervini Checklist */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Mark Minervini SEPA Trend Template</span>
                </h4>
                <span className="text-xs font-mono-num font-bold text-emerald-400">
                  {signal.minerviniScore.passed} / {signal.minerviniScore.total} Conditions Met
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-num">
                {signal.minerviniScore.criteria.map((c, i) => (
                  <div 
                    key={i} 
                    className={`p-2 rounded-lg border flex items-center gap-2 ${
                      c.passed
                        ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    {c.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="text-[11px] leading-tight font-sans">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weinstein Stage & ATR Sizing */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Weinstein Stage & ATR Position Sizing</span>
                </h4>
                <span className="text-xs font-mono-num font-bold text-cyan-300">
                  {signal.stage.name.split(':')[0]}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="font-semibold text-slate-200">{signal.stage.name}</div>
                <p className="text-slate-400 text-[11px] leading-normal">{signal.stage.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono-num text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">14-Day ATR</span>
                  <span className="font-bold text-white">₹{signal.atr}</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">Recommended Size</span>
                  <span className="font-bold text-indigo-400">{signal.recommendedPositionSizeShares} shares</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">1% Risk Amount</span>
                  <span className="font-bold text-slate-200">₹1,000 / trade</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PAPER TRADING PLAYGROUND VIEW                         */}
      {/* ======================================================== */}
      {activeSubTab === 'playground' && (
        <div className="space-y-6">
          {/* Playground Capital & Performance Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Total Portfolio Value</span>
              <div className="text-lg font-bold font-mono-num text-white">
                ₹{portfolioStats.totalPortfolioValue.toLocaleString('en-IN')}
              </div>
              <span className={`text-[11px] font-mono-num font-semibold ${portfolioStats.totalOverallGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioStats.totalOverallGain >= 0 ? '+' : ''}₹{portfolioStats.totalOverallGain.toLocaleString('en-IN')} ({portfolioStats.totalOverallGainPercent}%)
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Available Cash</span>
              <div className="text-lg font-bold font-mono-num text-slate-100">
                ₹{portfolioStats.availableCash.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500 font-mono-num">Ready to deploy</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Active Positions Value</span>
              <div className="text-lg font-bold font-mono-num text-cyan-300">
                ₹{portfolioStats.totalCurrentPositionValue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 font-mono-num">{portfolioStats.openCount} open trades</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Unrealized P&L</span>
              <div className={`text-lg font-bold font-mono-num ${portfolioStats.totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioStats.totalUnrealizedPnL >= 0 ? '+' : ''}₹{portfolioStats.totalUnrealizedPnL.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-400 font-mono-num">Live mark-to-market</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] text-slate-400 font-sans block">Win Rate</span>
              <div className="text-lg font-bold font-mono-num text-amber-400">
                {portfolioStats.winRate}%
              </div>
              <span className="text-[11px] text-slate-400 font-mono-num">{portfolioStats.closedCount} completed trades</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-sans block">Actions</span>
              <button
                onClick={handleResetPlayground}
                className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Balance</span>
              </button>
            </div>
          </div>

          {/* Active Open Positions Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-2">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Paper Positions ({playground.positions.length})
                </h4>
              </div>

              <button
                onClick={() => handleAddToPlayground()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Add {currentStock.meta.symbol}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Stock & Strategy</th>
                    <th className="py-2.5 px-3 text-right">Entry Price</th>
                    <th className="py-2.5 px-3 text-right">Current Price</th>
                    <th className="py-2.5 px-3 text-right">Qty & Cost</th>
                    <th className="py-2.5 px-3 text-right">Target 1</th>
                    <th className="py-2.5 px-3 text-right">Stop Loss</th>
                    <th className="py-2.5 px-3 text-right">P&L (₹ & %)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono-num">
                  {playground.positions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                        No active paper trades in your playground. Click &ldquo;Add to Playground&rdquo; on any swing signal to start testing!
                      </td>
                    </tr>
                  ) : (
                    playground.positions.map((pos) => {
                      const isUp = pos.unrealizedPnL >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => onSelectStock(pos.symbol)}
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
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pos.status === 'TARGET_HIT'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse'
                                : pos.status === 'STOP_LOSS_HIT'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {pos.status === 'TARGET_HIT' ? 'TARGET REACHED 🎯' : pos.status === 'STOP_LOSS_HIT' ? 'STOPPED OUT 🛑' : 'ACTIVE'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 rounded border border-slate-700 text-[11px] font-sans transition-colors"
                            >
                              Exit / Sell
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

          {/* Closed Trades History Ledger */}
          {playground.closedTrades.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-2">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Paper Trading Realized Ledger ({playground.closedTrades.length})
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3 text-right">Entry Price</th>
                      <th className="py-2.5 px-3 text-right">Exit Price</th>
                      <th className="py-2.5 px-3 text-right">Shares</th>
                      <th className="py-2.5 px-3 text-right">Realized Profit / Loss</th>
                      <th className="py-2.5 px-3 text-center">Outcome</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/60 font-mono-num">
                    {playground.closedTrades.map((t, idx) => {
                      const isWin = (t.realizedPnL || 0) > 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-200">
                            {t.symbol}
                            <div className="text-[10px] text-slate-500 font-sans">{t.strategyTag}</div>
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

                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isWin ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {isWin ? 'WIN ✓' : 'LOSS ✕'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
