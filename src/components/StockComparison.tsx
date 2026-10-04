import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare, 
  Plus, 
  X, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ComparisonDataset, StockMeta } from '../types/market';

interface StockComparisonProps {
  currentSymbol: string;
  availableStocks: StockMeta[];
  onSelectMainSymbol: (symbol: string) => void;
}

const PALETTE = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#a855f7', // Purple
];

export const StockComparison: React.FC<StockComparisonProps> = ({
  currentSymbol,
  availableStocks,
  onSelectMainSymbol,
}) => {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    currentSymbol,
    'TCS.NS',
    'HDFCBANK.NS',
    '^NSEI',
  ]);
  const [comparisonData, setComparisonData] = useState<ComparisonDataset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [hoverDateIndex, setHoverDateIndex] = useState<number | null>(null);

  // Fetch comparison data whenever selected symbols change
  useEffect(() => {
    let isCancelled = false;
    const loadComparison = async () => {
      if (selectedSymbols.length === 0) {
        setComparisonData([]);
        return;
      }
      setIsLoading(true);
      try {
        const query = selectedSymbols.join(',');
        const res = await fetch(`/api/compare?symbols=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch comparison');
        const data = await res.json();
        if (!isCancelled) {
          setComparisonData(data.comparison || []);
        }
      } catch (err) {
        console.error('Comparison load error:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    loadComparison();
    return () => { isCancelled = true; };
  }, [selectedSymbols]);

  const handleAddSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    const formatted = clean.startsWith('^') || clean.endsWith('.NS') || clean.endsWith('.BO') ? clean : `${clean}.NS`;
    if (!selectedSymbols.includes(formatted) && selectedSymbols.length < 6) {
      setSelectedSymbols([...selectedSymbols, formatted]);
    }
    setNewSymbolInput('');
  };

  const handleRemoveSymbol = (sym: string) => {
    if (selectedSymbols.length > 1) {
      setSelectedSymbols(selectedSymbols.filter(s => s !== sym));
    }
  };

  // Min and Max return % for chart axis
  const { minReturn, maxReturn, commonDatesCount } = useMemo(() => {
    if (comparisonData.length === 0) return { minReturn: -10, maxReturn: 10, commonDatesCount: 0 };
    let min = 0;
    let max = 0;
    let maxLen = 0;

    comparisonData.forEach(d => {
      if (d.normalizedBars.length > maxLen) maxLen = d.normalizedBars.length;
      d.normalizedBars.forEach(b => {
        if (b.returnPercent < min) min = b.returnPercent;
        if (b.returnPercent > max) max = b.returnPercent;
      });
    });

    const spread = max - min || 10;
    return {
      minReturn: min - spread * 0.05,
      maxReturn: max + spread * 0.05,
      commonDatesCount: maxLen,
    };
  }, [comparisonData]);

  // SVG Chart Setup
  const svgWidth = 900;
  const svgHeight = 320;
  const padding = { top: 25, right: 60, bottom: 25, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const getY = (ret: number) => {
    const range = maxReturn - minReturn || 1;
    return padding.top + (1 - (ret - minReturn) / range) * chartH;
  };

  const zeroY = getY(0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-indigo-400" />
              1-Year Relative Performance Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Normalize starting price to 0% to directly benchmark NSE stocks against each other and Nifty 50.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Presets:</span>
            <button
              onClick={() => setSelectedSymbols(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', '^NSEI'])}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px]"
            >
              Nifty Leaders
            </button>
            <button
              onClick={() => setSelectedSymbols(['TCS.NS', 'INFY.NS', 'HCLTECH.NS', 'WIPRO.NS'])}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px]"
            >
              Top IT Giants
            </button>
            <button
              onClick={() => setSelectedSymbols(['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS'])}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-[11px]"
            >
              Banking Titans
            </button>
          </div>
        </div>

        {/* Selected Stock Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedSymbols.map((sym, index) => {
            const color = PALETTE[index % PALETTE.length];
            return (
              <div
                key={sym}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-num"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <button
                  onClick={() => onSelectMainSymbol(sym)}
                  className="font-bold text-slate-200 hover:text-white"
                  title="View detailed 1-year table for this stock"
                >
                  {sym}
                </button>
                {selectedSymbols.length > 1 && (
                  <button
                    onClick={() => handleRemoveSymbol(sym)}
                    className="p-0.5 hover:text-rose-400 text-slate-400 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Stock Input */}
          {selectedSymbols.length < 6 && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Add NSE symbol..."
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSymbolInput.trim()) {
                    handleAddSymbol(newSymbolInput);
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 w-32 focus:outline-none focus:border-indigo-500 font-mono-num"
              />
              <button
                onClick={() => newSymbolInput.trim() && handleAddSymbol(newSymbolInput)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Chart Canvas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">Computing comparative normalized 1-year returns...</span>
          </div>
        ) : comparisonData.length === 0 ? (
          <div className="py-24 text-center text-slate-500 text-xs">
            No stock comparison data available.
          </div>
        ) : (
          <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto block select-none">
              {/* Grid Lines */}
              {[-30, -20, -10, 0, 10, 20, 30, 50, 75, 100].map((level) => {
                if (level < minReturn || level > maxReturn) return null;
                const y = getY(level);
                const isZero = level === 0;

                return (
                  <g key={level}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={padding.left + chartW}
                      y2={y}
                      stroke={isZero ? '#475569' : '#1e293b'}
                      strokeDasharray={isZero ? 'none' : '3 3'}
                      strokeWidth={isZero ? '1.5' : '1'}
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      fill={isZero ? '#f8fafc' : '#64748b'}
                      fontSize="10"
                      fontFamily="JetBrains Mono"
                      textAnchor="end"
                    >
                      {level > 0 ? `+${level}%` : `${level}%`}
                    </text>
                  </g>
                );
              })}

              {/* Stock Return Lines */}
              {comparisonData.map((d, index) => {
                const color = PALETTE[index % PALETTE.length];
                const points = d.normalizedBars.map((b, i) => {
                  const x = padding.left + (i / Math.max(1, d.normalizedBars.length - 1)) * chartW;
                  const y = getY(b.returnPercent);
                  return `${x},${y}`;
                });

                if (points.length === 0) return null;

                return (
                  <g key={d.symbol}>
                    <path
                      d={`M ${points.join(' L ')}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    {/* End point callout */}
                    {d.normalizedBars.length > 0 && (
                      <circle
                        cx={padding.left + chartW}
                        cy={getY(d.normalizedBars[d.normalizedBars.length - 1].returnPercent)}
                        r="3.5"
                        fill={color}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/70">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1-Year Comparative Performance Matrix
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3 px-4">Stock / Index</th>
                <th className="py-3 px-4 text-right">Current Price</th>
                <th className="py-3 px-4 text-right">1-Year Total Return</th>
                <th className="py-3 px-4 text-right">Volatility (Annualized)</th>
                <th className="py-3 px-4 text-right">Max Drawdown</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono-num">
              {comparisonData.map((d, index) => {
                const color = PALETTE[index % PALETTE.length];
                const isPos = d.totalReturn1Y >= 0;

                return (
                  <tr key={d.symbol} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div>
                          <div className="font-bold text-slate-200">{d.symbol}</div>
                          <div className="text-[11px] text-slate-400 font-sans">{d.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-100">
                      ₹{d.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPos ? '+' : ''}{d.totalReturn1Y.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-slate-300">
                      {d.annualizedVolatility.toFixed(2)}%
                    </td>

                    <td className="py-3 px-4 text-right text-rose-400">
                      -{d.maxDrawdown.toFixed(2)}%
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onSelectMainSymbol(d.symbol)}
                        className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors font-sans"
                      >
                        Inspect 1Y Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
