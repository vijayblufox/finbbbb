import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldAlert, 
  Calendar, 
  Percent, 
  BarChart, 
  Award,
  Zap,
  Target
} from 'lucide-react';
import { StockPayload } from '../types/market';

interface PerformanceStatsProps {
  stockData: StockPayload;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ stockData }) => {
  const { meta, bars } = stockData;

  const advancedStats = useMemo(() => {
    if (bars.length === 0) return null;

    const firstPrice = bars[0].close;
    const lastPrice = bars[bars.length - 1].close;
    const absoluteGain = Number((lastPrice - firstPrice).toFixed(2));

    // 52-Week Range Position %
    const range = meta.high52w - meta.low52w || 1;
    const rangePositionPercent = Math.min(100, Math.max(0, ((meta.currentPrice - meta.low52w) / range) * 100));

    // Streaks
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLoseStreak = 0;
    let tempWin = 0;
    let tempLose = 0;

    bars.forEach(b => {
      if (b.change > 0) {
        tempWin++;
        tempLose = 0;
        if (tempWin > maxWinStreak) maxWinStreak = tempWin;
      } else if (b.change < 0) {
        tempLose++;
        tempWin = 0;
        if (tempLose > maxLoseStreak) maxLoseStreak = tempLose;
      } else {
        tempWin = 0;
        tempLose = 0;
      }
    });

    // Turnover estimate (Price * Volume)
    const avgTurnover = Math.round(
      bars.reduce((acc, b) => acc + (b.close * b.volume), 0) / (bars.length || 1)
    );

    // Format turnover in Crores (1 Cr = 10,000,000 INR)
    const turnoverCr = (avgTurnover / 10000000).toFixed(2);

    return {
      absoluteGain,
      rangePositionPercent,
      maxWinStreak,
      maxLoseStreak,
      turnoverCr,
      firstPrice,
      lastPrice,
    };
  }, [bars, meta]);

  if (!advancedStats) return null;

  return (
    <div className="space-y-6">
      {/* 52-Week Range Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              52-Week Range & Price Positioning
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Current market price relative to the 52-week lowest and highest recorded trades
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono-num text-slate-400">Position in Range: </span>
            <span className="text-xs font-bold font-mono-num text-indigo-400">
              {advancedStats.rangePositionPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Visual Slider Bar */}
        <div className="space-y-2">
          <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-80"
              style={{ width: '100%' }}
            />
            {/* Current Price Pin */}
            <div 
              className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] rounded"
              style={{ left: `${advancedStats.rangePositionPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-mono-num">
            <div className="text-left">
              <span className="text-slate-400 block text-[11px]">52-Week Low</span>
              <span className="font-bold text-rose-400">₹{meta.low52w.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-center">
              <span className="text-slate-400 block text-[11px]">Current Market Price</span>
              <span className="font-bold text-white text-sm">₹{meta.currentPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">52-Week High</span>
              <span className="font-bold text-emerald-400">₹{meta.high52w.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1Y Return */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>1-Year Return</span>
            <Percent className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono-num ${meta.totalReturn1Y >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {meta.totalReturn1Y >= 0 ? '+' : ''}{meta.totalReturn1Y.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            {advancedStats.absoluteGain >= 0 ? '+' : ''}₹{advancedStats.absoluteGain.toLocaleString('en-IN')} / share
          </div>
        </div>

        {/* Volatility */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Annualized Volatility</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-num text-white">
              {meta.annualizedVolatility.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Standard deviation of daily log returns * √252
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Maximum Drawdown</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-num text-rose-400">
              -{meta.maxDrawdown.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Deepest peak-to-trough drop in 1 year
          </div>
        </div>

        {/* Average Daily Turnover */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Daily Turnover</span>
            <BarChart className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-num text-white">
              ₹{advancedStats.turnoverCr} Cr
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono-num">
            {meta.averageDailyVolume.toLocaleString('en-IN')} shares / day
          </div>
        </div>
      </div>

      {/* Detailed Behavioral Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Historical Session Behavioral Dynamics
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono-num">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Trading Session Win Rate</span>
            <span className="font-bold text-emerald-400">
              {((meta.upDays / meta.tradingDaysCount) * 100).toFixed(1)}% ({meta.upDays} / {meta.tradingDaysCount} days)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Longest Winning Streak</span>
            <span className="font-bold text-emerald-300">
              {advancedStats.maxWinStreak} consecutive days
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Longest Losing Streak</span>
            <span className="font-bold text-rose-300">
              {advancedStats.maxLoseStreak} consecutive days
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Starting Candle (1Y Ago)</span>
            <span className="font-bold text-slate-200">
              {meta.firstTradingDate} (₹{advancedStats.firstPrice})
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Ending Candle (Latest)</span>
            <span className="font-bold text-slate-200">
              {meta.lastTradingDate} (₹{advancedStats.lastPrice})
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-sans">Index & Sector</span>
            <span className="font-semibold text-indigo-300 font-sans">
              {meta.index} · {meta.sector}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
