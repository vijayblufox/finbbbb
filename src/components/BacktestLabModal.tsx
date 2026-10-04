import React, { useState } from 'react';
import {
  FlaskConical,
  X,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  ShieldCheck,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Award,
  BookOpen
} from 'lucide-react';

interface BacktestTrade {
  id: string;
  symbol: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  stopLossPrice: number;
  targetPrice: number;
  target2Price?: number;
  exitPrice: number;
  exitDate: string;
  exitReason: string;
  realizedPnL: number;
  realizedPnLPercent: number;
  daysHeld: number;
  strategyTag: string;
}

interface BacktestResult {
  symbol: string;
  name: string;
  totalBars: number;
  timeframe: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalReturnPercent: number;
  avgWinPercent: number;
  avgLossPercent: number;
  trades: BacktestTrade[];
}

interface BacktestLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export const BacktestLabModal: React.FC<BacktestLabModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'CYIENT.NS',
}) => {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'simulator' | 'methods'>('simulator');

  if (!isOpen) return null;

  const handleRunBacktest = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to complete backtest');
      }
      const data: BacktestResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Backtest simulation failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Quantitative Strategy Validation &amp; Backtest Lab
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold font-mono-num">
                  1-YEAR REAL OHLCV ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Verify historical win rates, risk-reward ratios, and trade performance on authentic daily sessions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Controls */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Historical Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('methods')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'methods'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>The 4 Testing Methods Guide</span>
            </button>
          </div>

          {activeTab === 'simulator' && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g. CYIENT.NS)"
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono-num text-xs focus:outline-none focus:border-indigo-500 uppercase w-36"
              />
              <button
                onClick={handleRunBacktest}
                disabled={isRunning}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isRunning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>{isRunning ? 'Replaying 250 Days...' : 'Run 1Y Backtest'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {activeTab === 'simulator' && (
            <>
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs">
                  {error}
                </div>
              )}

              {!result && !isRunning && !error && (
                <div className="p-10 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                  <FlaskConical className="w-12 h-12 text-indigo-400 mx-auto opacity-70" />
                  <h4 className="text-base font-bold text-white">Ready to Run Historical Simulation</h4>
                  <p className="text-slate-400 max-w-lg mx-auto text-xs leading-relaxed">
                    Select any NSE equity (e.g. <strong>CYIENT.NS</strong>, <strong>MANKIND.NS</strong>, <strong>RELIANCE.NS</strong>) and click <strong>&quot;Run 1Y Backtest&quot;</strong>. The engine will walk forward session-by-session across 250 days of real OHLCV data, detecting triggers and executing trades with authentic Target 1, Target 2, and Stop-Loss limits.
                  </p>
                  <button
                    onClick={handleRunBacktest}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Test for {symbol}</span>
                  </button>
                </div>
              )}

              {result && (
                <div className="space-y-5">
                  {/* Results Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono-num">
                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Total Signals</span>
                      <div className="text-xl font-bold text-white">{result.totalTrades}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Over 250 Sessions</div>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Historical Win Rate</span>
                      <div className="text-xl font-bold text-emerald-400">{result.winRate}%</div>
                      <div className="text-[10px] text-slate-500 font-sans">{result.winningTrades}W / {result.losingTrades}L</div>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Profit Factor</span>
                      <div className="text-xl font-bold text-indigo-400">{result.profitFactor}</div>
                      <div className="text-[10px] text-slate-500 font-sans">Gross Win / Loss</div>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Total Return</span>
                      <div className={`text-xl font-bold ${result.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">Cumulative Strategy</div>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Average Win</span>
                      <div className="text-xl font-bold text-emerald-400">+{result.avgWinPercent}%</div>
                      <div className="text-[10px] text-slate-500 font-sans">Target 1 &amp; 2 Exits</div>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-sans block">Average Loss</span>
                      <div className="text-xl font-bold text-rose-400">{result.avgLossPercent}%</div>
                      <div className="text-[10px] text-slate-500 font-sans">Strict Stop-Loss Cuts</div>
                    </div>
                  </div>

                  {/* Trade-by-Trade Historical Simulation Log */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5 font-sans">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Replayed Historical Executions ({result.trades.length} Trades)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono-num">
                        {result.name} ({result.symbol})
                      </span>
                    </div>

                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                      <table className="w-full text-left text-xs font-mono-num">
                        <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase font-sans border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Entry Date</th>
                            <th className="py-2.5 px-2 text-right">Entry Price</th>
                            <th className="py-2.5 px-2 text-right">Stop Loss</th>
                            <th className="py-2.5 px-2 text-right">Target 1</th>
                            <th className="py-2.5 px-3">Exit Date &amp; Price</th>
                            <th className="py-2.5 px-2 text-center">Outcome</th>
                            <th className="py-2.5 px-3 text-right">Return (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {result.trades.map((t) => {
                            const isWin = t.realizedPnLPercent > 0;
                            return (
                              <tr key={t.id} className="hover:bg-slate-900/40">
                                <td className="py-2.5 px-3 text-slate-300">
                                  <div>{t.entryDate}</div>
                                  <div className="text-[10px] text-indigo-400 font-sans">{t.strategyTag}</div>
                                </td>
                                <td className="py-2.5 px-2 text-right font-bold text-white">
                                  ₹{t.entryPrice.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-rose-400">
                                  ₹{t.stopLossPrice.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-2 text-right text-emerald-400">
                                  ₹{t.targetPrice.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-300">
                                  <div>{t.exitDate} @ ₹{t.exitPrice.toFixed(2)}</div>
                                  <div className="text-[10px] text-slate-500 font-sans">Held {t.daysHeld} sessions</div>
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 font-sans ${
                                    isWin
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}>
                                    {isWin ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-rose-400" />}
                                    {t.exitReason.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isWin ? '+' : ''}{t.realizedPnLPercent.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'methods' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>The 4 Industry-Standard Methods to Test Trading Strategies</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Before risking real capital, institutional proprietary trading desks and algorithmic funds validate every swing trading strategy using 4 distinct stages of testing:
                </p>
              </div>

              {/* Method 1 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 flex items-center justify-center font-bold text-[10px]">1</span>
                    <span>1-Year Historical Walk-Forward Simulation (Backtesting)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    AVAILABLE IN THIS LAB
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Replays the last 250 trading days session-by-session. The algorithm checks every day whether strategy rules were met, simulates buying at the next session&apos;s open, and monitors subsequent price bars until Target 1, Target 2, or Stop-Loss is hit.
                </p>
                <div className="text-[11px] text-slate-400">
                  <strong>Key Metrics to Check:</strong> Win Rate &ge; 60%, Profit Factor &ge; 1.80, and Payoff Ratio &ge; 1.8x.
                </div>
              </div>

              {/* Method 2 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 flex items-center justify-center font-bold text-[10px]">2</span>
                    <span>Out-of-Sample Forward Paper Trading (The Paper Journal)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    ACTIVE IN YOUR APP
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Backtesting alone can suffer from hindsight bias. Forward testing uses <strong>today&apos;s live scan calls</strong> logged into the Paper Trade Journal without committing real money. As market sessions conclude over 2 to 4 weeks, you observe if live calls hit target before stop-loss.
                </p>
              </div>

              {/* Method 3 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Market Regime Stress-Testing (Bullish vs Correction Regimes)</span>
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Swing trading performance varies dramatically based on whether Nifty 50 is trending above its 50 SMA or correcting. The built-in <strong>Market Regime Gauge</strong> prevents taking swing long setups when the broader market is under institutional distribution.
                </p>
              </div>

              {/* Method 4 */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 flex items-center justify-center font-bold text-[10px]">4</span>
                  <span>Strict 1% Portfolio Risk Position Sizing</span>
                </span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Even a 70% win-rate system can encounter 4 consecutive losing trades. By limiting risk to strictly <strong>1.0% of portfolio capital</strong> per trade (Shares = ₹10,000 / (Entry - Stop-Loss)), four consecutive losses only result in a minor 4% drawdown, preserving capital for the next winning cluster.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono-num">
            Walk-forward simulator uses authentic Yahoo Finance 1-year daily bars.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-semibold transition-colors"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
