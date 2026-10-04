import { DailyBar, StockPayload } from '../types/market';

export interface StrategyResult {
  name: string;
  category: 'Trend' | 'Momentum' | 'Volatility' | 'Volume' | 'Price Action' | 'Mean Reversion';
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number; // 0 to 10
  description: string;
  valueDisplay?: string;
}

export interface SwingSignal {
  action: 'BUY' | 'BUY ON DIP' | 'MOMENTUM BREAKOUT' | 'MEAN REVERSION SNAP' | 'HOLD' | 'SELL / AVOID';
  verdict: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL';
  confidenceScore: number; // 0 - 100%
  expectedHorizon: string; // e.g., "Hold 2 to 4 Days"
  suggestedHoldingDays: number;
  entryPrice: number;
  target1: number;
  target1Percent: number;
  target2: number;
  target2Percent: number;
  stopLoss: number;
  stopLossPercent: number;
  riskRewardRatio: number;
  recommendedPositionSizeShares: number;
  recommendedPositionValue: number;
  atr: number;
  marketRegime: 'Trending Up' | 'Trending Down' | 'Range-Bound / Mean Reverting' | 'High Volatility Shock';
  strategiesTriggered: StrategyResult[];
  minerviniScore: {
    passed: number;
    total: number;
    criteria: { text: string; passed: boolean }[];
  };
  stage: {
    stageNumber: 1 | 2 | 3 | 4;
    name: string;
    description: string;
  };
  summaryReason: string;
}

// Technical Math Utilities
function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  if (prices.length === 0) return ema;

  let currentEma = prices[0];
  ema.push(currentEma);

  for (let i = 1; i < prices.length; i++) {
    currentEma = prices[i] * k + currentEma * (1 - k);
    ema.push(currentEma);
  }
  return ema;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateATR(bars: DailyBar[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      tr.push(bars[i].high - bars[i].low);
    } else {
      const hMinusL = bars[i].high - bars[i].low;
      const hMinusPC = Math.abs(bars[i].high - bars[i - 1].close);
      const lMinusPC = Math.abs(bars[i].low - bars[i - 1].close);
      tr.push(Math.max(hMinusL, hMinusPC, lMinusPC));
    }
  }
  return calculateSMA(tr, period);
}

// ADX & DMI calculation
function calculateADX(bars: DailyBar[], period: number = 14) {
  if (bars.length < period * 2) {
    return { adx: 20, plusDI: 20, minusDI: 20 };
  }

  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [bars[0].high - bars[0].low];

  for (let i = 1; i < bars.length; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const hMinusL = bars[i].high - bars[i].low;
    const hMinusPC = Math.abs(bars[i].high - bars[i - 1].close);
    const lMinusPC = Math.abs(bars[i].low - bars[i - 1].close);
    tr.push(Math.max(hMinusL, hMinusPC, lMinusPC));
  }

  const smoothTR = calculateSMA(tr, period);
  const smoothPlusDM = calculateSMA(plusDM, period);
  const smoothMinusDM = calculateSMA(minusDM, period);

  const dxList: number[] = [];
  let plusDI = 0;
  let minusDI = 0;

  for (let i = 0; i < bars.length; i++) {
    const atrVal = smoothTR[i] || 1;
    const pDI = (smoothPlusDM[i] / atrVal) * 100;
    const mDI = (smoothMinusDM[i] / atrVal) * 100;
    plusDI = pDI;
    minusDI = mDI;

    const sum = pDI + mDI;
    const diff = Math.abs(pDI - mDI);
    const dx = sum > 0 ? (diff / sum) * 100 : 0;
    dxList.push(dx);
  }

  const adxList = calculateSMA(dxList, period);
  const currentADX = adxList[adxList.length - 1] || 20;

  return {
    adx: Number(currentADX.toFixed(1)),
    plusDI: Number(plusDI.toFixed(1)),
    minusDI: Number(minusDI.toFixed(1)),
  };
}

// Supertrend calculation (10, 3)
function calculateSupertrend(bars: DailyBar[], period: number = 10, multiplier: number = 3) {
  const atrs = calculateATR(bars, period);
  let direction = 1; // 1 = Bullish, -1 = Bearish
  let supertrendVal = 0;

  for (let i = 0; i < bars.length; i++) {
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const atr = atrs[i] || (bars[i].high - bars[i].low);
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;

    if (i === 0) {
      supertrendVal = lowerBand;
      direction = 1;
      continue;
    }

    if (direction === 1) {
      if (bars[i].close < supertrendVal) {
        direction = -1;
        supertrendVal = upperBand;
      } else {
        supertrendVal = Math.max(supertrendVal, lowerBand);
      }
    } else {
      if (bars[i].close > supertrendVal) {
        direction = 1;
        supertrendVal = lowerBand;
      } else {
        supertrendVal = Math.min(supertrendVal, upperBand);
      }
    }
  }

  return {
    direction: direction === 1 ? 'BULLISH' : 'BEARISH',
    value: Number(supertrendVal.toFixed(2)),
  };
}

