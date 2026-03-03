'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/utils';
import { Clock, ExternalLink, ChevronRight, Newspaper, TrendingUp } from 'lucide-react';
import type { NewsArticle } from '@/lib/services/unified-news-service';

// Strip HTML tags from text
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Default fallback image
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop';

interface LatestNewsSectionProps {
  articles: NewsArticle[];
  showViewAll?: boolean;
}

export function LatestNewsSection({ articles, showViewAll = true }: LatestNewsSectionProps) {
  if (articles.length === 0) return null;

  // Split articles into layout zones
  const heroArticle = articles[0];
  const secondaryArticles = articles.slice(1, 3); // 2 stacked beside hero
  const midArticles = articles.slice(3, 6); // 3-column row
  const compactArticles = articles.slice(6); // remaining as compact list

  return (
    <section className="mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              Últimas Noticias
            </h2>
            <p className="text-xs text-text-muted">
              Noticias financieras en tiempo real
            </p>
          </div>
        </div>
        {showViewAll && (
          <Link
            href="/noticias"
            className="text-sm text-accent hover:text-accent-dark flex items-center gap-1 transition-colors"
          >
            Ver todas
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Row 1: Hero (left 2/3) + 2 Stacked Secondary (right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
        {/* Hero Article - Large */}
        <div className="lg:col-span-2">
          <NewsHeroCard article={heroArticle} />
        </div>

        {/* Secondary Articles - Stacked */}
        <div className="flex flex-col gap-3">
          {secondaryArticles.map((article) => (
            <NewsMediumCard key={article.id} article={article} />
          ))}
        </div>
      </div>

      {/* Row 2: 3 Medium Cards */}
      {midArticles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
          {midArticles.map((article) => (
            <NewsStandardCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {/* Row 3: Compact Text List */}
      {compactArticles.length > 0 && (
        <div className="border-t border-border-primary dark:border-slate-700 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0">
            {compactArticles.map((article) => (
              <NewsCompactItem key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Hero Card: Big image with overlay text ─────────────────────────
function NewsHeroCard({ article }: { article: NewsArticle }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <Link href={`/noticias/${article.slug}`} className="group block h-full">
      <Card className="overflow-hidden h-full hover:shadow-xl transition-all hover:border-accent/30 relative">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-surface-secondary">
          <Image
            src={imgSrc}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 1024px) 100vw, 66vw"
            onError={handleImageError}
            unoptimized={imgError}
            priority
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Badges on top */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge variant="accent" size="sm" className="backdrop-blur-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              {article.category}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge 
              variant="default" 
              size="sm"
              className="bg-white/90 dark:bg-slate-900/90 text-text-secondary text-2xs backdrop-blur-sm"
            >
              <ExternalLink className="w-2.5 h-2.5 mr-1" />
              {article.source}
            </Badge>
          </div>

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors line-clamp-3 mb-2 leading-tight">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="text-xs sm:text-sm text-white/80 line-clamp-2 mb-2 hidden sm:block">
                {stripHtml(article.excerpt)}
              </p>
            )}
            <div className="flex items-center gap-2 text-2xs text-white/60">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.publishedAt)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Medium Card: Image left + text right (horizontal) ──────────────
function NewsMediumCard({ article }: { article: NewsArticle }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <Link href={`/noticias/${article.slug}`} className="group block flex-1">
      <Card className="overflow-hidden h-full hover:shadow-lg transition-all hover:border-accent/30">
        <div className="flex h-full">
          {/* Thumbnail */}
          <div className="relative w-28 sm:w-32 flex-shrink-0 overflow-hidden bg-surface-secondary">
            <Image
              src={imgSrc}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="128px"
              onError={handleImageError}
              unoptimized={imgError}
            />
          </div>
          {/* Content */}
          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="accent" size="sm" className="text-2xs py-0 px-1.5">
                  {article.category}
                </Badge>
                <span className="text-2xs text-text-muted dark:text-slate-500 truncate">
                  {article.source}
                </span>
              </div>
              <h3 className="font-semibold text-xs sm:text-sm text-text-primary dark:text-white group-hover:text-accent transition-colors line-clamp-3 leading-snug">
                {article.title}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-text-muted mt-2">
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(article.publishedAt)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Standard Card: Vertical image + text (for 3-column row) ────────
function NewsStandardCard({ article }: { article: NewsArticle }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <Link href={`/noticias/${article.slug}`} className="group block h-full">
      <Card className="overflow-hidden h-full hover:shadow-lg transition-all hover:border-accent/30">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-surface-secondary">
          <Image
            src={imgSrc}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={handleImageError}
            unoptimized={imgError}
          />
          {/* Category Badge */}
          <div className="absolute bottom-2 left-2">
            <Badge variant="accent" size="sm">
              {article.category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-text-primary dark:text-white group-hover:text-accent transition-colors line-clamp-2 mb-1.5 leading-snug">
            {article.title}
          </h3>
          <div className="flex items-center justify-between text-2xs text-text-muted">
            <span className="truncate">{article.source}</span>
            <span className="flex items-center gap-1 flex-shrink-0 ml-2">
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Compact Item: Text-only row with accent left border ────────────
function NewsCompactItem({ article }: { article: NewsArticle }) {
  return (
    <Link href={`/noticias/${article.slug}`} className="group block">
      <div className="flex items-start gap-3 py-2.5 border-l-2 border-transparent hover:border-accent pl-3 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant="accent" size="sm" className="text-2xs py-0 px-1.5 flex-shrink-0">
              {article.category}
            </Badge>
            <span className="text-2xs text-text-muted dark:text-slate-500 truncate">
              {article.source}
            </span>
            <span className="text-2xs text-text-muted dark:text-slate-600 flex-shrink-0">·</span>
            <span className="text-2xs text-text-muted dark:text-slate-500 flex-shrink-0 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-medium text-text-primary dark:text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h4>
        </div>
      </div>
    </Link>
  );
}

// ─── Legacy exports for backward compatibility ─────────────────────

interface ExternalNewsCardProps {
  article: NewsArticle;
  compact?: boolean;
}

export function ExternalNewsCard({ article, compact = false }: ExternalNewsCardProps) {
  return <NewsStandardCard article={article} />;
}

// Horizontal variant for sidebar
export function ExternalNewsCardHorizontal({ article }: { article: NewsArticle }) {
  const [imgSrc, setImgSrc] = useState(article.imageUrl || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  return (
    <Link href={`/noticias/${article.slug}`} className="group block">
      <div className="flex gap-3 p-2 rounded-lg hover:bg-interactive-hover transition-colors">
        <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0">
          <Image
            src={imgSrc}
            alt={article.title}
            fill
            className="object-cover"
            sizes="64px"
            onError={handleImageError}
            unoptimized={imgError}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-1">
            <Badge variant="default" size="sm" className="text-2xs py-0 px-1">
              {article.source}
            </Badge>
          </div>
          <h4 className="text-xs font-medium text-text-primary dark:text-white group-hover:text-accent line-clamp-2 transition-colors">
            {article.title}
          </h4>
          <span className="text-2xs text-text-muted">
            {formatRelativeTime(article.publishedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
