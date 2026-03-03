import { Suspense } from 'react';
import { MainLayout } from '@/components/layout';
import { MiniDollarCard, MiniIndicator, IndicatorSection } from '@/components/indicators/mini-indicator';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge, VariationBadge } from '@/components/ui/badge';
import { SkeletonIndicatorCard } from '@/components/ui/skeleton';
import { LeaderboardBanner, SidebarBanners, InlineBanner } from '@/components/ads';
import { ArgentinaMarketWidget } from '@/components/indicators/argentina-market';
import { EditorialSection } from '@/components/news/editorial-section';
import { LatestNewsSection } from '@/components/news/latest-news-section';
import { getMarketOverview } from '@/lib/services/indicator-service';
import { getMarketSummary, getIndexHistorical } from '@/lib/services/byma-service';
import { getEditorialNews, getExternalNews } from '@/lib/services/unified-news-service';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  DollarSign,
  Wheat,
  Bitcoin,
  BarChart3,
  Activity,
  Percent,
  ChevronRight,
  Clock,
  AlertTriangle,
  Newspaper,
} from 'lucide-react';

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
  const [overview, editorialNews, externalNews, marketSummary, mervalHistorical] = await Promise.all([
    getMarketOverview(),
    getEditorialNews(4),
    getExternalNews(8),
    getMarketSummary(),
    getIndexHistorical('MERVAL', '1M'),
  ]);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Header - Responsive */}
        <header className="mb-3 sm:mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-text-primary dark:text-white">
              Market Overview
            </h1>
            <p className="text-xs text-text-muted dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              Actualizado {formatRelativeTime(overview.lastUpdated)}
            </p>
          </div>
        </header>

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          {/* Left Column - News First, then Indicators */}
          <div className="lg:col-span-8 space-y-4">

            {/* 1. Editorial Section - Featured Articles (TOP PRIORITY) */}
            {editorialNews.length > 0 && (
              <EditorialSection articles={editorialNews} />
            )}

            {/* 2. Latest External News - Dynamic Grid (Ambito-style) */}
            {externalNews.length > 0 && (
              <LatestNewsSection articles={externalNews} showViewAll={true} />
            )}
            
            {/* 3. Dollar Section - Tipo de Cambio */}
            <IndicatorSection
              title="Tipo de Cambio"
              icon={<DollarSign className="w-4 h-4" />}
              headerAction={
                overview.dollarMetrics.brechaBlue && (
                  <Badge variant="accent" size="sm">
                    Brecha {overview.dollarMetrics.brechaBlue.toFixed(1)}%
                  </Badge>
                )
              }
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.dollarQuotes.map((quote) => (
                  <MiniDollarCard
                    key={quote.type}
                    name={quote.name.replace('Dólar ', '')}
                    buy={quote.buy}
                    sell={quote.sell}
                    change={quote.change}
                    changePercent={quote.changePercent}
                  />
                ))}
              </div>
            </IndicatorSection>

            {/* 4. Argentina Stock Market - MERVAL (Bolsa de Valores) */}
            <ArgentinaMarketWidget 
              initialData={marketSummary}
              initialHistorical={mervalHistorical}
              showFullChart={true}
            />

            {/* 5. Tabs for BCRA Indicators - Inflación, Tasas, Actividad */}
            <Card className="p-3 sm:p-4">
              <Tabs defaultValue="inflacion">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="inflacion" className="text-xs sm:text-sm">
                    <Percent className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    <span className="hidden xs:inline">Inflación</span>
                    <span className="xs:hidden">Infl.</span>
                  </TabsTrigger>
                  <TabsTrigger value="tasas" className="text-xs sm:text-sm">
                    <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    Tasas
                  </TabsTrigger>
                  <TabsTrigger value="actividad" className="text-xs sm:text-sm">
                    <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    <span className="hidden xs:inline">Actividad</span>
                    <span className="xs:hidden">Act.</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="inflacion">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {overview.groups
                      .find((g) => g.category === 'inflacion')
                      ?.indicators.slice(0, 6).map((indicator) => (
                        <MiniIndicator
                          key={indicator.id}
                          indicator={indicator}
                        />
                      )) || (
                      <p className="text-text-muted col-span-3 text-sm">
                        No hay datos disponibles
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="tasas">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {overview.groups
                      .find((g) => g.category === 'tasas')
                      ?.indicators.slice(0, 6).map((indicator) => (
                        <MiniIndicator
                          key={indicator.id}
                          indicator={indicator}
                        />
                      )) || (
                      <p className="text-text-muted col-span-3 text-sm">
                        No hay datos disponibles
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="actividad">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {overview.groups
                      .find((g) => g.category === 'actividad')
                      ?.indicators.slice(0, 6).map((indicator) => (
                        <MiniIndicator
                          key={indicator.id}
                          indicator={indicator}
                        />
                      )) || (
                      <p className="text-text-muted col-span-3 text-sm">
                        No hay datos disponibles
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>

            {/* 6. Agro & Commodities */}
            <IndicatorSection
              title="Agro & Commodities"
              icon={<Wheat className="w-4 h-4" />}
              headerAction={
                <Link
                  href="/indicadores/agro"
                  className="text-xs text-accent hover:text-accent-dark flex items-center gap-1"
                >
                  Ver más
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.groups
                  .find((g) => g.category === 'agro')
                  ?.indicators.slice(0, 8).map((indicator) => (
                    <MiniIndicator
                      key={indicator.id}
                      indicator={indicator}
                      showIcon={true}
                    />
                  ))}
              </div>
            </IndicatorSection>

            {/* 7. Cryptocurrencies */}
            <IndicatorSection
              title="Criptomonedas"
              icon={<Bitcoin className="w-4 h-4" />}
              headerAction={
                <Link
                  href="/indicadores/cripto"
                  className="text-xs text-accent hover:text-accent-dark flex items-center gap-1"
                >
                  Ver más
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.groups
                  .find((g) => g.category === 'cripto')
                  ?.indicators.slice(0, 8).map((indicator) => (
                    <MiniIndicator
                      key={indicator.id}
                      indicator={indicator}
                      showIcon={true}
                    />
                  ))}
              </div>
            </IndicatorSection>

            {/* Inline Advertisement */}
            <div className="hidden lg:block">
              <LeaderboardBanner />
            </div>
          </div>

          {/* Right Column - Quick Links, News Sidebar & Info */}
          <div className="lg:col-span-4 space-y-4">
            {/* Data Disclaimer */}
            <Card variant="outlined" className="bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/30">
              <CardContent>
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-medium text-amber-800 dark:text-amber-400">
                      Aviso sobre los datos
                    </h3>
                    <p className="text-2xs text-amber-700 dark:text-amber-500/80 mt-1">
                      Los datos se obtienen de fuentes públicas (BCRA, APIs de
                      terceros). Los datos del dólar blue y MEP son
                      referenciales.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader title="Accesos Rápidos" />
              <CardContent>
                <div className="space-y-1">
                  <QuickLink
                    href="/indicadores/dolar"
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    label="Cotizaciones del Dólar"
                  />
                  <QuickLink
                    href="/indicadores/agro"
                    icon={<Wheat className="w-3.5 h-3.5" />}
                    label="Precios Agrícolas"
                  />
                  <QuickLink
                    href="/indicadores/cripto"
                    icon={<Bitcoin className="w-3.5 h-3.5" />}
                    label="Criptomonedas"
                  />
                  <QuickLink
                    href="/noticias"
                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                    label="Noticias Económicas"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Latest News Sidebar */}
            <Card>
              <CardHeader 
                title="Últimas Noticias" 
                action={
                  <Link
                    href="/noticias"
                    className="text-xs text-accent hover:text-accent-dark flex items-center gap-1"
                  >
                    Ver más
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardContent>
                <div className="space-y-3">
                  {externalNews.slice(0, 6).map((article) => (
                    <NewsItemCompact
                      key={article.id}
                      title={article.title}
                      source={article.source}
                      time={formatRelativeTime(article.publishedAt)}
                      slug={article.slug}
                      category={article.category}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sidebar Advertisements */}
            <div className="hidden lg:block">
              <Card variant="outlined" className="p-3 dark:bg-slate-900/30">
                <p className="text-2xs text-text-muted dark:text-slate-500 text-center mb-3">Publicidad</p>
                <SidebarBanners />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// News Item with Image Component
function NewsItemWithImage({
  title,
  category,
  time,
  slug,
  imageUrl,
  featured = false,
}: {
  title: string;
  category: string;
  time: string;
  slug: string;
  imageUrl?: string;
  featured?: boolean;
}) {
  if (featured && imageUrl) {
    return (
      <Link href={`/noticias/${slug}`} className="block group">
        <div className="relative aspect-video rounded-lg overflow-hidden mb-2">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <Badge size="sm" variant="accent" className="mb-1">
              {category}
            </Badge>
            <h4 className="text-sm font-medium text-white line-clamp-2">
              {title}
            </h4>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/noticias/${slug}`} className="flex gap-3 group">
      {imageUrl && (
        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="64px"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge size="sm" variant="default">
            {category}
          </Badge>
          <span className="text-2xs text-text-muted dark:text-slate-500">{time}</span>
        </div>
        <h4 className="text-xs text-text-primary dark:text-white group-hover:text-accent dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
          {title}
        </h4>
      </div>
    </Link>
  );
}

// Quick Link Component
function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-interactive-hover dark:hover:bg-slate-800 transition-colors group"
    >
      <div className="text-text-muted dark:text-slate-400 group-hover:text-accent dark:group-hover:text-cyan-400 transition-colors">
        {icon}
      </div>
      <span className="text-xs text-text-primary dark:text-white group-hover:text-accent dark:group-hover:text-cyan-400 transition-colors">
        {label}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-text-muted dark:text-slate-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// Compact News Item for Sidebar
function NewsItemCompact({
  title,
  source,
  time,
  slug,
  category,
}: {
  title: string;
  source: string;
  time: string;
  slug: string;
  category: string;
}) {
  return (
    <Link href={`/noticias/${slug}`} className="block group">
      <div className="p-2 -mx-2 rounded-lg hover:bg-interactive-hover dark:hover:bg-slate-800 transition-colors">
        <div className="flex items-center gap-2 mb-1">
          <Badge size="sm" variant="default" className="text-2xs py-0 px-1.5">
            {source}
          </Badge>
          <Badge size="sm" variant="accent" className="text-2xs py-0 px-1.5">
            {category}
          </Badge>
        </div>
        <h4 className="text-xs font-medium text-text-primary dark:text-white group-hover:text-accent dark:group-hover:text-cyan-400 transition-colors line-clamp-2 mb-1">
          {title}
        </h4>
        <span className="text-2xs text-text-muted dark:text-slate-500 flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {time}
        </span>
      </div>
    </Link>
  );
}