// Connors RSI(2) calculation for mean reversion
function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

// Candlestick Pattern Detection
function detectCandlestickPatterns(bars: DailyBar[]) {
  if (bars.length < 3) return { pattern: 'None', isBullish: false };

  const curr = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const pprev = bars[bars.length - 3];

  const bodyCurr = Math.abs(curr.close - curr.open);
  const rangeCurr = curr.high - curr.low || 1;
  const lowerWickCurr = Math.min(curr.open, curr.close) - curr.low;
  const upperWickCurr = curr.high - Math.max(curr.open, curr.close);

  // 1. Hammer / Pin Bar
  if (lowerWickCurr > bodyCurr * 2 && upperWickCurr < bodyCurr * 0.5) {
    return { pattern: 'Bullish Hammer / Pin Bar (Rejection of Lows)', isBullish: true };
  }

  // 2. Bullish Engulfing
  if (prev.close < prev.open && curr.close > curr.open && curr.open <= prev.close && curr.close >= prev.open) {
    return { pattern: 'Bullish Engulfing (Buyers Dominated)', isBullish: true };
  }

  // 3. Morning Star
  if (pprev.close < pprev.open && bodyCurr > (pprev.high - pprev.low) * 0.4 && curr.close > (pprev.open + pprev.close) / 2) {
    return { pattern: 'Morning Star Pattern (Trend Reversal)', isBullish: true };
  }

  // 4. Inside Bar
  if (curr.high < prev.high && curr.low > prev.low) {
    return { pattern: 'Inside Bar (Compression Before Breakout)', isBullish: curr.close > prev.close };
  }

  return { pattern: curr.close > curr.open ? 'Standard Bullish Candle' : 'Standard Bearish Candle', isBullish: curr.close > curr.open };
}

