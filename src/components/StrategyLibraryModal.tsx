import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Compass, 
  Search, 
  Award,
  Zap,
  Target
} from 'lucide-react';
import { INDIAN_SWING_STRATEGIES, SwingStrategyDefinition } from '../utils/indianSwingStrategies';

interface StrategyLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStrategy?: (strategyId: string) => void;
}

export const StrategyLibraryModal: React.FC<StrategyLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectStrategy,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<SwingStrategyDefinition>(INDIAN_SWING_STRATEGIES[0]);

  if (!isOpen) return null;

  const filteredStrategies = INDIAN_SWING_STRATEGIES.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.coreIndicators.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Indian Swing Trading Strategy Knowledge Base
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold font-mono-num">
                  12 BATTLE-TESTED FORMULAS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Institutional quantitative strategies tuned for NSE Midcaps, Smallcaps, and Nifty Leaders
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

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Strategy List */}
          <div className="w-full md:w-80 border-r border-slate-800 bg-slate-950/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search 12 strategies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredStrategies.map((strategy) => {
                const isSelected = selectedStrategy.id === strategy.id;
                return (
                  <button
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate pr-2">
                        {strategy.name.split('(')[0]}
                      </span>
                      <span className="text-[10px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800 shrink-0">
                        {strategy.winRateBenchmark}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{strategy.creatorOrOrigin.split('(')[0]}</span>
                      <span className="text-[10px] text-indigo-300 font-mono-num font-semibold">
                        R:R {strategy.typicalRiskReward.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Strategy Deep Details */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-900/60">
            {/* Strategy Title & Quick Metrics */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                  STRATEGY AUDIT
                </span>
                <span className="text-xs text-slate-400">
                  Origin: {selectedStrategy.creatorOrOrigin}
                </span>
              </div>

              <h4 className="text-xl font-black text-white tracking-tight">
                {selectedStrategy.name}
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedStrategy.description}
              </p>

              {/* 4 Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono-num">
                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans block">Win Rate Benchmark</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedStrategy.winRateBenchmark}</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans block">Target Risk:Reward</span>
                  <span className="text-sm font-bold text-indigo-400">{selectedStrategy.typicalRiskReward}</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans block">Holding Horizon</span>
                  <span className="text-sm font-bold text-amber-300">{selectedStrategy.holdingPeriod}</span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-sans block">Ideal Market Regime</span>
                  <span className="text-xs font-bold text-white truncate block">{selectedStrategy.idealMarketRegime}</span>
                </div>
              </div>
            </div>

            {/* Core Indicators */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Required Quantitative Indicators</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedStrategy.coreIndicators.map((ind, i) => (
                  <span 
                    key={i} 
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono-num text-slate-200"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>

            {/* Entry, Exit, and Stop-Loss Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl space-y-1.5">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Entry Trigger</span>
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedStrategy.entryCondition}
                </p>
              </div>

              <div className="bg-indigo-950/20 border border-indigo-800/40 p-3.5 rounded-xl space-y-1.5">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <Target className="w-3.5 h-3.5" />
                  <span>Exit / Profit Target</span>
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedStrategy.exitTargetCondition}
                </p>
              </div>

              <div className="bg-rose-950/20 border border-rose-800/40 p-3.5 rounded-xl space-y-1.5">
                <span className="font-bold text-rose-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Hard Stop-Loss Rule</span>
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedStrategy.stopLossCondition}
                </p>
              </div>
            </div>

            {/* Indian Market Specific Edge */}
            <div className="bg-slate-950/80 border border-indigo-500/30 p-4 rounded-xl space-y-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Why This Works Specifically in Indian NSE Equities</span>
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedStrategy.indianMarketNuance}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono-num">
            All 12 strategies are actively calculated in the 10x-daily automated NSE market scanner.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
          >
            Close Knowledge Base
          </button>
        </div>
      </div>
    </div>
  );
};
