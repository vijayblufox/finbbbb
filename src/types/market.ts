export interface StockMeta {
  symbol: string;
  name: string;
  sector: string;
  index: string;
  marketCapTier?: string;
}

export interface DailyBar {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  change: number;
  changePercent: number;
  dayRange: number;
  dayRangePercent: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
  vwap?: number;
}

export interface StockPayload {
  meta: {
    symbol: string;
    name: string;
    sector: string;
    index: string;
    currency: string;
    exchange: string;
    currentPrice: number;
    previousClose: number;
    changeToday: number;
    changePercentToday: number;
    high52w: number;
    low52w: number;
    totalReturn1Y: number;
    annualizedVolatility: number;
    maxDrawdown: number;
    averageDailyVolume: number;
    tradingDaysCount: number;
    upDays: number;
    downDays: number;
    firstTradingDate: string;
    lastTradingDate: string;
  };
  bars: DailyBar[];
}

export interface MarketSummaryItem {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high52w?: number;
  low52w?: number;
}

export interface ComparisonDataset {
  symbol: string;
  name: string;
  currentPrice: number;
  totalReturn1Y: number;
  annualizedVolatility: number;
  maxDrawdown: number;
  normalizedBars: {
    date: string;
    close: number;
    returnPercent: number;
  }[];
}

export interface PythonRunResponse {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  pythonCode: string;
  colabCode: string;
}
