import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const LAKE_FILE = path.join(DATA_DIR, 'nse_daily_lake.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StockLakeRecord {
  symbol: string;
  name: string;
  sector: string;
  index: string;
  marketCapTier: string;
  lastDate: string;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changeToday: number;
  changePercentToday: number;
  high52w: number;
  low52w: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi14?: number;
  totalDaysAccumulated: number;
  lastIngestedAt: string;
  recentBars: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePercent?: number;
  }>;
}

export interface LakeMetadata {
  version: string;
  lastUpdated: string;
  totalStocksIndexed: number;
  totalDailyCandlesStored: number;
  lakeStorageSizeKb: number;
  latestSessionDate: string;
  isIngesting: boolean;
  lastIngestionRun: string;
}

export class NseDataLake {
  private static instance: NseDataLake;
  private lakeMap: Map<string, StockLakeRecord> = new Map();
  private lastUpdated: string = new Date().toISOString();
  private isIngesting: boolean = false;

  private constructor() {
    this.load();
  }

  public static getInstance(): NseDataLake {
    if (!NseDataLake.instance) {
      NseDataLake.instance = new NseDataLake();
    }
    return NseDataLake.instance;
  }

  private load(): void {
    try {
      if (fs.existsSync(LAKE_FILE)) {
        const raw = fs.readFileSync(LAKE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.stocks && typeof parsed.stocks === 'object') {
          for (const [sym, rec] of Object.entries(parsed.stocks)) {
            this.lakeMap.set(sym, rec as StockLakeRecord);
          }
        }
        if (parsed.lastUpdated) {
          this.lastUpdated = parsed.lastUpdated;
        }
      }
    } catch (e) {
      console.warn('[NseDataLake] Initializing new Data Lake storage:', e);
    }
  }

  public save(): void {
    try {
      this.lastUpdated = new Date().toISOString();
      const stocksObj: Record<string, StockLakeRecord> = {};
      for (const [sym, rec] of this.lakeMap.entries()) {
        stocksObj[sym] = rec;
      }
      const payload = {
        version: '2.0.0',
        lastUpdated: this.lastUpdated,
        totalStocks: this.lakeMap.size,
        stocks: stocksObj,
      };
      fs.writeFileSync(LAKE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (e) {
      console.error('[NseDataLake] Failed to save lake to disk:', e);
    }
  }

  /**
   * Ingest or update a stock's daily OHLCV bar into the lake
   */
  public ingestStockData(stockData: {
    meta: {
      symbol: string;
      name: string;
      sector?: string;
      index?: string;
      marketCapTier?: string;
      currentPrice: number;
      changeToday: number;
      changePercentToday: number;
      high52w: number;
      low52w: number;
      lastTradingDate?: string;
    };
    bars: Array<{
      date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
      sma20?: number;
      sma50?: number;
      sma200?: number;
      rsi14?: number;
      changePercent?: number;
    }>;
  }): void {
    if (!stockData || !stockData.meta || !stockData.bars || stockData.bars.length === 0) return;

    const sym = stockData.meta.symbol;
    const latestBar = stockData.bars[stockData.bars.length - 1];
    const existing = this.lakeMap.get(sym);

    // Merge bars ensuring no duplicates by date
    const mergedBarsMap = new Map<string, any>();
    if (existing && Array.isArray(existing.recentBars)) {
      for (const b of existing.recentBars) {
        mergedBarsMap.set(b.date, b);
      }
    }
    for (const b of stockData.bars) {
      mergedBarsMap.set(b.date, {
        date: b.date,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        changePercent: b.changePercent,
      });
    }

    const sortedBars = Array.from(mergedBarsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const record: StockLakeRecord = {
      symbol: sym,
      name: stockData.meta.name || existing?.name || sym,
      sector: stockData.meta.sector || existing?.sector || 'Equity',
      index: stockData.meta.index || existing?.index || 'NSE',
      marketCapTier: stockData.meta.marketCapTier || existing?.marketCapTier || 'Mid Cap',
      lastDate: latestBar.date,
      currentPrice: stockData.meta.currentPrice || latestBar.close,
      open: latestBar.open,
      high: latestBar.high,
      low: latestBar.low,
      close: latestBar.close,
      volume: latestBar.volume,
      changeToday: stockData.meta.changeToday,
      changePercentToday: stockData.meta.changePercentToday,
      high52w: stockData.meta.high52w || latestBar.high,
      low52w: stockData.meta.low52w || latestBar.low,
      sma20: latestBar.sma20,
      sma50: latestBar.sma50,
      sma200: latestBar.sma200,
      rsi14: latestBar.rsi14,
      totalDaysAccumulated: sortedBars.length,
      lastIngestedAt: new Date().toISOString(),
      recentBars: sortedBars.slice(-30), // keep last 30 daily bars in rapid memory
    };

    this.lakeMap.set(sym, record);
    // Periodically save
    if (Math.random() < 0.1) {
      this.save();
    }
  }

  public getOverview(): LakeMetadata {
    let fileSizeKb = 0;
    try {
      if (fs.existsSync(LAKE_FILE)) {
        fileSizeKb = Math.round(fs.statSync(LAKE_FILE).size / 1024);
      }
    } catch (_) {}

    let totalCandles = 0;
    let latestDate = '2026-09-30';

    for (const r of this.lakeMap.values()) {
      totalCandles += (r.totalDaysAccumulated || 1);
      if (r.lastDate && r.lastDate > latestDate) {
        latestDate = r.lastDate;
      }
    }

    return {
      version: '2.0.0',
      lastUpdated: this.lastUpdated,
      totalStocksIndexed: this.lakeMap.size,
      totalDailyCandlesStored: totalCandles,
      lakeStorageSizeKb: fileSizeKb,
      latestSessionDate: latestDate,
      isIngesting: this.isIngesting,
      lastIngestionRun: this.lastUpdated,
    };
  }

  public getStocks(query: {
    page?: number;
    limit?: number;
    search?: string;
    sector?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): {
    total: number;
    page: number;
    limit: number;
    stocks: StockLakeRecord[];
  } {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(10, query.limit || 50));
    const search = (query.search || '').trim().toLowerCase();
    const sector = (query.sector || '').trim();

    let list = Array.from(this.lakeMap.values());

    if (search) {
      list = list.filter(s =>
        s.symbol.toLowerCase().includes(search) ||
        s.name.toLowerCase().includes(search) ||
        s.sector.toLowerCase().includes(search)
      );
    }

    if (sector && sector !== 'ALL') {
      list = list.filter(s => s.sector.toLowerCase() === sector.toLowerCase());
    }

    // Sort by default on volume descending
    list.sort((a, b) => (b.volume || 0) - (a.volume || 0));

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      stocks: paginated,
    };
  }

  public getStock(symbol: string): StockLakeRecord | undefined {
    return this.lakeMap.get(symbol.toUpperCase());
  }

  public setIngesting(val: boolean) {
    this.isIngesting = val;
  }
}
