import { Suspense } from 'react';
import { MainLayout } from '@/components/layout';
import { NewsCard, NewsFeatured, NewsCardSkeleton } from '@/components/news/news-card';
import { EditorialSection } from '@/components/news/editorial-section';
import { ExternalNewsCard, ExternalNewsCardHorizontal } from '@/components/news/latest-news-section';
import { SmartSearch } from '@/components/news/smart-search';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db/prisma';
import { 
  getAllNews, 
  getEditorialNews, 
  getExternalNews,
  type NewsArticle 
} from '@/lib/services/unified-news-service';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  ChevronRight,
  Tag,
  Pen,
  Newspaper,
  ExternalLink,
  Star,
} from 'lucide-react';

export const revalidate = 60; // Revalidate every minute for fresh news

// Metadata
export const metadata = {
  title: 'Noticias | Rosario Finanzas',
  description: 'Las últimas noticias sobre economía, mercados y finanzas de la región Rosario y Argentina.',
};

// Types for Prisma queries
type TagWithCount = {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
};

async function getPopularTags(): Promise<TagWithCount[]> {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            articles: true,
          },
        },
      },
      orderBy: {
        articles: {
          _count: 'desc',
        },
      },
      take: 10,
    });
    return tags as TagWithCount[];
  } catch {
    return [];
  }
}

