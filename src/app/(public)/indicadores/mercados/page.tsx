import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArgentinaMarketWidget } from '@/components/indicators/argentina-market';
import { getMarketSummary, getIndexHistorical, formatIndexValue, formatVariation } from '@/lib/services/byma-service';
import type { StockQuote } from '@/lib/services/byma-service';
import {
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { Trend } from '@/types';

export const revalidate = 120;

export const metadata = {
  title: 'Acciones | Rosario Finanzas',
  description: 'S&P Merval, acciones líderes, top ganadores y perdedores del mercado argentino.',
};

export default async function MercadosPage() {
  const [marketSummary, mervalHistorical] = await Promise.all([
    getMarketSummary(),
    getIndexHistorical('MERVAL', '1M'),
  ]);

  const { indices, topGainers, topLosers, mostActive, marketStatus } = marketSummary;
  const merval = indices.find(i => i.symbol === 'MERVAL');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Acciones
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Mercado {marketStatus === 'open' ? 'abierto' : marketStatus === 'pre-market' ? 'pre-mercado' : 'cerrado'}
            {' — Fuente: Yahoo Finance / BYMA'}
          </p>
        </div>
        <Badge 
          variant={marketStatus === 'open' ? 'accent' : 'default'} 
          size="sm"
          className={marketStatus === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : ''}
        >
          {marketStatus === 'open' ? '● Mercado Abierto' : marketStatus === 'pre-market' ? '◐ Pre-Mercado' : '○ Cerrado'}
        </Badge>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {indices.map((index) => {
          const trend: Trend = index.changePercent > 0 ? 'up' : index.changePercent < 0 ? 'down' : 'neutral';
          const colors = {
            up: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30',
            down: 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30',
            neutral: 'border-border dark:border-slate-700 bg-surface dark:bg-slate-900/50',
          };
          return (
            <div key={index.symbol} className={`rounded-lg border p-4 ${colors[trend]}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">{index.name}</h3>
                <span className="text-2xs text-text-muted dark:text-slate-400">{index.symbol}</span>
              </div>
              <p className="text-2xl font-bold font-mono text-text-primary dark:text-white">
                {formatIndexValue(index.value)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : trend === 'down' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}`}>
                  {formatVariation(index.changePercent)}
                </span>
                <span className="text-2xs text-text-muted dark:text-slate-500">
                  ({index.change > 0 ? '+' : ''}{formatIndexValue(index.change)})
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-muted dark:border-slate-700/50 text-2xs text-text-muted dark:text-slate-500">
                <span>Máx: {formatIndexValue(index.high)}</span>
                <span>Mín: {formatIndexValue(index.low)}</span>
                <span>Cierre ant: {formatIndexValue(index.previousClose)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <ArgentinaMarketWidget 
        initialData={marketSummary}
        initialHistorical={mervalHistorical}
        showFullChart={true}
      />

      {/* Top Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gainers */}
        <Card>
          <CardHeader title="Top Ganadores" />
          <CardContent>
            {topGainers.length > 0 ? (
              <div className="space-y-2">
                {topGainers.map((stock, i) => (
                  <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted dark:text-slate-400">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Losers */}
        <Card>
          <CardHeader title="Top Perdedores" />
          <CardContent>
            {topLosers.length > 0 ? (
              <div className="space-y-2">
                {topLosers.map((stock, i) => (
                  <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted dark:text-slate-400">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Most Active */}
      <Card>
        <CardHeader title="Más Operadas (por volumen)" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-text-muted dark:text-slate-400">Símbolo</th>
                  <th className="text-left py-2 font-medium text-text-muted dark:text-slate-400">Empresa</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Precio</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Variación</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Volumen</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Máx/Mín</th>
                </tr>
              </thead>
              <tbody>
                {mostActive.map((stock) => {
                  const trend: Trend = stock.changePercent > 0 ? 'up' : stock.changePercent < 0 ? 'down' : 'neutral';
                  return (
                    <tr key={stock.symbol} className="border-b border-border-muted dark:border-slate-800 hover:bg-interactive-hover dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-semibold text-text-primary dark:text-white">{stock.symbol}</td>
                      <td className="py-2.5 text-text-secondary dark:text-slate-300">{stock.name}</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-text-primary dark:text-white">
                        ${stock.price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}>
                          {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-text-muted dark:text-slate-400">
                        {(stock.volume / 1e6).toFixed(1)}M
                      </td>
                      <td className="py-2.5 text-right text-2xs text-text-muted dark:text-slate-500">
                        ${stock.high.toLocaleString('es-AR')} / ${stock.low.toLocaleString('es-AR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      {marketSummary.isFallback && (
        <Card variant="outlined" className="bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30">
          <CardContent>
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-medium text-amber-800 dark:text-amber-400">Aviso sobre datos de mercado</h3>
                <p className="text-2xs text-amber-700 dark:text-amber-500/80 mt-1">
                  {marketSummary.disclaimer || 'Los datos del índice Merval se obtienen de Yahoo Finance. Los datos de acciones individuales pueden estar demorados o ser referenciales. Para operar, consulte su agente de bolsa (ALyC registrado en CNV).'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StockRow({ stock, rank }: { stock: StockQuote; rank: number }) {
  const trend: Trend = stock.changePercent > 0 ? 'up' : stock.changePercent < 0 ? 'down' : 'neutral';
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-interactive-hover dark:hover:bg-slate-800/50 transition-colors">
      <span className="text-xs font-mono text-text-muted dark:text-slate-500 w-5">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary dark:text-white">{stock.symbol}</span>
          <span className="text-2xs text-text-muted dark:text-slate-400 truncate">{stock.name}</span>
        </div>
      </div>
      <span className="text-xs font-mono font-semibold text-text-primary dark:text-white">
        ${stock.price.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
      </span>
      <span className={`text-xs font-mono font-medium w-16 text-right ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}`}>
        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </span>
    </div>
  );
}
