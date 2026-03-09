'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatRelativeTime, formatDate, getProxyImageUrl } from '@/lib/utils';
import { Clock, User, ChevronRight } from 'lucide-react';

interface NewsCardProps {
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  categorySlug?: string;
  imageUrl?: string;
  publishedAt: Date;
  author?: string;
}

export function NewsCard({
  title,
  excerpt,
  slug,
  category,
  categorySlug,
  imageUrl,
  publishedAt,
  author,
}: NewsCardProps) {
  return (
    <Link href={`/noticias/${slug}`} prefetch={true} className="group block">
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative aspect-video bg-surface-secondary overflow-hidden">
          {imageUrl ? (
            <Image
              src={getProxyImageUrl(imageUrl)}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/5 to-accent/10">
              <span className="text-4xl text-accent/20">📰</span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge variant="accent" size="sm">
              {category}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2 mb-2">
            {title}
          </h3>
          <p className="text-sm text-text-secondary line-clamp-2 mb-3">
            {excerpt}
          </p>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeTime(publishedAt)}
            </span>
            {author && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {author}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NewsFeatured({
  title,
  excerpt,
  slug,
  category,
  imageUrl,
  publishedAt,
  author,
}: NewsCardProps) {
  return (
    <Link href={`/noticias/${slug}`} prefetch={true} className="group block">
      <Card className="overflow-hidden hover:shadow-xl transition-shadow">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-video md:aspect-[4/3] bg-surface-secondary overflow-hidden">
            {imageUrl ? (
              <Image
                src={getProxyImageUrl(imageUrl)}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/20">
                <span className="text-6xl text-accent/30">📰</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 flex flex-col justify-center">
            <Badge variant="accent" size="sm" className="w-fit mb-3">
              {category}
            </Badge>
            <h2 className="text-xl md:text-2xl font-bold text-text-primary group-hover:text-accent transition-colors mb-3">
              {title}
            </h2>
            <p className="text-text-secondary line-clamp-3 mb-4">
              {excerpt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatRelativeTime(publishedAt)}
                </span>
                {author && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {author}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                Leer más
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NewsCardCompact({
  title,
  slug,
  category,
  publishedAt,
}: Pick<NewsCardProps, 'title' | 'slug' | 'category' | 'publishedAt'>) {
  return (
    <Link
      href={`/noticias/${slug}`}
      prefetch={true}
      className="block group p-3 rounded-lg hover:bg-interactive-hover transition-colors"
    >
      <div className="flex items-start gap-2 mb-1">
        <Badge size="sm" variant="default">
          {category}
        </Badge>
        <span className="text-2xs text-text-muted">
          {formatRelativeTime(publishedAt)}
        </span>
      </div>
      <h4 className="text-sm text-text-primary group-hover:text-accent transition-colors line-clamp-2">
        {title}
      </h4>
    </Link>
  );
}

export function NewsCardHorizontal({
  title,
  excerpt,
  slug,
  category,
  imageUrl,
  publishedAt,
  author,
}: NewsCardProps) {
  return (
    <Link href={`/noticias/${slug}`} prefetch={true} className="group block">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex">
          {/* Image */}
          <div className="relative w-32 md:w-48 flex-shrink-0 bg-surface-secondary">
            {imageUrl ? (
              <Image
                src={getProxyImageUrl(imageUrl)}
                alt={title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="200px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/5 to-accent/10">
                <span className="text-3xl text-accent/20">📰</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="accent" size="sm">
                {category}
              </Badge>
              <span className="text-2xs text-text-muted">
                {formatRelativeTime(publishedAt)}
              </span>
            </div>
            <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2 mb-1">
              {title}
            </h3>
            <p className="text-sm text-text-secondary line-clamp-2 hidden md:block">
              {excerpt}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NewsCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-surface-secondary animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-16 bg-surface-secondary rounded animate-pulse" />
        <div className="h-5 w-full bg-surface-secondary rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-surface-secondary rounded animate-pulse" />
        <div className="h-3 w-24 bg-surface-secondary rounded animate-pulse" />
      </div>
    </Card>
  );
}

export function NewsFeaturedSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-2 gap-0">
        <div className="aspect-video md:aspect-[4/3] bg-surface-secondary animate-pulse" />
        <div className="p-6 space-y-4">
          <div className="h-5 w-20 bg-surface-secondary rounded animate-pulse" />
          <div className="h-7 w-full bg-surface-secondary rounded animate-pulse" />
          <div className="h-5 w-5/6 bg-surface-secondary rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-surface-secondary rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-surface-secondary rounded animate-pulse" />
          </div>
          <div className="h-4 w-32 bg-surface-secondary rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
