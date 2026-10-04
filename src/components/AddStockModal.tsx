import React, { useState } from 'react';
import { 
  Plus, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StockMeta } from '../types/market';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockAdded: (stock: StockMeta) => void;
  existingStocks: StockMeta[];
}

interface ValidationResult {
  valid: boolean;
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  exchange: string;
  currency: string;
}

const POPULAR_SUGGESTIONS = [
  { symbol: 'TATAPOWER.NS', name: 'Tata Power Co Ltd', sector: 'Power & Energy' },
  { symbol: 'IREDA.NS', name: 'Indian Renewable Energy', sector: 'Renewable Finance' },
  { symbol: 'RVNL.NS', name: 'Rail Vikas Nigam Ltd', sector: 'Railways & Infra' },
  { symbol: 'IRFC.NS', name: 'Indian Railway Finance Corp', sector: 'Railways & Finance' },
  { symbol: 'MAZDOCK.NS', name: 'Mazagon Dock Shipbuilders', sector: 'Defence' },
  { symbol: 'COCHINSHIP.NS', name: 'Cochin Shipyard Ltd', sector: 'Defence' },
  { symbol: 'ZOMATO.NS', name: 'Zomato Ltd', sector: 'Tech & Food' },
  { symbol: 'JIOFIN.NS', name: 'Jio Financial Services', sector: 'Financial Services' },
  { symbol: 'SUZLON.NS', name: 'Suzlon Energy Ltd', sector: 'Green Energy' },
  { symbol: 'TRENT.NS', name: 'Trent Ltd (Westside)', sector: 'Retail & Fashion' },
  { symbol: 'BSE.NS', name: 'BSE Ltd', sector: 'Capital Markets' },
  { symbol: 'CDSL.NS', name: 'Central Depository Services', sector: 'Depository' },
];

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onStockAdded,
  existingStocks,
}) => {
  const [tickerInput, setTickerInput] = useState('');
  const [sectorInput, setSectorInput] = useState('General Equity');
  const [indexInput, setIndexInput] = useState('NSE Equity');
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidate = async (symbolToTest?: string) => {
    const raw = symbolToTest || tickerInput;
    if (!raw.trim()) {
      setErrorMsg('Please enter a stock symbol (e.g. TATAPOWER, IRFC, RVNL)');
      return;
    }

    setIsValidating(true);
    setErrorMsg(null);
    setValidationResult(null);
    setSuccessMsg(null);

    const clean = raw.trim().toUpperCase();
    const formatted = clean.startsWith('^') || clean.endsWith('.NS') || clean.endsWith('.BO') 
      ? clean 
      : `${clean}.NS`;

    try {
      const res = await fetch(`/api/stocks/validate/${encodeURIComponent(formatted)}`);
      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || `Stock symbol "${formatted}" could not be found on NSE.`);
      }

      setValidationResult(data);
      setTickerInput(data.symbol);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed. Please verify the NSE ticker.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddStock = async () => {
    const targetSymbol = validationResult?.symbol || tickerInput.trim();
    if (!targetSymbol) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/stocks/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: targetSymbol,
          name: validationResult?.name,
          sector: sectorInput || 'General Equity',
          index: indexInput || 'NSE Equity',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add stock');
      }

      setSuccessMsg(`Successfully added ${data.stock.symbol} to your NSE Terminal!`);
      onStockAdded(data.stock);

      // Auto close after brief success
      setTimeout(() => {
        onClose();
        setValidationResult(null);
        setTickerInput('');
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = (sym: string) => {
    setTickerInput(sym);
    handleValidate(sym);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Add NSE Stock to Terminal
              </h2>
              <p className="text-xs text-slate-400">
                Track 1-year everyday OHLCV historical records for any National Stock Exchange equity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5">
          {/* Symbol Input with Validate Button */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              NSE Stock Symbol or Ticker
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter ticker (e.g. TATAPOWER, IRFC, RVNL, IREDA, SUZLON)..."
                  value={tickerInput}
                  onChange={(e) => {
                    setTickerInput(e.target.value.toUpperCase());
                    setValidationResult(null);
                    setErrorMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleValidate();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono-num uppercase"
                />
              </div>

              <button
                type="button"
                onClick={() => handleValidate()}
                disabled={isValidating || !tickerInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Verify NSE</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Suffix <code className="text-slate-400">.NS</code> will be added automatically if omitted.
            </p>
          </div>

          {/* Validation Result Preview Card */}
          {validationResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white font-mono-num">
                      {validationResult.symbol}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified on NSE
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    {validationResult.name}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono-num text-white">
                    ₹{validationResult.currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[11px] font-mono-num flex items-center justify-end gap-1 ${
                    validationResult.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {validationResult.changePercent >= 0 ? '+' : ''}{validationResult.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Optional Sector & Index inputs */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Sector Tag</label>
                  <select
                    value={sectorInput}
                    onChange={(e) => setSectorInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Power & Energy">Power & Energy</option>
                    <option value="Renewable Energy">Renewable Energy</option>
                    <option value="Railways & Infra">Railways & Infra</option>
                    <option value="Defence & Aerospace">Defence & Aerospace</option>
                    <option value="Banking & Finance">Banking & Finance</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                    <option value="Automobile">Automobile</option>
                    <option value="FMCG & Retail">FMCG & Retail</option>
                    <option value="Metals & Mining">Metals & Mining</option>
                    <option value="General Equity">General Equity</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Index Classification</label>
                  <select
                    value={indexInput}
                    onChange={(e) => setIndexInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Nifty 50">Nifty 50</option>
                    <option value="Nifty Next 50">Nifty Next 50</option>
                    <option value="Nifty Midcap">Nifty Midcap</option>
                    <option value="Nifty Smallcap">Nifty Smallcap</option>
                    <option value="NSE Equity">NSE Equity</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Suggestions Strip */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Popular Stocks to Add (1-Click)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SUGGESTIONS.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleQuickAdd(item.symbol)}
                  className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 hover:text-white font-mono-num transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 text-indigo-400" />
                  <span>{item.symbol.replace('.NS', '')}</span>
                  <span className="text-[10px] text-slate-500 font-sans">({item.sector})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddStock}
            disabled={isSubmitting || (!validationResult && !tickerInput.trim())}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Adding Stock...' : 'Add Stock to Terminal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
