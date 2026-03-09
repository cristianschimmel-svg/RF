import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Calculator,
  DollarSign,
  Percent,
  TrendingUp,
  ArrowRightLeft,
  PiggyBank,
  BarChart3,
  ExternalLink,
  Building2,
  ChevronRight,
} from 'lucide-react';

export const metadata = {
  title: 'Herramientas Financieras | Rosario Finanzas',
  description: 'Calculadoras y herramientas financieras para inversores y ahorristas argentinos.',
};

const tools = [
  {
    title: 'Cotizaciones del Dólar',
    description: 'Consultá las distintas cotizaciones del dólar en tiempo real: oficial, blue, MEP, CCL y cripto.',
    icon: ArrowRightLeft,
    color: 'from-emerald-500 to-emerald-600',
    href: '/indicadores/dolar',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'Seguimiento de Inflación',
    description: 'Visualizá la evolución mensual e interanual de la inflación argentina con datos oficiales del INDEC vía BCRA.',
    icon: Percent,
    color: 'from-rose-500 to-rose-600',
    href: '/indicadores/inflacion',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'Tasas de Interés',
    description: 'Consultá las tasas de referencia del BCRA: política monetaria, BADLAR, plazo fijo y más.',
    icon: TrendingUp,
    color: 'from-blue-500 to-blue-600',
    href: '/indicadores/tasas',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'Cotizaciones Agro',
    description: 'Seguí los precios de soja, maíz, trigo y otros commodities relevantes para la región.',
    icon: BarChart3,
    color: 'from-amber-500 to-amber-600',
    href: '/indicadores/agro',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'MERVAL & Acciones',
    description: 'Índice MERVAL en tiempo real con datos de Yahoo Finance, líderes, ganadoras y perdedoras del día.',
    icon: Building2,
    color: 'from-violet-500 to-violet-600',
    href: '/indicadores/mercados',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'Criptomonedas',
    description: 'Precios en tiempo real de BTC, ETH, SOL, XRP y USDT directamente de CoinGecko.',
    icon: DollarSign,
    color: 'from-orange-500 to-orange-600',
    href: '/indicadores/cripto',
    badge: 'Disponible',
    available: true,
  },
  {
    title: 'Calculadora de Plazo Fijo',
    description: 'Simulá rendimientos de plazo fijo tradicional y UVA con las tasas vigentes.',
    icon: PiggyBank,
    color: 'from-cyan-500 to-cyan-600',
    href: '#',
    badge: 'Próximamente',
    available: false,
  },
  {
    title: 'Calculadora de Inversiones',
    description: 'Calculá rendimientos históricos y proyectados en distintos instrumentos financieros.',
    icon: Calculator,
    color: 'from-slate-500 to-slate-600',
    href: '#',
    badge: 'Próximamente',
    available: false,
  },
];

export default function HerramientasPage() {
  const availableTools = tools.filter(t => t.available);
  const comingSoonTools = tools.filter(t => !t.available);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary dark:text-white">
                Herramientas Financieras
              </h1>
              <p className="text-sm text-text-muted dark:text-slate-400">
                Calculadoras y dashboards con datos reales del mercado argentino
              </p>
            </div>
          </div>
        </header>

        {/* Available Tools */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4">
            Dashboards disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.title} href={tool.href} className="group block">
                  <Card className="h-full hover:shadow-lg transition-all hover:border-accent/30">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-semibold text-text-primary dark:text-white group-hover:text-accent transition-colors">
                              {tool.title}
                            </h3>
                            <Badge variant="positive" size="sm">{tool.badge}</Badge>
                          </div>
                          <p className="text-xs text-text-muted line-clamp-2">
                            {tool.description}
                          </p>
                          <span className="inline-flex items-center gap-1 text-xs text-accent mt-2 group-hover:underline">
                            Abrir <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Coming Soon */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4">
            Próximamente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comingSoonTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card key={tool.title} className="opacity-60">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                            {tool.title}
                          </h3>
                          <Badge variant="outline" size="sm">{tool.badge}</Badge>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Data Sources Info */}
        <Card variant="outlined" className="bg-surface-secondary/30">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-2">
              Fuentes de datos
            </h3>
            <p className="text-xs text-text-muted mb-3">
              Todas las herramientas utilizan datos reales de APIs oficiales y proveedores reconocidos. 
              Los datos no son inventados ni simulados.
            </p>
            <div className="flex flex-wrap gap-2">
              {['BCRA (api.bcra.gob.ar)', 'DolarAPI', 'CoinGecko', 'Yahoo Finance', 'ArgentinaDatos'].map((src) => (
                <Badge key={src} variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {src}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
