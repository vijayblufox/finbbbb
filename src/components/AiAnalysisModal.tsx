import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Copy, 
  Check, 
  Bot
} from 'lucide-react';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string | null;
  stockName?: string;
  currentPrice?: number;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  symbol,
  stockName,
  currentPrice,
}) => {
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !symbol) return;

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      setAnalysisText(null);
      try {
        const res = await fetch('/api/ai-deep-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}: Failed to generate AI deep analysis`);
        }

        const data = await res.json();
        setAnalysisText(data.analysisMarkdown || 'No analysis generated.');
      } catch (err: any) {
        console.error('Error fetching AI analysis:', err);
        setError(err.message || 'Failed to generate quantitative AI memorandum');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [isOpen, symbol]);

  if (!isOpen || !symbol) return null;

  const handleCopy = () => {
    if (analysisText) {
      navigator.clipboard.writeText(analysisText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono-num">
                  {symbol} AI Deep Quantitative Audit
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold font-mono-num flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>GEMINI QUANT REASONER</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {stockName || 'NSE Stock'} {currentPrice ? `• Live CMP: ₹${currentPrice}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {analysisText && (
              <button
                onClick={handleCopy}
                title="Copy Analysis Memorandum"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {isLoading && (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Running Deep Quantitative Audit for {symbol}...
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Cross-referencing 12 Indian swing strategies, Mansfield relative strength vs Nifty, ATR risk bounds, and volume absorption.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-5 bg-rose-950/40 border border-rose-800 rounded-xl space-y-2 text-center">
              <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
              <p className="text-rose-200 font-semibold">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  fetch('/api/ai-deep-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbol }),
                  })
                    .then(r => r.json())
                    .then(d => setAnalysisText(d.analysisMarkdown))
                    .catch(e => setError(e.message))
                    .finally(() => setIsLoading(false));
                }}
                className="px-3 py-1 bg-rose-900 text-rose-100 rounded text-xs font-semibold"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {!isLoading && !error && analysisText && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4 text-slate-200 leading-relaxed font-sans">
              <div className="prose prose-invert prose-xs max-w-none space-y-3">
                {analysisText.split('\n\n').map((paragraph, idx) => {
                  if (paragraph.startsWith('### ') || paragraph.startsWith('#### ')) {
                    return (
                      <h4 key={idx} className="text-sm font-bold text-indigo-300 border-b border-slate-800 pb-1 pt-2">
                        {paragraph.replace(/^[#]+\s*/, '')}
                      </h4>
                    );
                  }
                  if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                    const lines = paragraph.split('\n');
                    return (
                      <ul key={idx} className="list-disc list-inside space-y-1 text-slate-300 pl-1 font-mono-num">
                        {lines.map((line, lIdx) => (
                          <li key={lIdx} dangerouslySetInnerHTML={{
                            __html: line.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                          }} />
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p 
                      key={idx} 
                      className="text-slate-300 text-xs"
                      dangerouslySetInnerHTML={{
                        __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono-num">
            Generated via Google Gemini 3.8 Flash Quantitative Pipeline
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};
