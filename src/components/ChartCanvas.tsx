import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Maximize2, 
  Layers, 
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { DailyBar, StockPayload } from '../types/market';

interface ChartCanvasProps {
  stockData: StockPayload;
}

export const ChartCanvas: React.FC<ChartCanvasProps> = ({ stockData }) => {
  const [chartType, setChartType] = useState<'candlestick' | 'area'>('candlestick');
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRsi, setShowRsi] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const { meta, bars } = stockData;

  // Chart Dimensions
  const svgWidth = 1000;
  const mainHeight = showRsi ? 300 : 360;
  const volHeight = 70;
  const rsiHeight = showRsi ? 100 : 0;
  const totalSvgHeight = mainHeight + (showVolume ? volHeight : 0) + rsiHeight + 30;

  const padding = { top: 25, right: 70, bottom: 25, left: 15 };
  const chartWidth = svgWidth - padding.left - padding.right;

  // Min and Max prices for scale
  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (bars.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 100 };
    let min = Infinity;
    let max = -Infinity;
    let mv = 0;

    bars.forEach(b => {
      if (b.low < min) min = b.low;
      if (b.high > max) max = b.high;
      if (b.volume > mv) mv = b.volume;
    });

    // 4% padding on price axis
    const diff = max - min || 1;
    return {
      minPrice: Math.max(0, min - diff * 0.04),
      maxPrice: max + diff * 0.04,
      maxVol: mv || 1,
    };
  }, [bars]);

  // Coordinate transforms
  const getX = (index: number) => {
    if (bars.length <= 1) return padding.left;
    return padding.left + (index / (bars.length - 1)) * chartWidth;
  };

  const getY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return padding.top + (1 - (price - minPrice) / range) * (mainHeight - padding.top - 10);
  };

  const getVolY = (vol: number) => {
    const topY = mainHeight + 10;
    const h = (vol / maxVol) * (volHeight - 15);
    return topY + volHeight - h;
  };

  const getRsiY = (rsi: number) => {
    const topY = mainHeight + (showVolume ? volHeight : 0) + 15;
    return topY + (1 - rsi / 100) * (rsiHeight - 25);
  };

  // Paths for Line/Area
  const areaPath = useMemo(() => {
    if (bars.length === 0) return '';
    const points = bars.map((b, i) => `${getX(i)},${getY(b.close)}`);
    const firstX = getX(0);
    const lastX = getX(bars.length - 1);
    const bottomY = mainHeight;
    return `M ${firstX},${bottomY} L ${points.join(' L ')} L ${lastX},${bottomY} Z`;
  }, [bars, minPrice, maxPrice]);

  const linePath = useMemo(() => {
    if (bars.length === 0) return '';
    return bars.map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(b.close)}`).join(' ');
  }, [bars, minPrice, maxPrice]);

  // SMA Paths
  const sma20Path = useMemo(() => {
    const valid = bars.map((b, i) => ({ val: b.sma20, i })).filter(item => item.val !== undefined);
    if (valid.length === 0) return '';
    return valid.map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(item.i)},${getY(item.val!)}`).join(' ');
  }, [bars, minPrice, maxPrice]);

  const sma50Path = useMemo(() => {
    const valid = bars.map((b, i) => ({ val: b.sma50, i })).filter(item => item.val !== undefined);
    if (valid.length === 0) return '';
    return valid.map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(item.i)},${getY(item.val!)}`).join(' ');
  }, [bars, minPrice, maxPrice]);

  const sma200Path = useMemo(() => {
    const valid = bars.map((b, i) => ({ val: b.sma200, i })).filter(item => item.val !== undefined);
    if (valid.length === 0) return '';
    return valid.map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(item.i)},${getY(item.val!)}`).join(' ');
  }, [bars, minPrice, maxPrice]);

  // RSI Path
  const rsiPath = useMemo(() => {
    if (!showRsi) return '';
    const valid = bars.map((b, i) => ({ val: b.rsi14, i })).filter(item => item.val !== undefined);
    if (valid.length === 0) return '';
    return valid.map((item, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(item.i)},${getRsiY(item.val!)}`).join(' ');
  }, [bars, showRsi]);

  // Price Grid Levels
  const priceLevels = useMemo(() => {
    const count = 5;
    const step = (maxPrice - minPrice) / count;
    return Array.from({ length: count + 1 }, (_, i) => minPrice + i * step);
  }, [minPrice, maxPrice]);

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    
    // Find closest candle
    const clampedX = Math.max(padding.left, Math.min(padding.left + chartWidth, mouseX));
    const ratio = (clampedX - padding.left) / chartWidth;
    const index = Math.round(ratio * (bars.length - 1));
    if (index >= 0 && index < bars.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeBar = hoverIndex !== null && bars[hoverIndex] ? bars[hoverIndex] : bars[bars.length - 1];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Top Header: Stock Info & Indicator Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono-num text-white">
              {meta.symbol}
            </span>
            <span className="text-xs text-slate-400 font-medium">· {meta.name}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
              NSE: {meta.exchange}
            </span>
          </div>

          {activeBar && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num mt-1 text-slate-300">
              <span className="text-slate-400 font-sans">{activeBar.date}</span>
              <span>O: <span className="text-slate-100 font-semibold">₹{activeBar.open}</span></span>
              <span>H: <span className="text-emerald-400 font-semibold">₹{activeBar.high}</span></span>
              <span>L: <span className="text-rose-400 font-semibold">₹{activeBar.low}</span></span>
              <span>C: <span className="text-slate-100 font-semibold">₹{activeBar.close}</span></span>
              <span className={`font-semibold ${activeBar.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeBar.change >= 0 ? '+' : ''}{activeBar.changePercent.toFixed(2)}% (₹{activeBar.change.toFixed(2)})
              </span>
              <span className="text-slate-400">Vol: <span className="text-slate-200">{activeBar.volume.toLocaleString('en-IN')}</span></span>
            </div>
          )}
        </div>

        {/* Chart View Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Candlestick vs Area */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                chartType === 'candlestick' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                chartType === 'area' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Area / Line
            </button>
          </div>

          {/* Indicators Overlays */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setShowSma20(!showSma20)}
              className={`px-2 py-1 rounded-md border text-[11px] font-mono-num transition-colors ${
                showSma20
                  ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              SMA 20
            </button>

            <button
              onClick={() => setShowSma50(!showSma50)}
              className={`px-2 py-1 rounded-md border text-[11px] font-mono-num transition-colors ${
                showSma50
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              SMA 50
            </button>

            <button
              onClick={() => setShowSma200(!showSma200)}
              className={`px-2 py-1 rounded-md border text-[11px] font-mono-num transition-colors ${
                showSma200
                  ? 'bg-purple-950/60 border-purple-700 text-purple-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              SMA 200
            </button>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                showVolume
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              Vol
            </button>

            <button
              onClick={() => setShowRsi(!showRsi)}
              className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                showRsi
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              RSI (14)
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Chart */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden select-none bg-slate-950/60 rounded-xl border border-slate-800/80 p-2"
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${totalSvgHeight}`}
          className="w-full h-auto block cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Price Axis */}
          {priceLevels.map((p, idx) => {
            const y = getY(p);
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left + chartWidth + 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  textAnchor="start"
                >
                  ₹{p.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 52-Week High Horizontal Guideline */}
          <line
            x1={padding.left}
            y1={getY(meta.high52w)}
            x2={padding.left + chartWidth}
            y2={getY(meta.high52w)}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          <text
            x={padding.left + 5}
            y={getY(meta.high52w) - 5}
            fill="#10b981"
            fontSize="9"
            fontFamily="JetBrains Mono"
            fillOpacity="0.8"
          >
            52W High: ₹{meta.high52w.toFixed(1)}
          </text>

          {/* 52-Week Low Horizontal Guideline */}
          <line
            x1={padding.left}
            y1={getY(meta.low52w)}
            x2={padding.left + chartWidth}
            y2={getY(meta.low52w)}
            stroke="#f43f5e"
            strokeDasharray="4 4"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          <text
            x={padding.left + 5}
            y={getY(meta.low52w) - 5}
            fill="#f43f5e"
            fontSize="9"
            fontFamily="JetBrains Mono"
            fillOpacity="0.8"
          >
            52W Low: ₹{meta.low52w.toFixed(1)}
          </text>

          {/* AREA CHART MODE */}
          {chartType === 'area' && (
            <>
              <path d={areaPath} fill="url(#areaGradient)" />
              <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="2" />
            </>
          )}

          {/* CANDLESTICK CHART MODE */}
          {chartType === 'candlestick' && (
            <g>
              {bars.map((bar, i) => {
                const x = getX(i);
                const openY = getY(bar.open);
                const closeY = getY(bar.close);
                const highY = getY(bar.high);
                const lowY = getY(bar.low);
                const isGreen = bar.close >= bar.open;
                const candleColor = isGreen ? '#10b981' : '#f43f5e';
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
                const candleWidth = Math.max(2, (chartWidth / bars.length) * 0.7);

                return (
                  <g key={bar.date}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={candleColor}
                      strokeWidth="1"
                    />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={candleColor}
                      rx="0.5"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Moving Average Overlays */}
          {showSma20 && sma20Path && (
            <path d={sma20Path} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeOpacity="0.85" />
          )}
          {showSma50 && sma50Path && (
            <path d={sma50Path} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.85" />
          )}
          {showSma200 && sma200Path && (
            <path d={sma200Path} fill="none" stroke="#c084fc" strokeWidth="1.5" strokeOpacity="0.85" />
          )}

          {/* VOLUME SUB-GRAPH */}
          {showVolume && (
            <g>
              <line
                x1={padding.left}
                y1={mainHeight + 10}
                x2={padding.left + chartWidth}
                y2={mainHeight + 10}
                stroke="#334155"
                strokeWidth="1"
              />
              <text
                x={padding.left + 5}
                y={mainHeight + 22}
                fill="#64748b"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                Volume (20-Day Avg: {(meta.averageDailyVolume / 100000).toFixed(1)}L)
              </text>
              {bars.map((bar, i) => {
                const x = getX(i);
                const barY = getVolY(bar.volume);
                const isGreen = bar.change >= 0;
                const candleWidth = Math.max(1.5, (chartWidth / bars.length) * 0.7);
                const h = Math.max(1, (mainHeight + 10 + volHeight) - barY);

                return (
                  <rect
                    key={bar.date}
                    x={x - candleWidth / 2}
                    y={barY}
                    width={candleWidth}
                    height={h}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    fillOpacity="0.4"
                  />
                );
              })}
            </g>
          )}

          {/* RSI SUB-GRAPH */}
          {showRsi && (
            <g>
              {/* RSI Top Border */}
              <line
                x1={padding.left}
                y1={mainHeight + (showVolume ? volHeight : 0) + 15}
                x2={padding.left + chartWidth}
                y2={mainHeight + (showVolume ? volHeight : 0) + 15}
                stroke="#334155"
                strokeWidth="1"
              />
              {/* 70 Level (Overbought) */}
              <line
                x1={padding.left}
                y1={getRsiY(70)}
                x2={padding.left + chartWidth}
                y2={getRsiY(70)}
                stroke="#f59e0b"
                strokeDasharray="2 2"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
              <text
                x={padding.left + chartWidth + 8}
                y={getRsiY(70) + 3}
                fill="#f59e0b"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                70
              </text>
              {/* 30 Level (Oversold) */}
              <line
                x1={padding.left}
                y1={getRsiY(30)}
                x2={padding.left + chartWidth}
                y2={getRsiY(30)}
                stroke="#06b6d4"
                strokeDasharray="2 2"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
              <text
                x={padding.left + chartWidth + 8}
                y={getRsiY(30) + 3}
                fill="#06b6d4"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                30
              </text>

              {/* RSI Path */}
              {rsiPath && (
                <path d={rsiPath} fill="none" stroke="#10b981" strokeWidth="1.5" />
              )}
              <text
                x={padding.left + 5}
                y={mainHeight + (showVolume ? volHeight : 0) + 28}
                fill="#64748b"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                RSI (14): {activeBar?.rsi14?.toFixed(1) ?? '--'}
              </text>
            </g>
          )}

          {/* Dates along Bottom Axis */}
          {bars.length > 0 && [0, Math.floor(bars.length * 0.25), Math.floor(bars.length * 0.5), Math.floor(bars.length * 0.75), bars.length - 1].map((idx) => {
            const b = bars[idx];
            if (!b) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={totalSvgHeight - 5}
                fill="#64748b"
                fontSize="10"
                fontFamily="JetBrains Mono"
                textAnchor={idx === 0 ? 'start' : idx === bars.length - 1 ? 'end' : 'middle'}
              >
                {b.date}
              </text>
            );
          })}

          {/* Interactive Crosshair & Hover Tooltip */}
          {hoverIndex !== null && bars[hoverIndex] && (
            <g>
              {/* Vertical line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={totalSvgHeight - 20}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {/* Horizontal line at Close */}
              <line
                x1={padding.left}
                y1={getY(bars[hoverIndex].close)}
                x2={padding.left + chartWidth}
                y2={getY(bars[hoverIndex].close)}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {/* Point on close */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(bars[hoverIndex].close)}
                r="4"
                fill="#818cf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
