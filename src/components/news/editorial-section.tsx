'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatRelativeTime, getProxyImageUrl } from '@/lib/utils';
import { getFallbackImage } from '@/lib/image-fallbacks';
import { Pen, Clock, ChevronRight, Star } from 'lucide-react';
import type { NewsArticle } from '@/lib/services/unified-news-service';

interface EditorialSectionProps {
  articles: NewsArticle[];
  showViewAll?: boolean;
}

export function EditorialSection({ articles, showViewAll = true }: EditorialSectionProps) {
  if (articles.length === 0) return null;

  const featured = articles[0];
  const rest = articles.slice(1, 4);

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Pen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              INFORMES ESPECIALES
            </h2>
            <p className="text-xs text-text-muted">
              Análisis exclusivo de Rosario Finanzas
            </p>
          </div>
        </div>
        {showViewAll && (
          <Link
            href="/noticias?filter=editorial"
            className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Featured Editorial */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EditorialFeaturedCard article={featured} />
        
        {/* Other editorials */}
        <div className="lg:col-span-1 space-y-3">
          {rest.map((article) => (
            <EditorialMiniCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}

function EditorialFeaturedCard({ article }: { article: NewsArticle }) {
  const fallback = getFallbackImage(article.category, article.title);
  const [imgSrc, setImgSrc] = useState(getProxyImageUrl(article.imageUrl) || fallback);
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/noticias/${article.slug}`} className="group block lg:col-span-2">
      <Card className="overflow-hidden h-full border-2 border-amber-400/30 hover:border-amber-400/60 transition-all hover:shadow-xl bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10">
        <div className="grid md:grid-cols-2 h-full">
          {/* Image */}
          <div className="relative aspect-video md:aspect-auto min-h-[200px] overflow-hidden">
            <Image
              src={imgSrc}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
              unoptimized={imgError}
              onError={() => {
                if (!imgError) {
                  setImgError(true);
                  setImgSrc(fallback);
                }
              }}
            />
            <div className="absolute top-3 left-3">
              <Badge 
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg"
              >
                <Star className="w-3 h-3 mr-1 fill-current" />
                Destacado
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col justify-center">
            <Badge variant="accent" size="sm" className="w-fit mb-3">
              {article.category}
            </Badge>
            
            <h3 className="text-xl font-bold text-text-primary dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-3 line-clamp-2">
              {article.title}
            </h3>
            
            <p className="text-sm text-text-secondary line-clamp-3 mb-4">
              {article.excerpt}
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {article.author || 'Redacción RF'}
                </span>
                <span>•</span>
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(article.publishedAt)}</span>
              </div>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400 group-hover:gap-2 transition-all flex items-center gap-1">
                Leer
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EditorialMiniCard({ article }: { article: NewsArticle }) {
  const fallback = getFallbackImage(article.category, article.title);
  const [imgSrc, setImgSrc] = useState(getProxyImageUrl(article.imageUrl) || fallback);
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/noticias/${article.slug}`} className="group block">
      <Card className="p-3 border-l-4 border-l-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
        <div className="flex gap-3">
          <div className="relative w-20 h-16 rounded overflow-hidden flex-shrink-0">
            <Image
              src={imgSrc}
              alt={article.title}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized={imgError}
              onError={() => {
                if (!imgError) {
                  setImgError(true);
                  setImgSrc(fallback);
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-text-primary dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 line-clamp-2 transition-colors">
              {article.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.publishedAt)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