/**
 * Heuristic search: normalizes text (removes accents, lowercases),
 * tokenizes query, and scores articles by how many tokens match
 * across title, excerpt, source, and category fields.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

// Financial synonyms for heuristic matching
const SYNONYM_MAP: Record<string, string[]> = {
  'dolar': ['dolar', 'usd', 'divisa', 'tipo de cambio', 'billete', 'blue', 'mep', 'ccl', 'oficial'],
  'inflacion': ['inflacion', 'ipc', 'precios', 'costo de vida', 'carestia'],
  'merval': ['merval', 'bolsa', 'acciones', 'renta variable', 'byma'],
  'bonos': ['bonos', 'renta fija', 'letras', 'letes', 'lecap', 'deuda'],
  'tasas': ['tasas', 'tasa', 'interes', 'plazo fijo', 'rendimiento'],
  'bcra': ['bcra', 'banco central', 'reservas', 'politica monetaria', 'leliq', 'base monetaria'],
  'cripto': ['cripto', 'bitcoin', 'btc', 'ethereum', 'criptomoneda', 'blockchain'],
  'petroleo': ['petroleo', 'crudo', 'oil', 'brent', 'wti', 'ypf', 'energia'],
  'soja': ['soja', 'trigo', 'maiz', 'granos', 'commodities', 'agro', 'campo'],
  'impuestos': ['impuestos', 'fiscal', 'afip', 'arca', 'tributario', 'ganancias', 'iva'],
};

function heuristicSearch(articles: NewsArticle[], query: string): NewsArticle[] {
  const normalizedQuery = normalizeText(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 1);
  
  if (queryTokens.length === 0) return articles;

  // Expand query tokens with synonyms
  const expandedTokens = new Set<string>(queryTokens);
  for (const token of queryTokens) {
    // Check if the token matches any synonym group
    for (const [_key, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (synonyms.some(s => s.includes(token) || token.includes(s))) {
        synonyms.forEach(s => expandedTokens.add(s));
      }
    }
  }

  const scored = articles.map(article => {
    const fields = [
      { text: normalizeText(article.title), weight: 3 },
      { text: normalizeText(article.excerpt || ''), weight: 2 },
      { text: normalizeText(article.category || ''), weight: 1.5 },
      { text: normalizeText(article.source || ''), weight: 1 },
    ];

    let score = 0;

    // Exact phrase match (highest priority)
    for (const field of fields) {
      if (field.text.includes(normalizedQuery)) {
        score += 10 * field.weight;
      }
    }

    // Token and synonym matching
    for (const token of Array.from(expandedTokens)) {
      for (const field of fields) {
        if (field.text.includes(token)) {
          // Original query tokens get higher score than expanded synonyms
          const isOriginal = queryTokens.includes(token);
          score += (isOriginal ? 3 : 1) * field.weight;
        }
      }
    }

    return { article, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.article);
}

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: { categoria?: string; tag?: string; q?: string; pagina?: string };
}) {
  const activeCategory = searchParams.categoria || null;
  const activeTag = searchParams.tag || null;
  const searchQuery = searchParams.q || null;
  const currentPage = parseInt(searchParams.pagina || '1', 10);
  const ITEMS_PER_PAGE = 15;

  const [editorialArticles, allExternal, popularTags] = await Promise.all([
    getEditorialNews(5),
    getExternalNews(100),
    getPopularTags(),
  ]);

  // Build real category list from actual external news articles
  const newsCategoryMap = new Map<string, { name: string; slug: string; count: number }>();
  for (const article of allExternal) {
    if (article.category) {
      const slug = article.category
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const existing = newsCategoryMap.get(slug);
      if (existing) {
        existing.count++;
      } else {
        newsCategoryMap.set(slug, { name: article.category, slug, count: 1 });
      }
    }
  }
  const newsCategories = Array.from(newsCategoryMap.values()).sort((a, b) => b.count - a.count);

  // Filter external articles by category, tag, or search query
  let filteredExternal = allExternal;
  
  if (activeCategory) {
    const matchCat = newsCategories.find(c => c.slug === activeCategory);
    if (matchCat) {
      filteredExternal = filteredExternal.filter(a => 
        a.category?.toLowerCase() === matchCat.name.toLowerCase()
      );
    }
  }
  
  if (activeTag) {
    filteredExternal = filteredExternal.filter(a =>
      a.title.toLowerCase().includes(activeTag.toLowerCase()) ||
      a.excerpt?.toLowerCase().includes(activeTag.toLowerCase())
    );
  }
  
  if (searchQuery) {
    filteredExternal = heuristicSearch(filteredExternal, searchQuery);
  }

  // Pagination
  const totalItems = filteredExternal.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedExternal = filteredExternal.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const isFiltering = !!(activeCategory || activeTag || searchQuery);

  const featuredEditorial = editorialArticles[0];
  const restEditorials = editorialArticles.slice(1, 4);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Noticias</h1>
          <p className="text-text-secondary mt-2">
            Las últimas noticias sobre economía, mercados y finanzas
          </p>
        </header>

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-sm font-semibold leading-relaxed text-glow">
            Escribí una palabra o frase clave y presioná Enter o el ícono de Magic Brain. Obtendrás un briefing inteligente y las noticias filtradas al instante.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
          <SmartSearch defaultQuery={searchQuery} activeCategory={activeCategory} />
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <CategoryPill
              href="/noticias"
              label="Todas"
              count={allExternal.length}
              active={!activeCategory}
            />
            {newsCategories.slice(0, 6).map((category) => (
              <CategoryPill
                key={category.slug}
                href={`/noticias?categoria=${category.slug}`}
                label={category.name}
                count={category.count}
                active={activeCategory === category.slug}
              />
            ))}
          </div>
          </div>
        </div>

        {/* Active Filter Banner */}
        {isFiltering && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <Filter className="w-4 h-4 text-accent" />
            <span className="text-sm text-text-secondary">
              {searchQuery && <>Buscando: <strong>&quot;{searchQuery}&quot;</strong> · </>}
              {activeCategory && <>Categoría: <strong>{newsCategories.find(c => c.slug === activeCategory)?.name || activeCategory}</strong> · </>}
              {activeTag && <>Tag: <strong>#{activeTag}</strong> · </>}
              {totalItems} resultado{totalItems !== 1 ? 's' : ''}
            </span>
            <Link href="/noticias" className="ml-auto text-xs text-accent hover:underline">
              Limpiar filtros
            </Link>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Articles */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Editorial Section */}
            {editorialArticles.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                    <Pen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary dark:text-white">
                      INFORMES ESPECIALES
                    </h2>
                  </div>
                </div>

                {/* Featured Editorial */}
                {featuredEditorial && (
                  <Link href={`/noticias/${featuredEditorial.slug}`} className="group block mb-4">
                    <Card className="overflow-hidden border-2 border-amber-400/30 hover:border-amber-400/60 transition-all hover:shadow-xl bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
                      <div className="grid md:grid-cols-2">
                        <div className="relative aspect-video md:aspect-auto min-h-[200px] overflow-hidden">
                          <Image
                            src={featuredEditorial.imageUrl}
                            alt={featuredEditorial.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="50vw"
                            priority
                          />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Destacado
                            </Badge>
                          </div>
                        </div>
                        <div className="p-5 flex flex-col justify-center">
                          <Badge variant="accent" size="sm" className="w-fit mb-3">
                            {featuredEditorial.category}
                          </Badge>
                          <h3 className="text-xl font-bold text-text-primary dark:text-white group-hover:text-amber-600 transition-colors mb-3 line-clamp-2">
                            {featuredEditorial.title}
                          </h3>
                          <p className="text-sm text-text-secondary line-clamp-3 mb-4">
                            {featuredEditorial.excerpt}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span className="font-medium text-amber-600">
                              {featuredEditorial.author || 'Redacción RF'}
                            </span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{new Date(featuredEditorial.publishedAt).toLocaleDateString('es-AR')}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )}

                {/* Other Editorials */}
                {restEditorials.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {restEditorials.map((article) => (
                      <Link key={article.id} href={`/noticias/${article.slug}`} className="group block">
                        <Card className="overflow-hidden h-full border-l-4 border-l-amber-400 hover:shadow-lg transition-all">
                          <div className="relative aspect-video overflow-hidden">
                            <Image
                              src={article.imageUrl}
                              alt={article.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="33vw"
                            />
                          </div>
                          <div className="p-3">
                            <h4 className="text-sm font-semibold text-text-primary dark:text-white group-hover:text-amber-600 line-clamp-2 transition-colors">
                              {article.title}
                            </h4>
                            <span className="text-xs text-text-muted mt-1 block">
                              {new Date(article.publishedAt).toLocaleDateString('es-AR')}
                            </span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* External News Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Newspaper className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-text-primary dark:text-white">
                      {isFiltering ? 'Resultados' : 'Últimas Noticias'}
                    </h2>
                    <p className="text-xs text-text-muted">
                      {isFiltering
                        ? `${totalItems} resultado${totalItems !== 1 ? 's' : ''}`
                        : 'Noticias de medios especializados'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {paginatedExternal.length === 0 ? (
                <Card className="p-8 text-center">
                  <Search className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">No se encontraron noticias con los filtros seleccionados.</p>
                  <Link href="/noticias" className="text-sm text-accent hover:underline mt-2 inline-block">
                    Ver todas las noticias
                  </Link>
                </Card>
              ) : isFiltering ? (
                <div className="space-y-3">
                  {paginatedExternal.map((article) => (
                    <ExternalNewsCardHorizontal key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {paginatedExternal.map((article) => (
                    <ExternalNewsCard key={article.id} article={article} />
                  ))}
                </div>
              )}
            </section>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-8">
                {safePage > 1 && (
                  <Link
                    href={buildPageUrl(searchParams, safePage - 1)}
                    className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-surface-secondary transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (safePage <= 4) {
                    page = i + 1;
                  } else if (safePage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = safePage - 3 + i;
                  }
                  return (
                    <Link
                      key={page}
                      href={buildPageUrl(searchParams, page)}
                      className={`w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors ${
                        page === safePage
                          ? 'bg-accent text-white'
                          : 'border border-border hover:bg-surface-secondary'
                      }`}
                    >
                      {page}
                    </Link>
                  );
                })}
                {safePage < totalPages && (
                  <Link
                    href={buildPageUrl(searchParams, safePage + 1)}
                    className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-surface-secondary transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <aside className="space-y-6">
            {/* Trending */}
            <Card>
              <CardHeader 
                title={
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-positive" />
                    Tendencias
                  </span>
                } 
              />
              <CardContent>
                <div className="space-y-3">
                  {allExternal.slice(0, 5).map((article, index) => (
                    <div key={article.id} className="flex gap-3 group">
                      <span className="text-2xl font-bold text-text-muted/30 group-hover:text-accent/50 transition-colors">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <Link 
                          href={`/noticias/${article.slug}`}
                          className="text-sm text-text-primary dark:text-white hover:text-accent transition-colors line-clamp-2"
                        >
                          {article.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                          <ExternalLink className="w-3 h-3" />
                          {article.source}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            {newsCategories.length > 0 && (
              <Card>
                <CardHeader title="Categorías" />
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {newsCategories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/noticias?categoria=${category.slug}`}
                      >
                        <Badge variant="outline" size="sm" className="hover:bg-accent/10 transition-colors">
                          {category.name}
                          <span className="ml-1 text-text-muted">({category.count})</span>
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Popular Tags */}
            {popularTags.length > 0 && (
              <Card>
                <CardHeader 
                  title={
                    <span className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags Populares
                    </span>
                  }
                />
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/noticias?tag=${tag.slug}`}
                      >
                        <Badge variant="default" size="sm" className="hover:bg-accent/10 transition-colors">
                          #{tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sources Info */}
            <Card variant="outlined" className="bg-surface-secondary/50">
              <CardContent>
                <h3 className="text-sm font-medium text-text-primary dark:text-white mb-2">
                  Fuentes de Noticias
                </h3>
                <p className="text-xs text-text-muted mb-3">
                  Las noticias externas provienen de medios especializados. 
                  Hacé click para ver un resumen con análisis.
                </p>
                <div className="flex flex-wrap gap-1">
                  {['Ámbito', 'Infobae', 'Cronista'].map((source) => (
                    <Badge key={source} variant="default" size="sm">
                      {source}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

// Helper to build pagination URLs preserving current filters
function buildPageUrl(
  params: { categoria?: string; tag?: string; q?: string },
  page: number
): string {
  const urlParts: string[] = [];
  if (params.categoria) urlParts.push(`categoria=${params.categoria}`);
  if (params.tag) urlParts.push(`tag=${params.tag}`);
  if (params.q) urlParts.push(`q=${encodeURIComponent(params.q)}`);
  if (page > 1) urlParts.push(`pagina=${page}`);
  return `/noticias${urlParts.length > 0 ? '?' + urlParts.join('&') : ''}`;
}

// Category Pill Component
function CategoryPill({
  href,
  label,
  count,
  active = false,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
        ${active 
          ? 'bg-accent text-white' 
          : 'bg-surface-secondary text-text-secondary hover:bg-accent/10 hover:text-accent'
        }
      `}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`text-xs ${active ? 'text-white/70' : 'text-text-muted'}`}>
          ({count})
        </span>
      )}
    </Link>
  );
}
