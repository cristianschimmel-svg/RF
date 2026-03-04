import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MiniIndicator } from '@/components/indicators/mini-indicator';
import { Sparkline } from '@/components/indicators/sparkline';
import { getIndicatorsByCategory } from '@/lib/services/indicator-service';
import { fetchInflacionMensual, fetchInflacionInteranual, fetchInflacionHistorica, fetchRiesgoPais, fetchRiesgoPaisHistorico } from '@/lib/services/connectors/argentina-datos';
import { fetchBCRAHistory } from '@/lib/services/connectors/bcra';
import { getInflacion, getInflacionInteranual, getUVA, getReservas, getTasaPoliticaMonetaria, getBADLAR } from '@/lib/services/connectors/bcra';
import {
  Percent,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart3,
  Calendar,
  Shield,
  Activity,
  DollarSign,
  Landmark,
} from 'lucide-react';
import type { Indicator, Trend } from '@/types';

export const revalidate = 300;

export const metadata = {
  title: 'Inflación, Riesgo País & Índices Macro | Rosario Finanzas',
  description: 'Inflación mensual e interanual (IPC), Riesgo País (EMBI+), UVA, CER, tasas de referencia y todos los indicadores que influyen en valores y costos en Argentina.',
};

export default async function InflacionPage() {
  const [
    inflacionIndicators,
    tasasIndicators,
    actividadIndicators,
    inflacionMensual,
    inflacionIA,
    historica,
    uva,
    riesgoPais,
    riesgoPaisHistorico,
    reservas,
    tasaPM,
    badlar,
  ] = await Promise.all([
    getIndicatorsByCategory('inflacion'),
    getIndicatorsByCategory('tasas'),
    getIndicatorsByCategory('actividad'),
    getInflacion(),
    getInflacionInteranual(),
    fetchInflacionHistorica(24),
    getUVA(),
    fetchRiesgoPais(),
    fetchRiesgoPaisHistorico(90),
    getReservas(),
    getTasaPoliticaMonetaria(),
    getBADLAR(),
  ]);

  // Try to get UVA history
  const historyUVA = await fetchBCRAHistory(21, 90);

  // Build chart data from historical inflation
  const chartData = historica.map(item => item.valor);
  const riesgoPaisChartData = riesgoPaisHistorico.map(item => item.valor);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <Percent className="w-5 h-5 text-orange-500" />
            Inflación, Riesgo País & Índices Macro
          </h1>
          <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Fuente: BCRA, INDEC, JP Morgan vía ArgentinaDatos
          </p>
        </div>
      </div>

      {/* ═══════════ SECTION 1: Key Highlight Cards ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Inflación Mensual */}
        {inflacionMensual && (
          <InflationHighlightCard
            title="IPC Mensual"
            value={inflacionMensual.value}
            unit="%"
            change={inflacionMensual.change}
            subtitle={`${new Date(inflacionMensual.lastUpdated).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`}
            source={String(inflacionMensual.source)}
            icon={<Percent className="w-4 h-4 text-orange-500" />}
            invertTrend
          />
        )}

        {/* Inflación Interanual */}
        {inflacionIA && (
          <InflationHighlightCard
            title="IPC Interanual"
            value={inflacionIA.value}
            unit="%"
            change={inflacionIA.change}
            subtitle={`${new Date(inflacionIA.lastUpdated).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`}
            source={String(inflacionIA.source)}
            icon={<Calendar className="w-4 h-4 text-amber-500" />}
            invertTrend
          />
        )}

        {/* Riesgo País */}
        {riesgoPais && (
          <InflationHighlightCard
            title="Riesgo País (EMBI+)"
            value={riesgoPais.value}
            unit="pb"
            change={riesgoPais.change}
            subtitle={`${new Date(riesgoPais.lastUpdated).toLocaleDateString('es-AR')}`}
            source="JP Morgan"
            icon={<Shield className="w-4 h-4 text-blue-500" />}
            invertTrend
          />
        )}

        {/* UVA */}
        {uva && (
          <InflationHighlightCard
            title="UVA"
            value={uva.value}
            unit="ARS"
            change={uva.changePercent}
            subtitle={`${new Date(uva.lastUpdated).toLocaleDateString('es-AR')}`}
            source={String(uva.source)}
            icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          />
        )}
      </div>

      {/* ═══════════ SECTION 2: Tasas y Reservas rápidas ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tasaPM && (
          <InflationHighlightCard
            title="Tasa Política Monetaria"
            value={tasaPM.value}
            unit="%"
            change={tasaPM.change}
            subtitle={`${new Date(tasaPM.lastUpdated).toLocaleDateString('es-AR')}`}
            source={String(tasaPM.source)}
            icon={<Landmark className="w-4 h-4 text-violet-500" />}
          />
        )}
        {badlar && (
          <InflationHighlightCard
            title="BADLAR"
            value={badlar.value}
            unit="%"
            change={badlar.change}
            subtitle={`${new Date(badlar.lastUpdated).toLocaleDateString('es-AR')}`}
            source={String(badlar.source)}
            icon={<Activity className="w-4 h-4 text-teal-500" />}
          />
        )}
        {reservas && (
          <InflationHighlightCard
            title="Reservas Internacionales"
            value={reservas.value / 1e6}
            unit="M USD"
            change={reservas.changePercent}
            subtitle={`${new Date(reservas.lastUpdated).toLocaleDateString('es-AR')}`}
            source={String(reservas.source)}
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
          />
        )}
      </div>

      {/* ═══════════ SECTION 3: All Inflation Indicators (BCRA) ═══════════ */}
      {inflacionIndicators.length > 0 && (
        <Card>
          <CardHeader title="Indicadores de Inflación y Precios (BCRA)" icon={<Percent className="w-4 h-4 text-orange-500" />} />
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {inflacionIndicators.map((indicator) => (
                <MiniIndicator key={indicator.id} indicator={indicator} showIcon={true} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ SECTION 4: Actividad y Tasas de interés ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasasIndicators.length > 0 && (
          <Card>
            <CardHeader title="Tasas de Interés" icon={<Activity className="w-4 h-4 text-emerald-500" />} />
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {tasasIndicators.map((indicator) => (
                  <MiniIndicator key={indicator.id} indicator={indicator} showIcon={true} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {actividadIndicators.length > 0 && (
          <Card>
            <CardHeader title="Actividad Económica" icon={<BarChart3 className="w-4 h-4 text-blue-500" />} />
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {actividadIndicators.map((indicator) => (
                  <MiniIndicator key={indicator.id} indicator={indicator} showIcon={true} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ═══════════ SECTION 5: Riesgo País Chart ═══════════ */}
      {riesgoPaisChartData.length > 0 && (
        <Card>
          <CardHeader title="Riesgo País (EMBI+) — Últimos 90 días" icon={<Shield className="w-4 h-4 text-blue-500" />} />
          <CardContent>
            <div className="h-24">
              <Sparkline
                data={riesgoPaisChartData}
                width={800}
                height={96}
                strokeWidth={2}
                showArea={true}
              />
            </div>
            <div className="flex justify-between mt-2 text-2xs text-text-muted dark:text-slate-500">
              <span>{riesgoPaisHistorico[0]?.fecha} — {riesgoPaisHistorico[0]?.valor} pb</span>
              <span>{riesgoPaisHistorico[riesgoPaisHistorico.length - 1]?.fecha} — {riesgoPaisHistorico[riesgoPaisHistorico.length - 1]?.valor} pb</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ SECTION 6: Historical Inflation Chart ═══════════ */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader title="IPC Mensual — Últimos 24 meses" icon={<Percent className="w-4 h-4 text-orange-500" />} />
          <CardContent>
            <div className="h-24">
              <Sparkline
                data={chartData}
                width={800}
                height={96}
                strokeWidth={2}
                showArea={true}
              />
            </div>
            <div className="flex justify-between mt-2 text-2xs text-text-muted dark:text-slate-500">
              <span>{historica[0]?.fecha}</span>
              <span>{historica[historica.length - 1]?.fecha}</span>
            </div>

            {/* Monthly values table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border dark:border-slate-700">
                    <th className="text-left py-1.5 font-medium text-text-muted dark:text-slate-400">Período</th>
                    <th className="text-right py-1.5 font-medium text-text-muted dark:text-slate-400">IPC Mensual</th>
                    <th className="text-right py-1.5 font-medium text-text-muted dark:text-slate-400">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {[...historica].reverse().slice(0, 12).map((item, index) => {
                    const prevItem = [...historica].reverse()[index + 1];
                    const diff = prevItem ? item.valor - prevItem.valor : 0;
                    const trend: Trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
                    return (
                      <tr key={item.fecha} className="border-b border-border-muted dark:border-slate-800">
                        <td className="py-1.5 text-text-primary dark:text-white">
                          {new Date(item.fecha).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-1.5 text-right font-mono font-semibold text-text-primary dark:text-white">
                          {item.valor.toFixed(1)}%
                        </td>
                        <td className="py-1.5 text-right">
                          {prevItem && (
                            <span className={trend === 'up' ? 'text-rose-600 dark:text-rose-400' : trend === 'down' ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}pp
                            </span>
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
      )}

      {/* ═══════════ SECTION 7: UVA Historical ═══════════ */}
      {historyUVA.length > 0 && (
        <Card>
          <CardHeader title="UVA — Últimos 90 días (BCRA)" icon={<DollarSign className="w-4 h-4 text-emerald-500" />} />
          <CardContent>
            <div className="h-20">
              <Sparkline
                data={historyUVA}
                width={800}
                height={80}
                strokeWidth={2}
                showArea={true}
              />
            </div>
            <div className="flex justify-between mt-2 text-2xs text-text-muted dark:text-slate-500">
              <span>Hace 90 días: ${historyUVA[0]?.toLocaleString('es-AR')}</span>
              <span>Actual: ${historyUVA[historyUVA.length - 1]?.toLocaleString('es-AR')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ Glosario ═══════════ */}
      <Card>
        <CardHeader title="¿Qué significa cada índice?" icon={<BarChart3 className="w-4 h-4 text-slate-500" />} />
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">IPC Mensual</dt>
              <dd className="text-text-muted dark:text-slate-400">Índice de Precios al Consumidor. Mide la variación mensual de precios minoristas (INDEC).</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">IPC Interanual</dt>
              <dd className="text-text-muted dark:text-slate-400">Variación interanual del IPC. Compara el mes actual vs. el mismo mes del año previo.</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">Riesgo País (EMBI+)</dt>
              <dd className="text-text-muted dark:text-slate-400">Spread de bonos argentinos vs. Tesoro de EE.UU. Mide la percepción de riesgo crediticio soberano (JP Morgan).</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">UVA</dt>
              <dd className="text-text-muted dark:text-slate-400">Unidad de Valor Adquisitivo. Ajusta por CER (inflación) y se usa en créditos hipotecarios y depósitos.</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">CER</dt>
              <dd className="text-text-muted dark:text-slate-400">Coeficiente de Estabilización de Referencia. Refleja la evolución diaria del IPC.</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">Tasa de Política Monetaria</dt>
              <dd className="text-text-muted dark:text-slate-400">Tasa de referencia fijada por el BCRA. Influye en tasas de créditos, plazo fijo y costo financiero general.</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">BADLAR</dt>
              <dd className="text-text-muted dark:text-slate-400">Tasa de depósitos a plazo fijo de 30-35 días en bancos privados para montos mayores a $1M.</dd>
            </div>
            <div>
              <dt className="font-semibold text-text-primary dark:text-white">Reservas Internacionales</dt>
              <dd className="text-text-muted dark:text-slate-400">Divisas en poder del BCRA. Indicador clave de solvencia externa y capacidad de intervención cambiaria.</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card variant="outlined" className="bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30">
        <CardContent>
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-medium text-amber-800 dark:text-amber-400">Fuentes oficiales</h3>
              <p className="text-2xs text-amber-700 dark:text-amber-500/80 mt-1">
                IPC: INDEC. UVA, CER, Reservas & Tasas: BCRA. Riesgo País (EMBI+): JP Morgan.
                Los datos se actualizan con demora según la publicación de cada organismo.
                ArgentinaDatos.com actúa como fuente de respaldo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InflationHighlightCard({
  title,
  value,
  unit,
  change,
  subtitle,
  source,
  icon,
  invertTrend = false,
}: {
  title: string;
  value: number;
  unit: string;
  change: number;
  subtitle: string;
  source: string;
  icon?: React.ReactNode;
  invertTrend?: boolean;
}) {
  const rawTrend: Trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
  // For inflation/riesgo-pais, lower is good, so invert the color mapping
  const colorTrend: Trend = invertTrend
    ? rawTrend === 'up' ? 'up' : rawTrend === 'down' ? 'down' : 'neutral'
    : rawTrend;

  const colors = {
    up: 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30',
    down: 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30',
    neutral: 'border-border dark:border-slate-700 bg-surface dark:bg-slate-900/50',
  };

  const formatVal = () => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'pb') return `${value.toLocaleString('es-AR')} pb`;
    if (unit === 'M USD') return `USD ${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}M`;
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[colorTrend]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <h3 className="text-xs font-medium text-text-muted dark:text-slate-400">{title}</h3>
      </div>
      <p className="text-2xl font-bold font-mono text-text-primary dark:text-white">
        {formatVal()}
      </p>
      {change !== 0 && (
        <div className="flex items-center gap-1 mt-1">
          {rawTrend === 'up' ? (
            <TrendingUp className="w-3 h-3 text-rose-500" />
          ) : rawTrend === 'down' ? (
            <TrendingDown className="w-3 h-3 text-emerald-500" />
          ) : null}
          <span className={`text-2xs ${rawTrend === 'up' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {change > 0 ? '+' : ''}{change.toFixed(1)} vs anterior
          </span>
        </div>
      )}
      <p className="text-2xs text-text-muted dark:text-slate-500 mt-2">{subtitle}</p>
      <p className="text-2xs text-text-muted dark:text-slate-500">Fuente: {source}</p>
    </div>
  );
}