// Core Quantitative Swing Trade Engine
export function analyzeSwingTrade(stockPayload: StockPayload): SwingSignal {
  const { meta, bars } = stockPayload;
  if (bars.length < 30) {
    return generateFallbackSignal(stockPayload);
  }

  const closes = bars.map(b => b.close);
  const volumes = bars.map(b => b.volume);
  const latest = bars[bars.length - 1];
  const currentPrice = latest.close;

  // 1. Moving Averages
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const sma150 = calculateSMA(closes, Math.min(150, closes.length));
  const sma200 = calculateSMA(closes, Math.min(200, closes.length));

  const currEMA20 = ema20[ema20.length - 1];
  const currEMA50 = ema50[ema50.length - 1];
  const currSMA150 = sma150[sma150.length - 1];
  const currSMA200 = sma200[sma200.length - 1];

  // 2. Volatility & ATR
  const atrs = calculateATR(bars, 14);
  const currATR = Math.max(1, atrs[atrs.length - 1] || currentPrice * 0.02);

  // 3. ADX & Trend Strength
  const { adx, plusDI, minusDI } = calculateADX(bars, 14);
  let marketRegime: SwingSignal['marketRegime'] = 'Range-Bound / Mean Reverting';
  if (adx > 25 && plusDI > minusDI) marketRegime = 'Trending Up';
  else if (adx > 25 && minusDI > plusDI) marketRegime = 'Trending Down';
  else if (currATR / currentPrice > 0.045) marketRegime = 'High Volatility Shock';

  // 4. Supertrend
  const supertrend = calculateSupertrend(bars, 10, 3);

  // 5. RSI(14) & Connors RSI(2)
  const rsi14 = latest.rsi14 ?? calculateRSI(closes, 14);
  const rsi2 = calculateRSI(closes, 2);

  // 6. Bollinger Bands
  const sma20Slice = closes.slice(-20);
  const mean20 = sma20Slice.reduce((a, b) => a + b, 0) / 20;
  const std20 = Math.sqrt(sma20Slice.map(x => Math.pow(x - mean20, 2)).reduce((a, b) => a + b, 0) / 20);
  const bbUpper = mean20 + 2 * std20;
  const bbLower = mean20 - 2 * std20;
  const percentB = bbUpper !== bbLower ? (currentPrice - bbLower) / (bbUpper - bbLower) : 0.5;
  const bandwidth = std20 * 4 / (mean20 || 1);
  const isBBSqueeze = bandwidth < 0.08;

  // 7. Volume Confirmation & CMF
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 || 1;
  const relativeVol = latest.volume / avgVol20;

  // Chaikin Money Flow (CMF 20)
  let mfvSum = 0;
  let volSum = 0;
  for (let i = bars.length - 20; i < bars.length; i++) {
    const b = bars[i];
    const clv = (b.high === b.low) ? 0 : ((b.close - b.low) - (b.high - b.close)) / (b.high - b.low);
    mfvSum += clv * b.volume;
    volSum += b.volume;
  }
  const cmf20 = volSum > 0 ? mfvSum / volSum : 0;

  // 8. Candlestick
  const candlePattern = detectCandlestickPatterns(bars);

  // 9. Minervini SEPA Trend Template Evaluation
  const minerviniCriteria = [
    { text: 'Price > 150 SMA and 200 SMA', passed: currentPrice > currSMA150 && currentPrice > currSMA200 },
    { text: '150 SMA > 200 SMA', passed: currSMA150 > currSMA200 },
    { text: '200 SMA rising over last month', passed: currSMA200 >= (sma200[sma200.length - 22] || currSMA200) },
    { text: '50 SMA > 150 SMA and 200 SMA', passed: currEMA50 > currSMA150 && currEMA50 > currSMA200 },
    { text: 'Price > 50 SMA', passed: currentPrice > currEMA50 },
    { text: 'Price at least 30% above 52-Week Low', passed: currentPrice >= meta.low52w * 1.25 },
    { text: 'Price within 25% of 52-Week High', passed: currentPrice >= meta.high52w * 0.75 },
    { text: 'Volume Confirmation on advances', passed: relativeVol >= 1.0 || cmf20 > 0.05 },
  ];
  const minerviniPassedCount = minerviniCriteria.filter(c => c.passed).length;

  // 10. Stan Weinstein Stage Analysis
  let stageNumber: 1 | 2 | 3 | 4 = 1;
  let stageName = 'Stage 1: Basing';
  let stageDesc = 'Sideways consolidation, price moving around flat 150/200 DMA.';

  if (currentPrice > currSMA150 && currSMA150 >= (sma150[sma150.length - 20] || currSMA150)) {
    stageNumber = 2;
    stageName = 'Stage 2: Advancing (Prime Swing Long)';
    stageDesc = 'Institutional accumulation, price above rising 30-week / 150-day moving average.';
  } else if (currentPrice < currSMA150 && currSMA150 <= (sma150[sma150.length - 20] || currSMA150)) {
    stageNumber = 4;
    stageName = 'Stage 4: Declining';
    stageDesc = 'Distribution phase, price below falling long-term moving average. Avoid long swings.';
  } else if (currentPrice > currSMA150 && currSMA150 < (sma150[sma150.length - 20] || currSMA150)) {
    stageNumber = 3;
    stageName = 'Stage 3: Topping / Distribution';
    stageDesc = 'Late cycle volatility and momentum loss.';
  }

  // 11. Compile Strategies Results
  const strategies: StrategyResult[] = [
    {
      name: 'Stacked Moving Averages (EMA 20/50/200)',
      category: 'Trend',
      signal: currentPrice > currEMA20 && currEMA20 > currEMA50 ? 'BULLISH' : currentPrice < currEMA50 ? 'BEARISH' : 'NEUTRAL',
      score: currentPrice > currEMA20 && currEMA20 > currEMA50 ? 10 : currentPrice > currEMA50 ? 6 : 2,
      description: currentPrice > currEMA20 ? 'Price stacked above EMA20 & EMA50.' : 'Trading below intermediate averages.',
      valueDisplay: `EMA20: ₹${currEMA20.toFixed(1)}`,
    },
    {
      name: 'ADX & DMI Trend Strength',
      category: 'Trend',
      signal: plusDI > minusDI && adx > 22 ? 'BULLISH' : minusDI > plusDI ? 'BEARISH' : 'NEUTRAL',
      score: plusDI > minusDI && adx > 25 ? 9 : plusDI > minusDI ? 7 : 3,
      description: adx > 25 ? `Strong ${plusDI > minusDI ? 'bullish' : 'bearish'} trend (ADX ${adx}).` : `Range-bound market (ADX ${adx}).`,
      valueDisplay: `ADX: ${adx} (+DI: ${plusDI})`,
    },
    {
      name: 'Supertrend (10, 3)',
      category: 'Trend',
      signal: supertrend.direction === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      score: supertrend.direction === 'BULLISH' ? 9 : 2,
      description: supertrend.direction === 'BULLISH' ? `Green trailing stop at ₹${supertrend.value}.` : `Red trailing resistance at ₹${supertrend.value}.`,
      valueDisplay: `Stop: ₹${supertrend.value}`,
    },
    {
      name: 'RSI(14) Momentum & Pullback Zone',
      category: 'Momentum',
      signal: rsi14 >= 45 && rsi14 <= 68 ? 'BULLISH' : rsi14 > 75 ? 'NEUTRAL' : rsi14 < 35 ? 'NEUTRAL' : 'BULLISH',
      score: rsi14 >= 45 && rsi14 <= 65 ? 10 : rsi14 > 70 ? 5 : 4,
      description: rsi14 >= 45 && rsi14 <= 65 ? 'Ideal bullish momentum pullback zone (45–65).' : rsi14 > 70 ? 'Overbought territory.' : 'Oversold / Weak.',
      valueDisplay: `RSI: ${rsi14}`,
    },
    {
      name: 'Bollinger Band Squeeze & Breakout',
      category: 'Volatility',
      signal: isBBSqueeze ? 'BULLISH' : percentB > 0.5 ? 'BULLISH' : 'BEARISH',
      score: isBBSqueeze ? 10 : 7,
      description: isBBSqueeze ? 'Volatility compressed (%Bandwidth low) - big move imminent!' : `%B positioned at ${(percentB * 100).toFixed(0)}%.`,
      valueDisplay: `%B: ${(percentB * 100).toFixed(0)}%`,
    },
    {
      name: 'Volume & Chaikin Money Flow (CMF)',
      category: 'Volume',
      signal: cmf20 > 0.05 && relativeVol >= 1.0 ? 'BULLISH' : cmf20 > 0 ? 'BULLISH' : 'NEUTRAL',
      score: cmf20 > 0.08 ? 10 : cmf20 > 0 ? 7 : 3,
      description: cmf20 > 0 ? `Net institutional money inflow (CMF +${cmf20.toFixed(2)}).` : 'Outflow or neutral volume.',
      valueDisplay: `Rel Vol: ${relativeVol.toFixed(1)}x`,
    },
    {
      name: 'Candlestick Action at Pivot Level',
      category: 'Price Action',
      signal: candlePattern.isBullish ? 'BULLISH' : 'NEUTRAL',
      score: candlePattern.isBullish ? 8 : 4,
      description: candlePattern.pattern,
      valueDisplay: candlePattern.pattern.split(' ')[0],
    },
    {
      name: 'Connors RSI(2) Short-Term Dip',
      category: 'Mean Reversion',
      signal: rsi2 < 15 && currentPrice > currSMA200 ? 'BULLISH' : rsi2 < 25 ? 'BULLISH' : 'NEUTRAL',
      score: rsi2 < 12 && currentPrice > currSMA200 ? 10 : 5,
      description: rsi2 < 15 ? `Short-term 2-day dip (RSI2: ${rsi2}) ready for 2-4 day snapback.` : `RSI(2) at ${rsi2}.`,
      valueDisplay: `RSI(2): ${rsi2}`,
    },
  ];

  // 12. Calculate Composite Confidence Score
  const totalScore = strategies.reduce((acc, s) => acc + s.score, 0);
  const maxPossible = strategies.length * 10;
  let confidenceScore = Math.round((totalScore / maxPossible) * 100);

  // Bonus for Minervini Stage 2
  if (stageNumber === 2) confidenceScore = Math.min(98, confidenceScore + 6);
  if (minerviniPassedCount >= 6) confidenceScore = Math.min(99, confidenceScore + 5);

  // Penalize Stage 4 or severe downtrends
  if (stageNumber === 4) confidenceScore = Math.max(15, confidenceScore - 25);

  // 13. Determine Specific Action & Holding Horizon
  let action: SwingSignal['action'] = 'BUY';
  let verdict: SwingSignal['verdict'] = 'BUY';
  let expectedHorizon = 'Hold 2 to 5 Days';
  let suggestedHoldingDays = 3;

  if (confidenceScore >= 82) {
    if (rsi2 < 20) {
      action = 'MEAN REVERSION SNAP';
      expectedHorizon = 'Hold 2 to 3 Days';
      suggestedHoldingDays = 2;
    } else if (isBBSqueeze || relativeVol > 1.8) {
      action = 'MOMENTUM BREAKOUT';
      expectedHorizon = 'Hold 3 to 6 Days';
      suggestedHoldingDays = 4;
    } else {
      action = 'BUY';
      expectedHorizon = 'Hold 3 to 5 Days';
      suggestedHoldingDays = 3;
    }
    verdict = 'STRONG BUY';
  } else if (confidenceScore >= 68) {
    action = 'BUY ON DIP';
    verdict = 'BUY';
    expectedHorizon = 'Hold 3 to 7 Days';
    suggestedHoldingDays = 4;
  } else if (confidenceScore >= 45) {
    action = 'HOLD';
    verdict = 'NEUTRAL';
    expectedHorizon = 'Wait for Setup Trigger';
    suggestedHoldingDays = 0;
  } else {
    action = 'SELL / AVOID';
    verdict = 'SELL';
    expectedHorizon = 'Exit or Stay Flat';
    suggestedHoldingDays = 0;
  }

  // 14. Target and Stop Loss Calculation via ATR
  // Stop Loss = Entry - 1.5 * ATR
  // Target 1 = Entry + 2.0 * ATR
  // Target 2 = Entry + 3.5 * ATR
  const stopLoss = Math.max(1, Number((currentPrice - 1.4 * currATR).toFixed(2)));
  const target1 = Number((currentPrice + 2.1 * currATR).toFixed(2));
  const target2 = Number((currentPrice + 3.8 * currATR).toFixed(2));

  const stopLossPercent = Number((((currentPrice - stopLoss) / currentPrice) * 100).toFixed(2));
  const target1Percent = Number((((target1 - currentPrice) / currentPrice) * 100).toFixed(2));
  const target2Percent = Number((((target2 - currentPrice) / currentPrice) * 100).toFixed(2));

  const risk = currentPrice - stopLoss || 1;
  const reward = target1 - currentPrice;
  const riskRewardRatio = Number((reward / risk).toFixed(2));

  // Risk Management: 1% risk per trade on ₹1,00,000 capital = ₹1,000 risk
  const riskPerTradeINR = 1000;
  const positionShares = Math.max(1, Math.floor(riskPerTradeINR / risk));
  const positionValue = Math.round(positionShares * currentPrice);

  const summaryReason = `Confluence of ${strategies.filter(s => s.signal === 'BULLISH').length}/${strategies.length} quantitative strategies in ${stageName}. ADX: ${adx} (${marketRegime}). Target 1: ₹${target1} (+${target1Percent}%) with ATR stop at ₹${stopLoss} (-${stopLossPercent}%).`;

  return {
    action,
    verdict,
    confidenceScore,
    expectedHorizon,
    suggestedHoldingDays,
    entryPrice: currentPrice,
    target1,
    target1Percent,
    target2,
    target2Percent,
    stopLoss,
    stopLossPercent,
    riskRewardRatio,
    recommendedPositionSizeShares: positionShares,
    recommendedPositionValue: positionValue,
    atr: Number(currATR.toFixed(2)),
    marketRegime,
    strategiesTriggered: strategies,
    minerviniScore: {
      passed: minerviniPassedCount,
      total: minerviniCriteria.length,
      criteria: minerviniCriteria,
    },
    stage: {
      stageNumber,
      name: stageName,
      description: stageDesc,
    },
    summaryReason,
  };
}

function generateFallbackSignal(stockPayload: StockPayload): SwingSignal {
  const price = stockPayload.meta.currentPrice || 100;
  return {
    action: 'HOLD',
    verdict: 'NEUTRAL',
    confidenceScore: 50,
    expectedHorizon: 'Hold 3 to 5 Days',
    suggestedHoldingDays: 3,
    entryPrice: price,
    target1: Number((price * 1.04).toFixed(2)),
    target1Percent: 4,
    target2: Number((price * 1.08).toFixed(2)),
    target2Percent: 8,
    stopLoss: Number((price * 0.97).toFixed(2)),
    stopLossPercent: 3,
    riskRewardRatio: 1.33,
    recommendedPositionSizeShares: 10,
    recommendedPositionValue: price * 10,
    atr: Number((price * 0.02).toFixed(2)),
    marketRegime: 'Range-Bound / Mean Reverting',
    strategiesTriggered: [],
    minerviniScore: { passed: 4, total: 8, criteria: [] },
    stage: { stageNumber: 1, name: 'Stage 1: Basing', description: 'Limited historical candles available.' },
    summaryReason: 'Insufficient candles to compute full 36-strategy quantitative model.',
  };
}
