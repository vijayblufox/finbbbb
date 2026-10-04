export interface TradeDailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  changePercent: number;
  cumPnLPercent: number;
  statusDay: string;
}

export interface PlaygroundPosition {
  id: string;
  symbol: string;
  name: string;
  side: 'BUY';
  entryDate: string;
  entryPrice: number;
  quantity: number;
  investedAmount: number;
  currentPrice: number;
  targetPrice: number;
  targetPercent: number;
  target2Price?: number;
  stopLossPrice: number;
  stopLossPercent: number;
  holdingHorizon: string;
  suggestedHoldingDays: number;
  daysHeld: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  status: 'OPEN' | 'TARGET_HIT' | 'STOP_LOSS_HIT' | 'HORIZON_EXPIRED' | 'CLOSED_MANUALLY';
  autoExitReason?: string;
  exitDate?: string;
  exitPrice?: number;
  realizedPnL?: number;
  realizedPnLPercent?: number;
  strategyTag: string;
  confidenceScore: number;
  dailyHistory?: TradeDailyBar[];
}

export interface MonthPerformance {
  monthKey: string;
  monthLabel: string;
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
  netProfitLoss: number;
  grossProfit: number;
  grossLoss: number;
  profitPercentage: number;
  cumEquity: number;
}

export interface PlaygroundState {
  initialCapital: number;
  availableCash: number;
  positions: PlaygroundPosition[];
  closedTrades: PlaygroundPosition[];
  autoTradeEnabled: boolean;
}
