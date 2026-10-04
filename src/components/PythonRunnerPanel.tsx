import React, { useState } from 'react';
import { 
  Play, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  ExternalLink, 
  Code2, 
  FileSpreadsheet, 
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { PythonRunResponse, StockPayload } from '../types/market';

interface PythonRunnerPanelProps {
  stockData: StockPayload;
  onDownloadCsv: () => void;
}

export const PythonRunnerPanel: React.FC<PythonRunnerPanelProps> = ({ stockData, onDownloadCsv }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<PythonRunResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'colab' | 'py_local' | 'bhavcopy'>('colab');

  const { meta } = stockData;
  const symbol = meta.symbol;
  const cleanSym = symbol.replace('.NS', '');

  // 1. Google Colab Ready Code
  const colabCode = `
# ==========================================================
# Google Colab / Jupyter Notebook Script
# Auto-generated for NSE stock: ${symbol}
# ==========================================================
!pip install yfinance pandas gspread

import yfinance as yf
import pandas as pd
import datetime

# 1. Download 1-year everyday OHLCV historical data with auto adjustment
ticker = "${symbol}"
start_date = (datetime.date.today() - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
print(f"Downloading {ticker} from {start_date} to today...")

# auto_adjust=True adjusts prices for splits and bonuses
df = yf.download(ticker, start=start_date, auto_adjust=True)

# 2. Display summary
print(f"\\n✓ Downloaded {len(df)} trading days of everyday candles.")
print("\\nTail records (latest 5 days):")
print(df.tail())

# 3. Export to CSV file (ready for Google Sheets Import)
csv_filename = "${cleanSym}_1y_daily.csv"
df.to_csv(csv_filename)
print(f"\\n✓ Saved CSV to: {csv_filename}")
print("To import into Google Sheets: In Google Sheets, click File > Import > Upload and select this CSV.")

# 4. Multi-stock example for NSE
tickers = ["${symbol}", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "^NSEI"]
print(f"\\nDownloading multi-stock portfolio: {tickers}")
portfolio_df = yf.download(tickers, start=start_date, auto_adjust=True)
print(portfolio_df['Close'].tail())
`.trim();

  // 2. Standalone Python (Standard Library - No pip install needed)
  const pyLocalCode = `
"""
NSE 1-Year Everyday Stock Data Fetcher (Zero Dependencies)
Symbol: ${symbol}
"""
import urllib.request
import json
import csv
import datetime
import sys

symbol = "${symbol}"
url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1y&interval=1d&includeAdjustedClose=true"
headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        result = data['chart']['result'][0]
        timestamps = result['timestamp']
        quote = result['indicators']['quote'][0]
        adjclose = result['indicators'].get('adjclose', [{}])[0].get('adjclose', quote['close'])

        records = []
        for i in range(len(timestamps)):
            c = quote['close'][i]
            if c is None: continue
            dt = datetime.datetime.fromtimestamp(timestamps[i]).strftime('%Y-%m-%d')
            records.append({
                'Date': dt,
                'Open': round(quote['open'][i] or c, 2),
                'High': round(quote['high'][i] or c, 2),
                'Low': round(quote['low'][i] or c, 2),
                'Close': round(c, 2),
                'AdjClose': round(adjclose[i] or c, 2),
                'Volume': int(quote['volume'][i] or 0)
            })

        print(f"Retrieved {len(records)} trading days for {symbol}")
        # Save to CSV
        with open('${cleanSym}_1y_daily.csv', 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=records[0].keys())
            writer.writeheader()
            writer.writerows(records)
        print("Saved to ${cleanSym}_1y_daily.csv")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
`.trim();

  // 3. Official NSE Bhavcopy & nsepython / jugaad-data guide
  const bhavcopyCode = `
# ==========================================================
# Official NSE Bhavcopy & Historical Index Automation
# ==========================================================
# Option A: using nsepython
!pip install nsepython

from nsepython import equity_history, nse_bhavcopy
import datetime

# Fetch equity history directly from official NSE servers
symbol = "${cleanSym}"
start_date = (datetime.date.today() - datetime.timedelta(days=365)).strftime('%d-%m-%Y')
end_date = datetime.date.today().strftime('%d-%m-%Y')

print(f"Fetching official NSE history for {symbol}...")
df_nse = equity_history(symbol, "EQ", start_date, end_date)
print(df_nse.head())

# Option B: using jugaad-data (clean pandas dataframe)
!pip install jugaad-data
from jugaad_data.nse import stock_df
from datetime import date, timedelta

df_jugaad = stock_df(symbol="${cleanSym}", from_date=date.today()-timedelta(days=365),
                     to_date=date.today(), series="EQ")
df_jugaad.to_csv("${cleanSym}_bhavcopy_1y.csv")
print("Saved official NSE bhavcopy to ${cleanSym}_bhavcopy_1y.csv")
`.trim();

  const handleRunPython = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/run-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data: PythonRunResponse = await res.json();
      setRunResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute Python script on server');
    } finally {
      setIsRunning(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(id);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const downloadScriptFile = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentCode = activeTab === 'colab' ? colabCode : activeTab === 'py_local' ? pyLocalCode : bhavcopyCode;

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Code2 className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Python & Google Colab Automation Hub
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Extract every day details for <span className="font-mono-num text-slate-200 font-semibold">{symbol}</span> using Python <code className="text-indigo-400 font-mono-num">yfinance</code>, run on this server, or export for Google Colab & Sheets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunPython}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : 'fill-white'}`} />
              <span>{isRunning ? 'Running Python 3...' : 'Execute Script on Server'}</span>
            </button>

            <button
              onClick={onDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Get 1Y CSV</span>
            </button>
          </div>
        </div>

        {/* Live Terminal Output Window (if executed) */}
        {runResult && (
          <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden font-mono-num text-xs">
            <div className="bg-slate-900/90 px-3 py-2 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Python 3 Output (Execution time: {runResult.executionTimeMs}ms)</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] ${runResult.exitCode === 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400'}`}>
                Exit Code: {runResult.exitCode}
              </span>
            </div>
            <pre className="p-4 text-emerald-300 whitespace-pre-wrap overflow-x-auto max-h-72 scrollbar-thin">
              {runResult.stdout || 'Script executed with no standard output.'}
              {runResult.stderr && (
                <span className="text-rose-400 block mt-2">STDERR:\n{runResult.stderr}</span>
              )}
            </pre>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Code Editor & Snippet Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {/* Tab Headers */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('colab')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'colab' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Google Colab (yfinance)</span>
            </button>

            <button
              onClick={() => setActiveTab('py_local')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'py_local' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Standard Python 3 Script</span>
            </button>

            <button
              onClick={() => setActiveTab('bhavcopy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'bhavcopy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Official NSE Bhavcopy</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyCode(currentCode, activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              {copiedTab === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={() => downloadScriptFile(currentCode, `${cleanSym}_fetch_${activeTab}.py`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .py</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950 font-mono-num text-xs leading-relaxed overflow-x-auto text-slate-200">
          <pre>{currentCode}</pre>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">1</span>
            Colab Setup (Zero Install)
          </div>
          <p className="text-slate-400 leading-normal">
            Open <a href="https://colab.research.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">colab.research.google.com</a>, create a New Notebook, copy the script above, and press Shift+Enter to run.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
            auto_adjust=True Benefit
          </div>
          <p className="text-slate-400 leading-normal">
            Yahoo Finance automatically adjusts historic prices for stock splits, reverse splits, and bonus issues, giving continuous, realistic returns for quantitative backtesting.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">3</span>
            Google Sheets Import
          </div>
          <p className="text-slate-400 leading-normal">
            Click &ldquo;Get 1Y CSV&rdquo; or use the python CSV export. In Google Sheets: <code className="text-amber-300">File &gt; Import &gt; Upload</code>. You can also use Google&apos;s <code className="text-amber-300">gspread</code> library to append data automatically.
          </p>
        </div>
      </div>
    </div>
  );
};
