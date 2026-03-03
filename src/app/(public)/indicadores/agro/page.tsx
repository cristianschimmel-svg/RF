import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchCommodities, fetchAgroCommodities } from '@/lib/services/connectors/commodities';
import {
  Wheat,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Leaf,
  Droplets,
  Sun,
} from 'lucide-react';
import type { Indicator, Trend } from '@/types';

export const revalidate = 300;

export const metadata = {
  title: 'Agro & Commodities | Rosario Finanzas',
  description: 'Precios de granos y commodities: Soja, Maíz, Trigo, Girasol, Petróleo y Oro.',
};

export default async function AgroPage() {
  const commoditiesResult = await fetchCommodities();
  const { indicators, isFallback, disclaimer, lastUpdated } = commoditiesResult;

  const agroIndicators = indicators.filter(i => i.category === 'agro');
  const energyIndicators = indicators.filter(i => i.category === 'energia');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <Wheat className="w-5 h-5 text-amber-600" />
            Agro & Commodities
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Fuente: Yahoo Finance — Futuros CBOT, NYMEX, COMEX
            {isFallback && ' — Servicio temporalmente no disponible'}
          </p>
        </div>
      </div>

      {/* Agro Section */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2 mb-3">
          <Leaf className="w-4 h-4 text-emerald-500" />
          Granos y Oleaginosas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {agroIndicators.map((commodity) => (
            <CommodityCard key={commodity.id} commodity={commodity} />
          ))}
        </div>
      </div>

      {/* Energy & Metals Section */}
      {energyIndicators.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-blue-500" />
            Energía y Metales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {energyIndicators.map((commodity) => (
              <CommodityCard key={commodity.id} commodity={commodity} />
            ))}
          </div>
        </div>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader title="Tabla de Precios" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-text-muted dark:text-slate-400">Producto</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Precio</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Unidad</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Variación</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Mercado</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((commodity) => {
                  const trend: Trend = commodity.changePercent > 0 ? 'up' : commodity.changePercent < 0 ? 'down' : 'neutral';
                  const market = (commodity.metadata?.market as string) || '—';
                  return (
                    <tr key={commodity.id} className="border-b border-border-muted dark:border-slate-800 hover:bg-interactive-hover dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-medium text-text-primary dark:text-white">{commodity.name}</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-text-primary dark:text-white">
                        ${commodity.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right text-text-muted dark:text-slate-400">{commodity.unit}</td>
                      <td className="py-2.5 text-right">
                        <span className={trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}>
                          {commodity.changePercent > 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-text-muted dark:text-slate-400">{market}</td>
                      <td className="py-2.5 text-right">
                        {commodity.isFallback ? (
                          <Badge variant="default" size="sm">Referencia</Badge>
                        ) : (
                          <Badge variant="accent" size="sm">En vivo</Badge>
                        )}
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
      <Card variant="outlined" className="bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/30">
        <CardContent>
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-medium text-blue-800 dark:text-blue-400">Sobre los precios de commodities</h3>
              <p className="text-2xs text-blue-700 dark:text-blue-500/80 mt-1">
                {disclaimer || 'Precios de futuros obtenidos en tiempo real de Yahoo Finance (CBOT, NYMEX, COMEX). Los valores se convierten a USD/tonelada para granos. Los precios FOB y disponibles locales pueden diferir de los futuros internacionales. Para operar, consulte su corredor de granos o la Bolsa de Comercio de Rosario. Esta información no constituye asesoramiento financiero.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CommodityCard({ commodity }: { commodity: Indicator }) {
  const trend: Trend = commodity.changePercent > 0 ? 'up' : commodity.changePercent < 0 ? 'down' : 'neutral';
  const market = (commodity.metadata?.market as string) || '';

  const colors = {
    up: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30',
    down: 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30',
    neutral: 'border-border dark:border-slate-700 bg-surface dark:bg-slate-900/50',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`rounded-lg border p-4 ${colors[trend]} ${commodity.isFallback ? 'border-dashed' : ''} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-text-primary dark:text-white">{commodity.shortName}</h3>
        <div className="flex items-center gap-1">
          {market && (
            <span className="text-2xs text-text-muted dark:text-slate-500">{market}</span>
          )}
          {commodity.isFallback ? (
            <AlertTriangle className="w-3 h-3 text-amber-500" />
          ) : (
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </div>

      <p className="text-xl font-bold font-mono text-text-primary dark:text-white mb-0.5">
        ${commodity.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-2xs text-text-muted dark:text-slate-400 mb-2">{commodity.unit}</p>

      <div className="flex items-center gap-1">
        <TrendIcon className={`w-3 h-3 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`} />
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'}`}>
          {commodity.changePercent > 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
