import { notFound } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getNewsArticle, getExternalNews } from '@/lib/services/unified-news-service';
import { formatDate, formatRelativeTime, markdownToHtml } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  User,
  Calendar,
  Share2,
  ChevronLeft,
  BookOpen,
  ExternalLink,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  ArrowRight,
  Pen,
  Newspaper,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);

  if (!article) {
    return {
      title: 'Artículo no encontrado | Rosario Finanzas',
    };
  }

  // For editorial articles, fetch SEO fields from DB
  let metaTitle: string | undefined;
  let metaDescription: string | undefined;
  let ogImage: string | undefined;
  let keywords: string | undefined;

  if (article.isEditorial) {
    try {
      const { prisma } = await import('@/lib/db/prisma');
      const dbArticle = await prisma.article.findUnique({
        where: { slug },
        select: { metaTitle: true, metaDescription: true, ogImage: true, keywords: true },
      });
      metaTitle = dbArticle?.metaTitle || undefined;
      metaDescription = dbArticle?.metaDescription || undefined;
      ogImage = dbArticle?.ogImage || undefined;
      keywords = dbArticle?.keywords || undefined;
    } catch { /* ignore, fall back to defaults */ }
  }

  const title = metaTitle || article.title;
  const description = metaDescription || article.excerpt || article.aiSummary;
  const image = ogImage || article.imageUrl;

  return {
    title: `${title} | Rosario Finanzas`,
    description,
    ...(keywords && { keywords: keywords.split(',').map((k: string) => k.trim()) }),
    openGraph: {
      title,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getNewsArticle(slug);

  if (!article) {
    notFound();
  }

  // Get related news
  const relatedNews = await getExternalNews(5);
  const filteredRelated = relatedNews.filter(n => n.slug !== slug).slice(0, 4);

  // Calculate reading time
  const content = article.content || article.aiSummary || article.excerpt;
  const wordCount = content?.split(/\s+/).length || 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <MainLayout>
      <article className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Link */}
        <Link
          href="/noticias"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-accent transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Noticias
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <header className="mb-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
                {/* Source Badge */}
                {article.isExternal ? (
                  <Badge variant="outline" className="gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {article.source}
                  </Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 gap-1">
                    <Pen className="w-3 h-3" />
                    INFORMES ESPECIALES
                  </Badge>
                )}
                
                <Badge variant="accent">
                  {article.category}
                </Badge>
                
                <span className="text-sm text-text-muted flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  {readingTime} min de lectura
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary dark:text-white mb-4">
                {article.title}
              </h1>

              {article.excerpt && (
                <p className="text-lg text-text-secondary mb-6">
                  {article.excerpt}
                </p>
              )}

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted pb-6 border-b border-border">
                {article.author && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <span className="font-medium text-text-primary dark:text-white">
                      {article.author}
                    </span>
                  </div>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(article.publishedAt, { format: 'long' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatRelativeTime(article.publishedAt)}
                </span>
              </div>
            </header>

            {/* Featured Image */}
            <div className="relative aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
              <Image
                src={article.imageUrl || article.aiImageUrl || '/banners/Rosario Finanzas Logo_nuevo.png'}
                alt={article.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
              {article.isExternal && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <p className="text-xs text-white/80">
                    Imagen ilustrativa
                  </p>
                </div>
              )}
            </div>

            {/* AI Summary Section (for external articles) */}
            {article.isExternal && article.aiSummary && (
              <Card className="mb-8 border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                <CardHeader 
                  title={
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-accent" />
                      Resumen Inteligente
                    </span>
                  }
                />
                <CardContent>
                  {/* Key Points */}
                  {article.aiKeyPoints && article.aiKeyPoints.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-text-primary dark:text-white mb-3">
                        Puntos Clave
                      </h4>
                      <ul className="space-y-2">
                        {article.aiKeyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-positive mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-text-secondary">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary */}
                  <div 
                    className="prose prose-warm max-w-none text-text-secondary leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: article.aiSummary.includes('<p>') 
                        ? article.aiSummary 
                        : article.aiSummary.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('') 
                    }}
                  />

                  {/* Sentiment & Relevance */}
                  {(article.aiSentiment || article.aiRelevance) && (
                    <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-4">
                      {article.aiSentiment && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">Tendencia:</span>
                          <SentimentBadge sentiment={article.aiSentiment} />
                        </div>
                      )}
                      {article.aiRelevance && (
                        <div className="flex-1">
                          <span className="text-xs text-text-muted">Relevancia:</span>
                          <p className="text-sm text-text-secondary mt-1">{article.aiRelevance}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Editorial Content (for DB articles) */}
            {article.isEditorial && article.content && (
              <div
                className="prose prose-warm max-w-none mb-8"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(article.content),
                }}
              />
            )}

            {/* Subtle External Link */}
            {article.isExternal && article.sourceUrl && (
              <div className="mb-8 flex items-center justify-end">
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-dark transition-colors group"
                >
                  <span>Leer artículo completo en {article.source}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            )}

            {/* Share Section */}
            <div className="flex items-center gap-4 py-6 border-t border-border">
              <span className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Compartir:
              </span>
              <div className="flex gap-2">
                <ShareButton
                  platform="twitter"
                  url={`https://rosariofinanzas.com.ar/noticias/${article.slug}`}
                  title={article.title}
                />
                <ShareButton
                  platform="facebook"
                  url={`https://rosariofinanzas.com.ar/noticias/${article.slug}`}
                  title={article.title}
                />
                <ShareButton
                  platform="linkedin"
                  url={`https://rosariofinanzas.com.ar/noticias/${article.slug}`}
                  title={article.title}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* About Source */}
            {article.isExternal && (
              <Card>
                <CardHeader title="Sobre la fuente" />
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center">
                      <Newspaper className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-text-primary dark:text-white">
                        {article.source}
                      </h4>
                      <p className="text-xs text-text-muted">Medio especializado</p>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Esta noticia proviene de un medio externo. El resumen fue generado 
                    por IA para facilitar su lectura.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Related News */}
            {filteredRelated.length > 0 && (
              <Card>
                <CardHeader title="Noticias Relacionadas" />
                <CardContent>
                  <div className="space-y-3">
                    {filteredRelated.map((news) => (
                      <Link
                        key={news.id}
                        href={`/noticias/${news.slug}`}
                        className="flex gap-3 group p-2 -mx-2 rounded-lg hover:bg-interactive-hover transition-colors"
                      >
                        <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={news.imageUrl}
                            alt={news.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-medium text-text-primary dark:text-white group-hover:text-accent line-clamp-2 transition-colors">
                            {news.title}
                          </h4>
                          <span className="text-[10px] text-text-muted">
                            {news.source}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Magic Brain Disclaimer */}
            <Card variant="outlined" className="bg-gradient-to-br from-purple-50/80 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 border-purple-200/50 dark:border-purple-800/30">
              <CardContent>
                <div className="flex gap-3 items-start">
                  <Image
                    src="/Fijos/Magic_Brain_Transparent.png"
                    alt="Magic Brain"
                    width={32}
                    height={32}
                    className="flex-shrink-0"
                  />
                  <div>
                    <h4 className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      Magic Brain Responsive
                    </h4>
                    <p className="text-[10px] text-purple-700/80 dark:text-purple-400/70 mt-1">
                      Los resúmenes y análisis son generados por inteligencia artificial. 
                      Consultá siempre la fuente original para información verificada.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </article>
    </MainLayout>
  );
}

// Sentiment Badge Component
function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'negative' | 'neutral' }) {
  const config = {
    positive: {
      icon: TrendingUp,
      label: 'Positivo',
      className: 'bg-positive/10 text-positive border-positive/20',
    },
    negative: {
      icon: TrendingDown,
      label: 'Negativo',
      className: 'bg-negative/10 text-negative border-negative/20',
    },
    neutral: {
      icon: Minus,
      label: 'Neutral',
      className: 'bg-surface-secondary text-text-muted',
    },
  };

  const { icon: Icon, label, className } = config[sentiment];

  return (
    <Badge variant="outline" size="sm" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

// Share Button Component
function ShareButton({
  platform,
  url,
  title,
}: {
  platform: 'twitter' | 'facebook' | 'linkedin';
  url: string;
  title: string;
}) {
  const getShareUrl = () => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    }
  };

  const icons = {
    twitter: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    facebook: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    linkedin: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  };

  return (
    <a
      href={getShareUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 rounded-full bg-surface-secondary hover:bg-accent hover:text-white flex items-center justify-center text-text-muted transition-colors"
    >
      {icons[platform]}
    </a>
  );
}
