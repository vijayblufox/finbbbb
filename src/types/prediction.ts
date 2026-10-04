export interface TradeExecutionLog {
  timestamp: string; // e.g. "04 Oct 2026, 11:38 AM IST"
  action: 'RECOMMENDED' | 'BUY_SCHEDULED' | 'BUY_EXECUTED' | 'PRICE_TICK' | 'TRAILING_STOP_ACTIVATED' | 'BREAK_EVEN_EXIT' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'TIME_LIMIT_EXIT';
  price: number;
  message: string;
}

export interface HistoricalPredictionItem {
  id: string;
  symbol: string;
  name: string;
  quantity?: number; // Standardized test unit: 1 share
  recommendedDate: string; // Date signal was detected/recommended
  recommendedTime?: string; // Time signal was detected, e.g. "11:38 AM IST"
  recommendedTimestamp?: string; // Full IST string: e.g. "04 Oct 2026, 11:38 AM IST"
  
  executionDate?: string;   // Real market entry execution date (Mon-Fri)
  executionTime?: string;   // Target entry time, e.g. "09:15 AM IST"
  buyExecutionTime?: string; // Actual or scheduled buy time
  buyExecutionTimestamp?: string; // Full IST string: e.g. "05 Oct 2026, 09:15 AM IST"
  executionStatus?: 'SCHEDULED_BUY' | 'BUY_EXECUTED' | 'SELL_TARGET_EXECUTED' | 'SELL_STOP_EXECUTED' | 'SELL_TIME_LIMIT';

  signalDate?: string;      // Closing candle date analyzed
  recommendedEntryPrice: number;
  currentPrice: number;
  targetPrice: number;
  targetPercent: number;
  target2Price?: number;
  stopLossPrice: number;
  stopLossPercent: number;
  
  // Dynamic Trailing Stop to Break-Even (+4% Rule)
  trailingStopTriggerPercent?: number; // +4.0%
  trailingStopPrice?: number; // Moves to recommendedEntryPrice once +4% reached
  isTrailingStopActivated?: boolean; // True once stock touches +4% gain

  holdingHorizon: string;
  strategyTag: string;
  confidenceScore: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'TIME_LIMIT_EXIT';

  // Exit / Sell Execution Details
  exitPrice?: number;
  exitDate?: string;
  exitTime?: string; // e.g. "02:45 PM IST"
  exitTimestamp?: string; // Full IST string: e.g. "08 Oct 2026, 02:45 PM IST"
  sellExecutionTimestamp?: string; // Full IST string of sell execution

  resultProfitLossPercent?: number;
  profitRupees?: number; // Realized P&L in ₹ for 1 share
  isWin?: boolean;
  notes?: string;

  // Complete Live Execution Audit Logs
  executionLogs?: TradeExecutionLog[];
}

export interface PredictionTrackRecordMetrics {
  totalPredictions: number;
  resolvedPredictions: number;
  activePredictions: number;
  winCount: number;
  lossCount: number;
  accuracy: number;
  avgReturnPercent: number;
  grossProfitPercent: number;
  grossLossPercent: number;
  profitFactor: number;
  strategyBreakdown: Record<string, {
    total: number;
    wins: number;
    losses: number;
    accuracy: number;
    avgReturn: number;
  }>;
}
