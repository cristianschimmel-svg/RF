import { Suspense } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge, VariationBadge } from '@/components/ui/badge';
import { SkeletonIndicatorCard } from '@/components/ui/skeleton';
import { getDollarQuotes } from '@/lib/services/indicator-service';
import { fetchBCRAHistory } from '@/lib/services/connectors/bcra';
import { Sparkline } from '@/components/indicators/sparkline';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  Info,
} from 'lucide-react';
import type { DollarQuote, Trend } from '@/types';

export const revalidate = 60;

export const metadata = {
  title: 'Cotizaciones del Dólar | Rosario Finanzas',
  description: 'Cotizaciones del dólar en tiempo real: Blue, Oficial, MEP, CCL, Mayorista, Cripto y Turista.',
};

export default async function DolarPage() {
  const { quotes, metrics } = await getDollarQuotes();

  // Fetch historical for charts (TC Mayorista from BCRA variable 4)
  const historicalMayorista = await fetchBCRAHistory(4, 30);

  const oficial = quotes.find(q => q.type === 'oficial');
  const blue = quotes.find(q => q.type === 'blue');
  const mep = quotes.find(q => q.type === 'mep');
  const ccl = quotes.find(q => q.type === 'ccl');
  const mayorista = quotes.find(q => q.type === 'mayorista');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Cotizaciones del Dólar
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Actualización cada minuto — Fuente: APIs públicas (DolarAPI, BCRA)
          </p>
        </div>
        {metrics.brechaBlue !== null && (
          <Badge variant="accent" size="sm">
            Brecha Blue/Oficial: {metrics.brechaBlue.toFixed(1)}%
          </Badge>
        )}
      </div>

      {/* Main Dollar Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quotes.map((quote) => (
          <DollarDetailCard key={quote.type} quote={quote} oficialSell={oficial?.sell} />
        ))}
      </div>

      {/* Spreads & Brechas Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brechas Cambiarias */}
        <Card>
          <CardHeader title="Brechas Cambiarias" />
          <CardContent>
            <div className="space-y-3">
              {metrics.brechaBlue !== null && (
                <BrechaRow label="Blue vs Oficial" value={metrics.brechaBlue} />
              )}
              {metrics.brechaMep !== null && (
                <BrechaRow label="MEP vs Oficial" value={metrics.brechaMep} />
              )}
              {metrics.brechaCcl !== null && (
                <BrechaRow label="CCL vs Oficial" value={metrics.brechaCcl} />
              )}
              {mep && ccl && (
                <BrechaRow
                  label="CCL vs MEP"
                  value={((ccl.sell - mep.sell) / mep.sell) * 100}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spreads de compra/venta */}
        <Card>
          <CardHeader title="Spreads Compra/Venta" />
          <CardContent>
            <div className="space-y-3">
              {quotes.filter(q => q.buy > 0 && q.sell > 0).map((quote) => (
                <div key={quote.type} className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary dark:text-slate-300">
                    {quote.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted dark:text-slate-400">
                      ${quote.buy.toLocaleString('es-AR', { maximumFractionDigits: 2 })} / ${quote.sell.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </span>
                    <Badge variant="default" size="sm">
                      {quote.spread.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical TC Mayorista */}
      {historicalMayorista.length > 0 && (
        <Card>
          <CardHeader title="Tipo de Cambio Mayorista — Últimos 30 días (BCRA)" />
          <CardContent>
            <div className="h-20">
              <Sparkline
                data={historicalMayorista}
                width={800}
                height={80}
                strokeWidth={2}
                showArea={true}
              />
            </div>
            <div className="flex justify-between mt-2 text-2xs text-text-muted dark:text-slate-500">
              <span>Hace 30 días: ${historicalMayorista[0]?.toLocaleString('es-AR')}</span>
              <span>Actual: ${historicalMayorista[historicalMayorista.length - 1]?.toLocaleString('es-AR')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla Resumen Completa */}
      <Card>
        <CardHeader title="Tabla Resumen de Cotizaciones" />
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border dark:border-slate-700">
                  <th className="text-left py-2 font-medium text-text-muted dark:text-slate-400">Tipo</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Compra</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Venta</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Spread</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Brecha vs Oficial</th>
                  <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Actualización</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => {
                  const brecha = oficial && quote.type !== 'oficial'
                    ? ((quote.sell - oficial.sell) / oficial.sell * 100)
                    : null;
                  return (
                    <tr key={quote.type} className="border-b border-border-muted dark:border-slate-800 hover:bg-interactive-hover dark:hover:bg-slate-800/50">
                      <td className="py-2.5 font-medium text-text-primary dark:text-white">{quote.name}</td>
                      <td className="py-2.5 text-right font-mono text-text-primary dark:text-white">
                        {quote.buy > 0 ? `$${quote.buy.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-text-primary dark:text-white">
                        ${quote.sell.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right font-mono text-text-muted dark:text-slate-400">
                        {quote.buy > 0 ? `${quote.spread.toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {brecha !== null ? (
                          <span className={brecha > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted dark:text-slate-400'}>
                            {brecha > 0 ? '+' : ''}{brecha.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-text-muted dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right text-2xs text-text-muted dark:text-slate-500">
                        {new Date(quote.lastUpdated).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
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
      <Card variant="outlined" className="bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30">
        <CardContent>
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-medium text-amber-800 dark:text-amber-400">Aviso sobre los datos</h3>
              <p className="text-2xs text-amber-700 dark:text-amber-500/80 mt-1">
                Las cotizaciones se obtienen de fuentes públicas (DolarAPI, BCRA). El dólar blue es un mercado
                informal y su cotización es referencial. Para operaciones reales, consulte su agente de cambio
                o entidad bancaria. Los datos de MEP y CCL pueden tener demora.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DollarDetailCard({ quote, oficialSell }: { quote: DollarQuote; oficialSell?: number }) {
  const trend: Trend = quote.changePercent > 0 ? 'up' : quote.changePercent < 0 ? 'down' : 'neutral';

  const colors = {
    up: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30',
    down: 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30',
    neutral: 'border-border dark:border-slate-700 bg-surface dark:bg-slate-900/50',
  };

  const brecha = oficialSell && quote.type !== 'oficial'
    ? ((quote.sell - oficialSell) / oficialSell * 100)
    : null;

  return (
    <div className={`rounded-lg border p-4 ${colors[trend]} transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-text-primary dark:text-white">{quote.name}</h3>
        {quote.source !== 'fallback' && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-muted dark:text-slate-400 mb-0.5">Compra</p>
          <p className="text-2xl font-bold font-mono text-text-primary dark:text-white">
            {quote.buy > 0 ? `$${quote.buy.toLocaleString('es-AR', { maximumFractionDigits: 1 })}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted dark:text-slate-400 mb-0.5">Venta</p>
          <p className="text-2xl font-bold font-mono text-text-primary dark:text-white">
            ${quote.sell.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-muted dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted dark:text-slate-500" />
          <span className="text-xs text-text-muted dark:text-slate-400">
            Spread: {quote.spread.toFixed(2)}%
          </span>
        </div>
        {brecha !== null && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Brecha: {brecha > 0 ? '+' : ''}{brecha.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

function BrechaRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary dark:text-slate-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${value > 10 ? 'bg-amber-500' : value > 5 ? 'bg-yellow-400' : 'bg-emerald-400'}`}
            style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
          />
        </div>
        <span className={`text-xs font-mono font-medium ${value > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary dark:text-white'}`}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
