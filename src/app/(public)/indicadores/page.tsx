import { getMarketOverview } from '@/lib/services/indicator-service';
import { MiniIndicator } from '@/components/indicators/mini-indicator';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Percent, Activity, BarChart3, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { fetchRiesgoPais } from '@/lib/services/connectors/argentina-datos';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Indicadores Macro - Inflación, Riesgo País, Tasas | Rosario Finanzas',
  description: 'Panel general de indicadores macroeconómicos. Consulta la inflación (IPC, IPL), Riesgo País, Tasas de Interés y niveles de actividad de Argentina.',
};

export const revalidate = 60; // 1 min

export default async function IndicadoresOverviewPage() {
  const [overview, riesgoPaisData] = await Promise.all([
    getMarketOverview(),
    fetchRiesgoPais(),
  ]);

  const categoryInflacion = overview.groups.find((g) => g.category === 'inflacion')?.indicators || [];
  const categoryTasas = overview.groups.find((g) => g.category === 'tasas')?.indicators || [];
  const categoryActividad = overview.groups.find((g) => g.category === 'actividad')?.indicators || [];
  const categoryCambios = overview.groups.find((g) => g.category === 'cambios')?.indicators || [];

  // Agregar Riesgo País si no está ya en actividad
  const allActividad = [...categoryActividad];
  if (riesgoPaisData && !allActividad.find(i => i.id === riesgoPaisData.id)) {
    allActividad.unshift(riesgoPaisData);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-accent" />
          Dashboard Macroeconómico
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Monitor general de indicadores que impactan en precios, costos de vida e inversión.
        </p>
      </div>

      {/* Sección 1: Inflación */}
      <Card>
        <CardHeader
          title="Inflación e Índices de Precios"
          action={
            <Link href="/indicadores/inflacion" className="text-xs text-accent hover:text-accent-dark flex items-center gap-1">
              Ver detalle <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {categoryInflacion.map(ind => (
              <MiniIndicator key={ind.id} indicator={ind} showIcon={true} />
            ))}
            {categoryInflacion.length === 0 && (
              <p className="text-sm text-text-muted col-span-3">No hay datos disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Actividad y Riesgo País */}
      <Card>
        <CardHeader title="Riesgo País y Actividad Económica" />
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {allActividad.map(ind => (
              <MiniIndicator key={ind.id} indicator={ind} showIcon={true} />
            ))}
            {allActividad.length === 0 && (
              <p className="text-sm text-text-muted col-span-3">No hay datos disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Tasas de Interés */}
      <Card>
        <CardHeader title="Tasas de Interés" />
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {categoryTasas.map(ind => (
              <MiniIndicator key={ind.id} indicator={ind} showIcon={true} />
            ))}
            {categoryTasas.length === 0 && (
              <p className="text-sm text-text-muted col-span-3">No hay datos disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Tipo de Cambio resumen */}
      <Card>
        <CardHeader
          title="Tipo de Cambio"
          action={
            <Link href="/indicadores/dolar" className="text-xs text-accent hover:text-accent-dark flex items-center gap-1">
              Ver detalle <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {categoryCambios.slice(0, 8).map(ind => (
              <MiniIndicator key={ind.id} indicator={ind} showIcon={true} />
            ))}
            {categoryCambios.length === 0 && (
              <p className="text-sm text-text-muted col-span-4">No hay datos disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg flex gap-3 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Fuentes:</strong> Los datos de inflación (IPC), UVA y reservas provienen del BCRA e INDEC. El Riesgo País (EMBI+) es de JP Morgan. Las demoras dependen de la publicación oficial de cada entidad.
        </p>
      </div>

    </div>
  );
}
