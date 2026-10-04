export interface HistoricalPredictionItem {
  id: string;
  symbol: string;
  name: string;
  recommendedDate: string;
  recommendedEntryPrice: number;
  currentPrice: number;
  targetPrice: number;
  targetPercent: number;
  target2Price?: number;
  stopLossPrice: number;
  stopLossPercent: number;
  holdingHorizon: string;
  strategyTag: string;
  confidenceScore: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'STOP_LOSS_HIT';
  exitPrice?: number;
  exitDate?: string;
  resultProfitLossPercent?: number;
  isWin?: boolean;
  notes?: string;
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
