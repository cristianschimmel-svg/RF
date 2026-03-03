'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { InteractiveMarketChart, MiniMarketChart } from './market-chart';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, VariationBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn, formatNumber } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Building2,
  Clock,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

// Importar CandlestickChart dinámicamente sin SSR
const CandlestickChart = dynamic(
  () => import('./candlestick-chart').then(mod => mod.CandlestickChart),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-[#0a0a0a] rounded-lg h-[350px] animate-pulse flex items-center justify-center">
        <span className="text-slate-500">Cargando gráfico...</span>
      </div>
    )
  }
);

interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketSummary {
  indices: MarketIndex[];
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  mostActive: StockQuote[];
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  lastUpdate: Date;
  isFallback?: boolean;
  disclaimer?: string;
}

interface ArgentinaMarketWidgetProps {
  initialData?: MarketSummary;
  initialHistorical?: HistoricalData[];
  className?: string;
  showFullChart?: boolean;
}

const MarketStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
    'open': { 
      label: 'Mercado Abierto', 
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
      dotColor: 'bg-emerald-500',
    },
    'closed': { 
      label: 'Mercado Cerrado', 
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      dotColor: 'bg-slate-400',
    },
    'pre-market': { 
      label: 'Pre-Apertura', 
      color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
      dotColor: 'bg-amber-500',
    },
    'after-hours': { 
      label: 'Post-Cierre', 
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400',
      dotColor: 'bg-blue-500',
    },
  };

  const config = statusConfig[status] || statusConfig.closed;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dotColor)} />
      {config.label}
    </span>
  );
};

const StockRow = ({ stock }: { stock: StockQuote }) => {
  const trend = stock.changePercent > 0 ? 'up' : stock.changePercent < 0 ? 'down' : 'neutral';
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 dark:border-slate-800/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold text-text-primary dark:text-white">
          {stock.symbol}
        </span>
        <span className="text-xs text-text-muted dark:text-slate-500 truncate max-w-[100px]">
          {stock.name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-text-primary dark:text-white">
          ${formatNumber(stock.price, { decimals: 2 })}
        </span>
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-medium',
          trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
          trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
          'text-slate-500 dark:text-slate-400'
        )}>
          <TrendIcon className="w-3 h-3" />
          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

