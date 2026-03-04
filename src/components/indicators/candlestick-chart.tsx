'use client';

import { useEffect, useRef, useState } from 'react';

interface CandlestickChartProps {
  symbol: string;
  title?: string;
  height?: number;
  className?: string;
}

interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Generar datos de ejemplo realistas basados en BYMA
function generateSampleData(basePrice: number = 320, days: number = 90): OHLCData[] {
  const data: OHLCData[] = [];
  let currentPrice = basePrice;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    // Random price movement
    const volatility = 0.02;
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    
    currentPrice = close;
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });
  }
  
  return data;
}

export function CandlestickChart({ symbol, title, height = 350, className }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [ohlcData, setOhlcData] = useState<OHLCData | null>(null);
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !chartContainerRef.current) return;

    let mounted = true;

    const initChart = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real historical data from API
        let chartData: OHLCData[];
        try {
          const res = await fetch(`/api/market/historical?symbol=${symbol}&period=3M`);
          if (res.ok) {
            const rawData = await res.json();
            chartData = rawData
              .filter((d: any) => d.close != null)
              .map((d: any) => ({
                time: new Date(d.date).toISOString().split('T')[0],
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume || 0,
              }))
              // Deduplicate by date (keep last occurrence)
              .filter((d: OHLCData, i: number, arr: OHLCData[]) => 
                i === arr.length - 1 || arr[i + 1].time !== d.time
              );
          } else {
            throw new Error('API error');
          }
        } catch {
          // Fallback to generated data only if API fails
          chartData = generateSampleData(2600000, 90);
        }

        if (!mounted || !chartContainerRef.current || chartData.length === 0) return;

        // Dynamic import - lightweight-charts v5
        const lc = await import('lightweight-charts');
        
        if (!mounted || !chartContainerRef.current) return;
        
        // Calculate price change from real data
        if (chartData.length >= 2) {
          const lastBar = chartData[chartData.length - 1];
          const prevBar = chartData[chartData.length - 2];
          const change = lastBar.close - prevBar.close;
          const percent = (change / prevBar.close) * 100;
          setPriceChange({ value: change, percent });
          setOhlcData(lastBar);
        }

        // Create chart - v5 API
        const chart = lc.createChart(chartContainerRef.current, {
          layout: {
            background: { type: lc.ColorType.Solid, color: '#0a0a0a' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
          },
          crosshair: {
            mode: lc.CrosshairMode.Normal,
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
          timeScale: {
            borderColor: '#374151',
            timeVisible: true,
          },
          width: chartContainerRef.current.clientWidth,
          height: height,
        });

        chartRef.current = chart;

        // Add candlestick series - v5 uses addSeries with type
        const candleSeries = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });

        seriesRef.current = candleSeries;

        // Set data
        candleSeries.setData(chartData.map(d => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })));

        chart.timeScale().fitContent();

        // Crosshair move handler
        chart.subscribeCrosshairMove((param: any) => {
          if (param.time && param.seriesData) {
            const data = param.seriesData.get(candleSeries);
            if (data) {
              setOhlcData({
                time: String(param.time),
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close,
              });
            }
          } else if (chartData.length > 0) {
            setOhlcData(chartData[chartData.length - 1]);
          }
        });

        // Resize handler
        const handleResize = () => {
          if (chartContainerRef.current && chartRef.current) {
            chartRef.current.applyOptions({ 
              width: chartContainerRef.current.clientWidth 
            });
          }
        };

        window.addEventListener('resize', handleResize);
        setIsLoading(false);

        return () => {
          window.removeEventListener('resize', handleResize);
        };

      } catch (err) {
        console.error('Error initializing chart:', err);
        setError('Error al cargar el gráfico');
        setIsLoading(false);
      }
    };

    initChart();

    return () => {
      mounted = false;
      if (chartRef.current) {
        try {
          chartRef.current.remove();
          chartRef.current = null;
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isClient, height, symbol]);

  if (error) {
    return (
      <div className={`bg-[#0a0a0a] rounded-lg overflow-hidden ${className || ''}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <span className="text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[#0a0a0a] rounded-lg overflow-hidden ${className || ''}`}>
      {/* Header OHLC */}
      <div className="px-3 sm:px-4 py-2 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          <span className="text-cyan-400 font-medium">
            {title || symbol}, D
          </span>
          {ohlcData && (
            <>
              <span className="text-slate-500">
                O<span className="text-slate-300 ml-1">{ohlcData.open.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </span>
              <span className="text-slate-500">
                H<span className="text-green-400 ml-1">{ohlcData.high.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </span>
              <span className="text-slate-500">
                L<span className="text-red-400 ml-1">{ohlcData.low.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </span>
              <span className="text-slate-500">
                C<span className="text-slate-300 ml-1">{ohlcData.close.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </span>
              {priceChange && (
                <span className={priceChange.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {priceChange.value >= 0 ? '+' : ''}{priceChange.value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ({priceChange.percent >= 0 ? '+' : ''}{priceChange.percent.toFixed(2)}%)
                </span>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Chart container */}
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ height }}
      >
        {(isLoading || !isClient) && (
          <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
            <span className="text-slate-500 animate-pulse">Cargando gráfico...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniCandlestickChart({ 
  width = 100, 
  height = 40,
  className 
}: { 
  width?: number; 
  height?: number;
  className?: string;
}) {
  return (
    <div 
      className={`bg-slate-900/50 rounded ${className || ''}`}
      style={{ width, height }}
    />
  );
}
