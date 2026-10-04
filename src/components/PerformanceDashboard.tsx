import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  ShieldCheck, 
  Calendar, 
  BarChart2, 
  Wallet, 
  Sparkles,
  RotateCcw,
  Activity,
  AlertCircle
} from 'lucide-react';
import { PlaygroundPosition } from '../types/playground';

interface PerformanceDashboardProps {
  closedTrades: PlaygroundPosition[];
  initialCapital: number;
  availableCash: number;
  openPositionsCount: number;
  onResetBalance?: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  closedTrades,
  initialCapital,
  availableCash,
  openPositionsCount,
  onResetBalance,
}) => {
  // Toggle: 'portfolio_value' vs 'cumulative_gains'
  const [curveMode, setCurveMode] = useState<'portfolio_value' | 'cumulative_gains'>('portfolio_value');
  const [chartType, setChartType] = useState<'area' | 'composed'>('area');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Group closed trades strictly by actual exit month (YYYY-MM)
  const monthlyData = useMemo(() => {
    if (!closedTrades || closedTrades.length === 0) return [];

    const monthMap = new Map<string, {
      trades: PlaygroundPosition[];
      label: string;
      year: number;
      monthIndex: number;
    }>();

    // Sort chronologically by actual execution date
    const sorted = [...closedTrades].sort((a, b) => {
      const dateA = a.exitDate || a.entryDate;
      const dateB = b.exitDate || b.entryDate;
      return dateA.localeCompare(dateB);
    });

    sorted.forEach((trade) => {
      const d = trade.exitDate || trade.entryDate;
      const key = d.slice(0, 7); // e.g. "2026-09"
      const dateObj = new Date(d);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      if (!monthMap.has(key)) {
        monthMap.set(key, { 
          trades: [], 
          label,
          year: dateObj.getFullYear(),
          monthIndex: dateObj.getMonth(),
        });
      }
      monthMap.get(key)!.trades.push(trade);
    });

    let runningEquity = initialCapital;
    let runningCumulativeGains = 0;
    let peakEquity = initialCapital;

    const dataPoints: Array<{
      monthKey: string;
      monthLabel: string;
      netPnL: number;
      grossProfit: number;
      grossLoss: number;
      tradesCount: number;
      winsCount: number;
      lossesCount: number;
      winRate: number;
      portfolioValue: number;
      cumulativeGains: number;
      drawdownPercent: number;
      returnPercent: number;
    }> = [];

    // Base point at start of period
    dataPoints.push({
      monthKey: 'Start',
      monthLabel: 'Start',
      netPnL: 0,
      grossProfit: 0,
      grossLoss: 0,
      tradesCount: 0,
      winsCount: 0,
      lossesCount: 0,
      winRate: 0,
      portfolioValue: initialCapital,
      cumulativeGains: 0,
      drawdownPercent: 0,
      returnPercent: 0,
    });

    monthMap.forEach((val, key) => {
      let net = 0;
      let grossProfit = 0;
      let grossLoss = 0;
      let wins = 0;
      let losses = 0;

      val.trades.forEach((t) => {
        const pnl = t.realizedPnL || 0;
        net += pnl;
        if (pnl > 0) {
          grossProfit += pnl;
          wins++;
        } else if (pnl < 0) {
          grossLoss += Math.abs(pnl);
          losses++;
        }
      });

      runningEquity += net;
      runningCumulativeGains += net;
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      const drawdownPercent = peakEquity > 0 
        ? Number((((peakEquity - runningEquity) / peakEquity) * 100).toFixed(2)) 
        : 0;

      const totalCount = val.trades.length;
      const winRate = totalCount > 0 ? Math.round((wins / totalCount) * 100) : 0;
      const returnPercent = Number((((runningEquity - initialCapital) / initialCapital) * 100).toFixed(2));

      dataPoints.push({
        monthKey: key,
        monthLabel: val.label,
        netPnL: Math.round(net),
        grossProfit: Math.round(grossProfit),
        grossLoss: Math.round(grossLoss),
        tradesCount: totalCount,
        winsCount: wins,
        lossesCount: losses,
        winRate,
        portfolioValue: Math.round(runningEquity),
        cumulativeGains: Math.round(runningCumulativeGains),
        drawdownPercent,
        returnPercent,
      });
    });

    return dataPoints;
  }, [closedTrades, initialCapital]);

  // Overall KPIs strictly based on actual executed trades
  const kpis = useMemo(() => {
    if (!closedTrades || closedTrades.length === 0) {
      return {
        totalClosed: 0,
        winRate: 0,
        totalNetPnL: 0,
        totalReturnPercent: 0,
        finalPortfolioValue: initialCapital,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        maxDrawdown: 0,
        bestMonth: 'None',
      };
    }

    const wins = closedTrades.filter(t => (t.realizedPnL || 0) > 0);
    const losses = closedTrades.filter(t => (t.realizedPnL || 0) <= 0);

    const grossWinsTotal = wins.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    const grossLossesTotal = Math.abs(losses.reduce((sum, t) => sum + (t.realizedPnL || 0), 0));
    const totalNetPnL = grossWinsTotal - grossLossesTotal;
    const finalPortfolioValue = initialCapital + totalNetPnL;
    const totalReturnPercent = Number(((totalNetPnL / initialCapital) * 100).toFixed(2));
    const winRate = Math.round((wins.length / closedTrades.length) * 100);
    const profitFactor = grossLossesTotal > 0 ? Number((grossWinsTotal / grossLossesTotal).toFixed(2)) : (grossWinsTotal > 0 ? 99.9 : 0);
    const avgWin = wins.length > 0 ? Math.round(grossWinsTotal / wins.length) : 0;
    const avgLoss = losses.length > 0 ? Math.round(grossLossesTotal / losses.length) : 0;

    const ddValues = monthlyData.map(m => m.drawdownPercent);
    const maxDrawdown = ddValues.length > 0 ? Math.max(...ddValues) : 0;

    let bestM = monthlyData.slice(1)[0];
    monthlyData.slice(1).forEach(m => {
      if (!bestM || m.netPnL > bestM.netPnL) bestM = m;
    });

    return {
      totalClosed: closedTrades.length,
      winRate,
      totalNetPnL: Math.round(totalNetPnL),
      totalReturnPercent,
      finalPortfolioValue: Math.round(finalPortfolioValue),
      profitFactor,
      avgWin,
      avgLoss,
      maxDrawdown,
      bestMonth: bestM ? `${bestM.monthLabel} (+₹${bestM.netPnL.toLocaleString('en-IN')})` : 'N/A',
    };
  }, [closedTrades, initialCapital, monthlyData]);

  // Selected Month Details
  const selectedDetail = useMemo(() => {
    if (!selectedMonthKey || monthlyData.length <= 1) return null;
    return monthlyData.find(m => m.monthKey === selectedMonthKey) || monthlyData[monthlyData.length - 1];
  }, [selectedMonthKey, monthlyData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.monthKey === 'Start') return null;

      return (
        <div className="bg-slate-950/95 border border-indigo-500/40 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold text-white">
            <span>{data.monthLabel} Report</span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              {data.winRate}% Win Rate
            </span>
          </div>

          <div className="space-y-1 font-mono-num">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Portfolio:</span>
              <span className="font-bold text-white">₹{data.portfolioValue.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Cumulative Gains:</span>
              <span className={`font-bold ${data.cumulativeGains >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.cumulativeGains >= 0 ? '+' : ''}₹{data.cumulativeGains.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Monthly Net P&L:</span>
              <span className={`font-bold ${data.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.netPnL >= 0 ? '+' : ''}₹{data.netPnL.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Trades Executed:</span>
              <span className="text-slate-200">{data.tradesCount} ({data.winsCount}W / {data.lossesCount}L)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Performance Dashboard Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold tracking-wide font-mono-num flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>AUTHENTIC AUDIT (ZERO MOCK DATA)</span>
              </span>
              <span className="text-xs text-slate-400">
                100% Real Executed Paper Trades Only
              </span>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-400" />
              <span>Paper Trading Performance Dashboard</span>
            </h3>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time audit of your paper trading performance. Every curve, win-rate, and profit metric strictly derives from the trades <strong>you execute</strong>.
            </p>
          </div>

          {/* Balance Reset Tool */}
          {onResetBalance && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onResetBalance}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
              >
                <span>Reset Account to ₹10L</span>
              </button>
            </div>
          )}
        </div>

        {/* 6 Real KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono-num pt-2">
          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Total Portfolio Value</span>
            <div className="text-lg font-bold text-white">
              ₹{kpis.finalPortfolioValue.toLocaleString('en-IN')}
            </div>
            <span className={`text-[11px] font-semibold ${kpis.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.totalReturnPercent >= 0 ? '+' : ''}{kpis.totalReturnPercent}% Return
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Cumulative Net Gains</span>
            <div className={`text-lg font-bold ${kpis.totalNetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.totalNetPnL >= 0 ? '+' : ''}₹{kpis.totalNetPnL.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Starting from ₹10L</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Prediction Accuracy</span>
            <div className="text-lg font-bold text-emerald-400">
              {kpis.totalClosed > 0 ? `${kpis.winRate}% Win Rate` : 'N/A (0 Trades)'}
            </div>
            <span className="text-[10px] text-slate-400 font-sans">{kpis.totalClosed} closed trades</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Profit Factor</span>
            <div className="text-lg font-bold text-indigo-400">
              {kpis.totalClosed > 0 ? `${kpis.profitFactor}x` : 'N/A'}
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Gross Win / Gross Loss</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Avg Win / Avg Loss</span>
            <div className="text-xs font-bold text-slate-200">
              <span className="text-emerald-400">+₹{kpis.avgWin.toLocaleString('en-IN')}</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-rose-400">-₹{kpis.avgLoss.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Realized R:R Ratio</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 p-3.5 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 font-sans block">Max Drawdown</span>
            <div className="text-lg font-bold text-amber-400">
              {kpis.maxDrawdown}%
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Peak-to-trough control</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>
                {curveMode === 'portfolio_value' 
                  ? 'Total Portfolio Value Growth Curve (₹)' 
                  : 'Cumulative Monthly Paper Trade Gains Curve (₹)'}
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              {curveMode === 'portfolio_value'
                ? 'Shows starting capital ₹10,00,000 evolving as trades are closed.'
                : 'Shows net cumulative profit added to virtual account as trades are closed.'}
            </p>
          </div>

          {/* User Requested Toggle: Switch between 'Total Portfolio Value' and 'Cumulative Monthly Gains' */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => setCurveMode('portfolio_value')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  curveMode === 'portfolio_value'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Total Portfolio Value</span>
              </button>

              <button
                onClick={() => setCurveMode('cumulative_gains')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  curveMode === 'cumulative_gains'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Cumulative Monthly Gains</span>
              </button>
            </div>

            {/* Chart Style Toggle: Area vs Composed */}
            {monthlyData.length > 1 && (
              <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartType === 'area' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('composed')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartType === 'composed' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Bars + Line
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recharts Container */}
        {monthlyData.length <= 1 ? (
          <div className="py-20 text-center space-y-3 bg-slate-950/60 rounded-xl border border-slate-800/80 p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-white">No Executed Trades Yet</h5>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No mock data is generated. Your real performance curve will appear here once you add calls from <strong>&ldquo;Today&rsquo;s High-Probability Calls&rdquo;</strong> to your playground and execute them.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 10, right: 20, left: 15, bottom: 10 }}
                  onClick={(e: any) => {
                    const payload = e?.activePayload;
                    if (payload && payload.length) {
                      setSelectedMonthKey(payload[0].payload.monthKey);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gainsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    domain={curveMode === 'portfolio_value' ? [initialCapital * 0.95, 'auto'] : [0, 'auto']}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <Tooltip content={<CustomTooltip />} />

                  {curveMode === 'portfolio_value' ? (
                    <>
                      <ReferenceLine 
                        y={initialCapital} 
                        stroke="#64748b" 
                        strokeDasharray="4 4" 
                        label={{ value: '₹10L Starting Capital', fill: '#64748b', fontSize: 10, position: 'insideBottomRight' }} 
                      />
                      <Area
                        type="monotone"
                        dataKey="portfolioValue"
                        name="Total Portfolio Value"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#portfolioGradient)"
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 7, fill: '#818cf8', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </>
                  ) : (
                    <>
                      <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                      <Area
                        type="monotone"
                        dataKey="cumulativeGains"
                        name="Cumulative Monthly Gains"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#gainsGradient)"
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 7, fill: '#34d399', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </>
                  )}
                </AreaChart>
              ) : (
                <ComposedChart
                  data={monthlyData.slice(1)} // skip initial start point for composed
                  margin={{ top: 10, right: 20, left: 15, bottom: 10 }}
                  onClick={(e: any) => {
                    const payload = e?.activePayload;
                    if (payload && payload.length) {
                      setSelectedMonthKey(payload[0].payload.monthKey);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="monthLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                  <Bar dataKey="netPnL" name="Monthly Net P&L (₹)" radius={[4, 4, 0, 0]}>
                    {monthlyData.slice(1).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.netPnL >= 0 ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>

                  <Line
                    type="monotone"
                    dataKey={curveMode === 'portfolio_value' ? 'portfolioValue' : 'cumulativeGains'}
                    name={curveMode === 'portfolio_value' ? 'Total Portfolio (₹)' : 'Cumulative Gains (₹)'}
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#818cf8' }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Selected Month Detailed Breakdown */}
        {selectedDetail && selectedDetail.monthKey !== 'Start' && (
          <div className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono-num">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-300 font-bold shrink-0">
                {selectedDetail.monthLabel.split(' ')[0]}
              </div>
              <div>
                <h5 className="font-bold text-white flex items-center gap-2">
                  <span>{selectedDetail.monthLabel} Detailed Audit</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {selectedDetail.winRate}% Win Rate
                  </span>
                </h5>
                <span className="text-slate-400 font-sans text-[11px]">
                  {selectedDetail.tradesCount} executed calls ({selectedDetail.winsCount} Wins, {selectedDetail.lossesCount} Losses)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Monthly Net P&L</span>
                <span className={`font-bold ${selectedDetail.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedDetail.netPnL >= 0 ? '+' : ''}₹{selectedDetail.netPnL.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Portfolio Milestone</span>
                <span className="font-bold text-white">
                  ₹{selectedDetail.portfolioValue.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block font-sans">Cumulative Return</span>
                <span className="font-bold text-indigo-300">
                  +{selectedDetail.returnPercent}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Real Executed Months Table */}
      {monthlyData.length > 1 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Real Executed Trades Monthly Ledger</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono-num">
              {monthlyData.length - 1} Months with Trades
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3 text-right">Trades Executed</th>
                  <th className="py-2.5 px-3 text-right">Win Rate</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Gross Loss</th>
                  <th className="py-2.5 px-3 text-right">Net Profit / Loss</th>
                  <th className="py-2.5 px-3 text-right">Ending Portfolio Value</th>
                  <th className="py-2.5 px-3 text-right">Cumulative Gain</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60 font-mono-num">
                {monthlyData.slice(1).map((m) => {
                  const isProfitable = m.netPnL >= 0;
                  return (
                    <tr 
                      key={m.monthKey} 
                      onClick={() => setSelectedMonthKey(m.monthKey)}
                      className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        selectedMonthKey === m.monthKey ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{m.monthLabel}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {m.tradesCount} <span className="text-[10px] text-slate-500">({m.winsCount}W / {m.lossesCount}L)</span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-emerald-400">{m.winRate}%</span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-emerald-400">
                        +₹{m.grossProfit.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 text-right text-rose-400">
                        -₹{m.grossLoss.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                          {isProfitable ? '+' : ''}₹{m.netPnL.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        ₹{m.portfolioValue.toLocaleString('en-IN')}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-indigo-300">
                        +{m.returnPercent}%
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
  );
};
