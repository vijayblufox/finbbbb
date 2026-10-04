import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  BarChart2, 
  Award, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MonthPerformance, PlaygroundPosition } from '../types/playground';

interface MonthlyPnLChartProps {
  closedTrades: PlaygroundPosition[];
  initialCapital: number;
}

export const MonthlyPnLChart: React.FC<MonthlyPnLChartProps> = ({
  closedTrades,
  initialCapital,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group closed trades by month (YYYY-MM)
  const monthData: MonthPerformance[] = React.useMemo(() => {
    if (!closedTrades || closedTrades.length === 0) return [];

    const monthMap = new Map<string, {
      trades: PlaygroundPosition[];
      label: string;
    }>();

    // Sort trades chronologically by exitDate or entryDate
    const sorted = [...closedTrades].sort((a, b) => {
      const dateA = a.exitDate || a.entryDate;
      const dateB = b.exitDate || b.entryDate;
      return dateA.localeCompare(dateB);
    });

    sorted.forEach((trade) => {
      const d = trade.exitDate || trade.entryDate;
      const key = d.slice(0, 7); // e.g. "2026-08"
      const dateObj = new Date(d);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap.has(key)) {
        monthMap.set(key, { trades: [], label });
      }
      monthMap.get(key)!.trades.push(trade);
    });

    let currentEquity = initialCapital;
    const result: MonthPerformance[] = [];

    monthMap.forEach((val, key) => {
      let netProfit = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let wins = 0;
      let losses = 0;

      val.trades.forEach((t) => {
        const pnl = t.realizedPnL || 0;
        netProfit += pnl;
        if (pnl > 0) {
          grossProfit += pnl;
          wins++;
        } else if (pnl < 0) {
          grossLoss += Math.abs(pnl);
          losses++;
        }
      });

      currentEquity += netProfit;
      const totalCount = val.trades.length;
      const winRate = totalCount > 0 ? Math.round((wins / totalCount) * 100) : 0;
      const profitPercentage = ((netProfit / initialCapital) * 100);

      result.push({
        monthKey: key,
        monthLabel: val.label,
        tradesCount: totalCount,
        winsCount: wins,
        lossesCount: losses,
        winRate,
        netProfitLoss: Math.round(netProfit),
        grossProfit: Math.round(grossProfit),
        grossLoss: Math.round(grossLoss),
        profitPercentage: Number(profitPercentage.toFixed(2)),
        cumEquity: Math.round(currentEquity),
      });
    });

    return result;
  }, [closedTrades, initialCapital]);

  // Overall statistics
  const stats = React.useMemo(() => {
    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalNetPnL: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        bestMonth: 'None',
        worstMonth: 'None',
      };
    }

    const wins = closedTrades.filter(t => (t.realizedPnL || 0) > 0);
    const losses = closedTrades.filter(t => (t.realizedPnL || 0) <= 0);

    const totalWinAmount = wins.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + (t.realizedPnL || 0), 0));
    const totalNetPnL = totalWinAmount - totalLossAmount;
    const winRate = Math.round((wins.length / closedTrades.length) * 100);
    const profitFactor = totalLossAmount > 0 ? Number((totalWinAmount / totalLossAmount).toFixed(2)) : 99.9;
    const avgWin = wins.length > 0 ? Math.round(totalWinAmount / wins.length) : 0;
    const avgLoss = losses.length > 0 ? Math.round(totalLossAmount / losses.length) : 0;

    let bestM = monthData[0];
    let worstM = monthData[0];
    monthData.forEach(m => {
      if (!bestM || m.netProfitLoss > bestM.netProfitLoss) bestM = m;
      if (!worstM || m.netProfitLoss < worstM.netProfitLoss) worstM = m;
    });

    return {
      totalTrades: closedTrades.length,
      winRate,
      totalNetPnL: Math.round(totalNetPnL),
      profitFactor,
      avgWin,
      avgLoss,
      bestMonth: bestM ? `${bestM.monthLabel} (+₹${bestM.netProfitLoss.toLocaleString('en-IN')})` : 'N/A',
      worstMonth: worstM ? `${worstM.monthLabel} (${worstM.netProfitLoss < 0 ? '-' : '+'}₹${Math.abs(worstM.netProfitLoss).toLocaleString('en-IN')})` : 'N/A',
    };
  }, [closedTrades, monthData]);

  // Max absolute monthly PnL for scaling chart
  const maxAbsPnL = React.useMemo(() => {
    if (monthData.length === 0) return 10000;
    const values = monthData.map(m => Math.abs(m.netProfitLoss));
    return Math.max(...values, 20000);
  }, [monthData]);

  const activeMonthDetail = selectedMonth 
    ? monthData.find(m => m.monthKey === selectedMonth) 
    : monthData[monthData.length - 1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold tracking-wide font-mono-num flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>AUTOMATED ACCURACY AUDIT</span>
            </span>
            <span className="text-xs text-slate-400">
              Auto-Executed Life-Cycle (Target / Stop-Loss / Horizon)
            </span>
          </div>
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2 mt-1">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <span>Month-Wise Paper Trade Profit & Loss Analytics</span>
          </h3>
        </div>

        {/* Global Accuracy Metric */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Prediction Accuracy</span>
            <span className="text-lg font-black font-mono-num text-emerald-400">
              {stats.winRate}% Win Rate
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block font-sans">Cumulative Net P&L</span>
            <span className={`text-lg font-black font-mono-num ${stats.totalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalNetPnL >= 0 ? '+' : ''}₹{stats.totalNetPnL.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono-num">
        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Closed Trades</span>
          <span className="text-base font-bold text-white">{stats.totalTrades}</span>
          <span className="text-[10px] text-slate-500 block font-sans">Auto-resolved</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Profit Factor</span>
          <span className="text-base font-bold text-indigo-400">{stats.profitFactor}x</span>
          <span className="text-[10px] text-slate-500 block font-sans">Gross Win / Gross Loss</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Avg Win Trade</span>
          <span className="text-base font-bold text-emerald-400">+₹{stats.avgWin.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-500 block font-sans">Per winning call</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Avg Loss Trade</span>
          <span className="text-base font-bold text-rose-400">-₹{stats.avgLoss.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-500 block font-sans">Protected by ATR stop</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Best Month</span>
          <span className="text-xs font-bold text-emerald-300 truncate block">{stats.bestMonth}</span>
          <span className="text-[10px] text-slate-500 block font-sans">Peak momentum</span>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 font-sans block">Capital Return</span>
          <span className={`text-base font-bold ${stats.totalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.totalNetPnL >= 0 ? '+' : ''}{((stats.totalNetPnL / initialCapital) * 100).toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 block font-sans">On ₹10L Capital</span>
        </div>
      </div>

      {/* Visual Month-by-Month Bar & Equity Curve Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Monthly Net P&L (₹) & Win-Rate Track Record</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono-num">
            Click on any month bar to inspect its breakdown
          </span>
        </div>

        {monthData.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
            <p>No month-wise trade history recorded yet.</p>
            <p className="text-slate-400">Click &ldquo;Simulate 6-Month Paper Trades&rdquo; below to test and inspect the historical month-by-month accuracy!</p>
          </div>
        ) : (
          <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 space-y-4">
            {/* Bars Container */}
            <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2 overflow-x-auto">
              {monthData.map((m) => {
                const isProfitable = m.netProfitLoss >= 0;
                const heightPercent = Math.min(100, Math.max(12, (Math.abs(m.netProfitLoss) / maxAbsPnL) * 100));
                const isSelected = selectedMonth === m.monthKey || (!selectedMonth && m === activeMonthDetail);

                return (
                  <button
                    key={m.monthKey}
                    onClick={() => setSelectedMonth(m.monthKey)}
                    className="flex-1 min-w-[50px] max-w-[85px] flex flex-col items-center justify-end h-full group focus:outline-none transition-all"
                  >
                    {/* Value Badge on Hover / Selected */}
                    <div className={`text-[10px] font-mono-num font-bold transition-all mb-1 ${
                      isProfitable ? 'text-emerald-400' : 'text-rose-400'
                    } ${isSelected ? 'opacity-100 scale-105' : 'opacity-70 group-hover:opacity-100'}`}>
                      {isProfitable ? '+' : ''}₹{(m.netProfitLoss / 1000).toFixed(0)}k
                    </div>

                    {/* Bar Pillar */}
                    <div className="w-full h-full flex items-end justify-center">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 relative ${
                          isProfitable
                            ? isSelected
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300'
                              : 'bg-emerald-600/70 hover:bg-emerald-500'
                            : isSelected
                              ? 'bg-gradient-to-t from-rose-600 to-rose-400 shadow-lg shadow-rose-500/30 ring-2 ring-rose-300'
                              : 'bg-rose-600/70 hover:bg-rose-500'
                        }`}
                      >
                        {/* Win Rate Tag inside bar */}
                        <div className="absolute top-1 left-0 right-0 text-center text-[9px] font-mono-num font-black text-slate-950/90 pointer-events-none">
                          {m.winRate}%
                        </div>
                      </div>
                    </div>

                    {/* Month Label */}
                    <div className={`mt-2 text-[10px] font-mono-num truncate w-full text-center transition-colors ${
                      isSelected ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {m.monthLabel.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Month Detailed Breakdown Card */}
            {activeMonthDetail && (
              <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 shrink-0 font-bold font-mono-num">
                    {activeMonthDetail.monthLabel.split(' ')[0]}
                  </div>
                  <div>
                    <h5 className="font-bold text-white flex items-center gap-2">
                      <span>{activeMonthDetail.monthLabel} Performance</span>
                      <span className="text-[10px] font-mono-num px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {activeMonthDetail.winRate}% Win Rate
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      {activeMonthDetail.tradesCount} Automated Trades ({activeMonthDetail.winsCount} Wins / {activeMonthDetail.lossesCount} Losses)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono-num text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Gross Profits</span>
                    <span className="text-emerald-400 font-bold">+₹{activeMonthDetail.grossProfit.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Gross Losses</span>
                    <span className="text-rose-400 font-bold">-₹{activeMonthDetail.grossLoss.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-500 block">Net Profit</span>
                    <span className={`font-black text-sm ${activeMonthDetail.netProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeMonthDetail.netProfitLoss >= 0 ? '+' : ''}₹{activeMonthDetail.netProfitLoss.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