const IndexCard = ({ 
  index, 
  isSelected, 
  onClick,
  showMiniChart = true,
}: { 
  index: MarketIndex; 
  isSelected?: boolean;
  onClick?: () => void;
  showMiniChart?: boolean;
}) => {
  const trend = index.changePercent > 0 ? 'up' : index.changePercent < 0 ? 'down' : 'neutral';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;
  
  // Mock sparkline data
  const sparklineData = Array.from({ length: 20 }, (_, i) => 
    index.value * (1 + (Math.random() - 0.5) * 0.02)
  );
  sparklineData[sparklineData.length - 1] = index.value;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg border transition-all text-left',
        isSelected 
          ? 'border-accent dark:border-cyan-500 bg-accent/5 dark:bg-cyan-950/20' 
          : 'border-border dark:border-slate-800 hover:border-accent/50 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs text-text-muted dark:text-slate-500">{index.symbol}</span>
          <h4 className="font-semibold text-sm text-text-primary dark:text-white truncate">
            {index.name}
          </h4>
        </div>
        <TrendIcon className={cn(
          'w-4 h-4',
          trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'
        )} />
      </div>
      
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold font-mono text-text-primary dark:text-white">
            {index.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </div>
          <div className={cn(
            'text-xs font-medium',
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
            trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
            'text-slate-500'
          )}>
            {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
          </div>
        </div>
        
        {showMiniChart && (
          <MiniMarketChart 
            data={sparklineData} 
            trend={trend} 
            height={32}
            className="w-16"
          />
        )}
      </div>
    </button>
  );
};

export function ArgentinaMarketWidget({
  initialData,
  initialHistorical,
  className,
  showFullChart = true,
}: ArgentinaMarketWidgetProps) {
  const [marketData, setMarketData] = useState<MarketSummary | null>(initialData || null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>(initialHistorical || []);
  const [selectedIndex, setSelectedIndex] = useState<'MERVAL' | 'GENERAL'>('MERVAL');
  const [selectedPeriod, setSelectedPeriod] = useState('1M');
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch from API route
      const [summaryRes, historicalRes] = await Promise.all([
        fetch('/api/market/summary'),
        fetch(`/api/market/historical?symbol=${selectedIndex}&period=${selectedPeriod}`),
      ]);

      if (!summaryRes.ok) throw new Error('Error fetching market data');
      
      const summary = await summaryRes.json();
      setMarketData(summary);

      if (historicalRes.ok) {
        const historical = await historicalRes.json();
        setHistoricalData(historical);
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('No se pudieron cargar los datos del mercado');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIndex, selectedPeriod]);

  useEffect(() => {
    if (!initialData) {
      fetchMarketData();
    }
  }, [fetchMarketData, initialData]);

  useEffect(() => {
    if (initialData) {
      // Fetch historical when period/index changes
      fetch(`/api/market/historical?symbol=${selectedIndex}&period=${selectedPeriod}`)
        .then(res => res.json())
        .then(data => setHistoricalData(data))
        .catch(console.error);
    }
  }, [selectedIndex, selectedPeriod, initialData]);

  const currentIndex = marketData?.indices.find(i => i.symbol === selectedIndex);

  if (isLoading && !marketData) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6">
          <div className="h-8 bg-bg-secondary dark:bg-slate-800 rounded w-1/3 mb-4" />
          <div className="h-64 bg-bg-secondary dark:bg-slate-800 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (error && !marketData) {
    return (
      <Card className={cn('border-rose-200 dark:border-rose-900', className)}>
        <CardContent className="p-6 text-center">
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={fetchMarketData}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Reintentar
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 dark:bg-cyan-950/50">
            <Building2 className="w-5 h-5 text-accent dark:text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              Bolsa de Valores Argentina
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <MarketStatusBadge status={marketData?.marketStatus || 'closed'} />
              <span className="text-xs text-text-muted dark:text-slate-500">
                BYMA
              </span>
              {/* Live indicator */}
              {marketData && !marketData.isFallback && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  En vivo
                </span>
              )}
            </div>
          </div>
        </div>
        
        <Link
          href="https://open.bymadata.com.ar"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:text-accent-dark dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          Ver en BYMA
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Fallback Disclaimer */}
      {marketData?.isFallback && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {marketData.disclaimer || 'Datos de referencia. Los valores de acciones individuales son simulados.'}
          </p>
        </div>
      )}

      {/* Index Selector Cards */}
      <div className="grid grid-cols-2 gap-3">
        {marketData?.indices.map((index) => (
          <IndexCard
            key={index.symbol}
            index={index}
            isSelected={selectedIndex === index.symbol}
            onClick={() => setSelectedIndex(index.symbol as 'MERVAL' | 'GENERAL')}
          />
        ))}
      </div>

      {/* Candlestick Chart - Estilo TradingView */}
      {showFullChart && currentIndex && (
        <CandlestickChart
          symbol={currentIndex.symbol}
          title={`BOLSAS Y MERCADOS ARGENTINOS`}
          height={350}
        />
      )}

      {/* Stocks Tabs */}
      <Card>
        <Tabs defaultValue="gainers">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="gainers">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Alzas
                </TabsTrigger>
                <TabsTrigger value="losers">
                  <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Bajas
                </TabsTrigger>
                <TabsTrigger value="active">
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  Vol.
                </TabsTrigger>
              </TabsList>
              <Link
                href="/indicadores/mercados"
                className="text-xs text-accent hover:text-accent-dark flex items-center gap-1"
              >
                Ver en BYMA
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          
          <CardContent className="pt-3">
            <TabsContent value="gainers" className="mt-0">
              {marketData?.topGainers.length ? (
                marketData.topGainers.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))
              ) : (
                <p className="text-sm text-text-muted dark:text-slate-500 text-center py-4">
                  Sin datos de alzas
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="losers" className="mt-0">
              {marketData?.topLosers.length ? (
                marketData.topLosers.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))
              ) : (
                <p className="text-sm text-text-muted dark:text-slate-500 text-center py-4">
                  Sin datos de bajas
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="active" className="mt-0">
              {marketData?.mostActive.length ? (
                marketData.mostActive.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))
              ) : (
                <p className="text-sm text-text-muted dark:text-slate-500 text-center py-4">
                  Sin datos de volumen
                </p>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Footer Disclaimer */}
      <p className="text-2xs text-text-muted dark:text-slate-600 text-center">
        Datos provistos por BYMA con 20 minutos de demora. No constituyen recomendación de inversión.
      </p>
    </div>
  );
}

// Compact version for sidebar or smaller spaces
export function MervalWidget({ className }: { className?: string }) {
  const [indexData, setIndexData] = useState<MarketIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/market/summary')
      .then(res => res.json())
      .then(data => {
        const merval = data.indices?.find((i: MarketIndex) => i.symbol === 'MERVAL');
        setIndexData(merval || null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse h-20 bg-bg-secondary dark:bg-slate-800 rounded-lg', className)} />
    );
  }

  if (!indexData) return null;

  const trend = indexData.changePercent > 0 ? 'up' : indexData.changePercent < 0 ? 'down' : 'neutral';

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-muted dark:text-slate-500">S&P MERVAL</span>
          <Badge 
            size="sm" 
            variant={trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'default'}
          >
            {indexData.changePercent >= 0 ? '+' : ''}{indexData.changePercent.toFixed(2)}%
          </Badge>
        </div>
        <div className="text-xl font-bold font-mono text-text-primary dark:text-white">
          {indexData.value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </div>
      </CardContent>
    </Card>
  );
}
