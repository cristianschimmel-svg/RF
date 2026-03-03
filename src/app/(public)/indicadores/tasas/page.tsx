import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MiniIndicator } from '@/components/indicators/mini-indicator';
import { Sparkline } from '@/components/indicators/sparkline';
import { getIndicatorsByCategory } from '@/lib/services/indicator-service';
import { fetchBCRAVariables, fetchBCRAHistory, getTasaPoliticaMonetaria, getBADLAR } from '@/lib/services/connectors/bcra';
import {
  Activity,
  Clock,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertTriangle,
  Building2,
  Landmark,
} from 'lucide-react';
import type { Indicator, Trend } from '@/types';

export const revalidate = 300;

export const metadata = {
  title: 'Tasas de Interés | Rosario Finanzas',
  description: 'Tasas de referencia del BCRA: Política monetaria, BADLAR, plazo fijo, tasas activas y pasivas.',
};

export default async function TasasPage() {
  const [tasasIndicators, allBcra] = await Promise.all([
    getIndicatorsByCategory('tasas'),
    fetchBCRAVariables(),
  ]);

  // Get all rate-related BCRA variables
  const rateIndicators = allBcra.filter(
    (i) => i.category === 'tasas' || 
           i.shortName.toLowerCase().includes('tasa') || 
           i.shortName.toLowerCase().includes('badlar') ||
           i.shortName.toLowerCase().includes('pase')
  );

  // Merge, deduplicate by id
  const allRates = [...tasasIndicators];
  for (const rate of rateIndicators) {
    if (!allRates.find(r => r.id === rate.id)) {
      allRates.push(rate);
    }
  }

  // Try to get history for main rate (Tasa Política Monetaria - variable 6)
  const historyTasaPM = await fetchBCRAHistory(6, 90);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Tasas de Interés
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Fuente: BCRA (Banco Central de la República Argentina)
          </p>
        </div>
      </div>

      {allRates.length === 0 ? (
        <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
            <h3 className="font-medium text-amber-800 dark:text-amber-400 mb-2">Servicio temporalmente no disponible</h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-500/80 text-center max-w-md">
              Actualmente los servicios del BCRA presentan intermitencias. 
              No pudimos cargar la tabla de tasas. Por favor, intentá más tarde.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Main Rate Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {allRates.slice(0, 6).map((rate) => (
              <MiniIndicator key={rate.id} indicator={rate} showIcon={true} />
            ))}
          </div>

          {/* Historical Chart - Tasa de Política Monetaria */}
          {historyTasaPM.length > 0 && (
            <Card>
              <CardHeader title="Tasa de Política Monetaria — Últimos 90 días (BCRA)" />
              <CardContent>
                <div className="h-20">
                  <Sparkline
                    data={historyTasaPM}
                    width={800}
                    height={80}
                    strokeWidth={2}
                    showArea={true}
                  />
                </div>
                <div className="flex justify-between mt-2 text-2xs text-text-muted dark:text-slate-500">
                  <span>Hace 90 días: {historyTasaPM[0]?.toFixed(1)}%</span>
                  <span>Actual: {historyTasaPM[historyTasaPM.length - 1]?.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detail Table */}
          <Card>
            <CardHeader title="Todas las Tasas de Referencia" />
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700">
                      <th className="text-left py-2 font-medium text-text-muted dark:text-slate-400">Indicador</th>
                      <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Valor</th>
                      <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Unidad</th>
                      <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Frecuencia</th>
                      <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Fuente</th>
                      <th className="text-right py-2 font-medium text-text-muted dark:text-slate-400">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRates.map((rate) => (
                      <tr key={rate.id} className="border-b border-border-muted dark:border-slate-800 hover:bg-interactive-hover dark:hover:bg-slate-800/50">
                        <td className="py-2.5">
                          <div>
                            <span className="font-medium text-text-primary dark:text-white">{rate.shortName}</span>
                            {rate.name !== rate.shortName && (
                              <p className="text-2xs text-text-muted dark:text-slate-400">{rate.name}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-text-primary dark:text-white">
                          {rate.value === 0 
                            ? <span className="text-text-muted font-normal text-[10px]">No disp.</span> 
                            : rate.format === 'percent' ? `${rate.value.toFixed(rate.decimals)}%` : rate.value.toLocaleString('es-AR')
                          }
                        </td>
                        <td className="py-2.5 text-right text-text-muted dark:text-slate-400">{rate.unit || '—'}</td>
                        <td className="py-2.5 text-right text-text-muted dark:text-slate-400">{rate.frequency}</td>
                        <td className="py-2.5 text-right text-2xs text-text-muted dark:text-slate-500">{String(rate.source)}</td>
                        <td className="py-2.5 text-right text-2xs text-text-muted dark:text-slate-500">
                          {new Date(rate.lastUpdated).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <div className="flex gap-3">
              <Landmark className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-1">BCRA</h3>
                <p className="text-2xs text-text-muted dark:text-slate-400">
                  El Banco Central de la República Argentina publica diariamente las principales
                  variables monetarias, tasas de referencia y estadísticas del sistema financiero.
                  Los datos se obtienen de la API oficial del BCRA.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="outlined" className="bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30">
          <CardContent>
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-medium text-amber-800 dark:text-amber-400">Fuente oficial</h3>
                <p className="text-2xs text-amber-700 dark:text-amber-500/80 mt-1">
                  Las tasas se obtienen de la API del BCRA. En caso de indisponibilidad,
                  se utilizan datos de respaldo de ArgentinaDatos.com. Los valores pueden
                  tener demora respecto a los publicados oficialmente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
