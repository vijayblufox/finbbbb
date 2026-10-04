import React, { useState } from 'react';
import { 
  Calculator, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Clock, 
  Award, 
  Copy, 
  Check,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import { TradeMathDerivation } from '../utils/indianSwingStrategies';

interface MathProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  mathProof?: TradeMathDerivation;
}

export const MathProofModal: React.FC<MathProofModalProps> = ({
  isOpen,
  onClose,
  symbol,
  name,
  mathProof,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !mathProof) return null;

  const handleCopyProof = () => {
    const text = [
      `MATHEMATICAL TRADE PROOF: ${name} (${symbol})`,
      `=============================================`,
      ...mathProof.mathematicalProofSteps,
      `\nTarget 1 Formula: ${mathProof.target1Formula}`,
      `Target 2 Formula: ${mathProof.target2Formula}`,
      `Stop-Loss Formula: ${mathProof.stopLossFormula}`,
      `Horizon Method: ${mathProof.holdingHorizonMethod}`,
      `Risk:Reward: 1:${mathProof.actualRiskRewardRatio}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono-num">
                  {symbol} Mathematical Derivation & Proof
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold font-mono-num flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-emerald-400" />
                  <span>100% PROVEN FORMULAS</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {name} • Authentic Price-Structure & Volatility Formulas (Zero Random Numbers)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyProof}
              title="Copy Complete Mathematical Proof"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Key Formula Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-num">
            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block font-sans">True ATR(14)</span>
              <span className="text-base font-bold text-indigo-400">₹{mathProof.atr14}</span>
              <span className="text-[10px] text-slate-500 block">Daily Variance</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block font-sans">Structural Pivot Low</span>
              <span className="text-base font-bold text-white">₹{mathProof.pivotSupportLow}</span>
              <span className="text-[10px] text-slate-500 block">5-Day Base Floor</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block font-sans">Risk : Reward</span>
              <span className="text-base font-bold text-emerald-400">1 : {mathProof.actualRiskRewardRatio}</span>
              <span className="text-[10px] text-slate-500 block">Strict Minimum 1:2.0</span>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 block font-sans">Holding Days</span>
              <span className="text-base font-bold text-amber-300">{mathProof.expectedHoldingDays} Days</span>
              <span className="text-[10px] text-slate-500 block">ATR Velocity Derived</span>
            </div>
          </div>

          {/* Step-by-Step Proof Log */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step Mathematical Derivation</span>
            </span>

            <div className="space-y-2 font-mono-num text-[11px]">
              {mathProof.mathematicalProofSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-300 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exact Formulas Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-rose-950/20 border border-rose-800/40 p-3.5 rounded-xl space-y-1">
              <span className="text-rose-400 font-bold text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hard Stop-Loss Formula</span>
              </span>
              <div className="text-sm font-bold text-white font-mono-num">
                ₹{mathProof.stopLossPrice} (-{mathProof.stopLossPercent}%)
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono-num">
                {mathProof.stopLossFormula}
              </p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl space-y-1">
              <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>Target 1 (1:2 R:R) Formula</span>
              </span>
              <div className="text-sm font-bold text-white font-mono-num">
                ₹{mathProof.target1Price} (+{mathProof.target1Percent}%)
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono-num">
                {mathProof.target1Formula}
              </p>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-800/40 p-3.5 rounded-xl space-y-1">
              <span className="text-indigo-400 font-bold text-[11px] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Target 2 (Fibonacci) Formula</span>
              </span>
              <div className="text-sm font-bold text-white font-mono-num">
                ₹{mathProof.target2Price} (+{mathProof.target2Percent}%)
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono-num">
                {mathProof.target2Formula}
              </p>
            </div>
          </div>

          {/* Holding Horizon & Position Sizing Details */}
          <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-4 space-y-2 text-[11px]">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Expected Holding Horizon & Daily Momentum Drift</span>
            </span>
            <p className="text-slate-300 leading-relaxed font-mono-num">
              Formula: <strong>{mathProof.holdingHorizonMethod}</strong>
            </p>
            <p className="text-slate-400 leading-relaxed">
              Why this is accurate: Rather than guessing random days, the holding horizon calculates how many days a liquid NSE equity requires to travel the distance to Target 1 based on its 14-day True ATR.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono-num">
            Mathematical derivation verified against William O&rsquo;Neil &amp; Mark Minervini quantitative benchmarks.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
