'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ExternalNewsCard } from './latest-news-section';
import { Newspaper, RefreshCw, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { NewsArticle } from '@/lib/services/unified-news-service';
import { getFallbackImage } from '@/lib/image-fallbacks';

interface ExternalNewsResponse {
  success: boolean;
  count: number;
  articles: Array<{
    id: string;
    title: string;
    header: string;
    aiSummary: string;
    aiKeyPoints?: string[];
    sourceImageUrl?: string;
    aiImageUrl?: string;
    sourceUrl: string;
    sourceName: string;
    sourceId: string;
    category: string;
    priority: number;
    publishedAt: string;
    processedAt: string;
    isProcessed: boolean;
  }>;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Refresh interval: 15 minutes (900000ms)
const REFRESH_INTERVAL = 15 * 60 * 1000;

interface ExternalNewsLiveProps {
  initialArticles: NewsArticle[];
}

/**
 * Client component that auto-refreshes external news every hour
 */
export function ExternalNewsLive({ initialArticles }: ExternalNewsLiveProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { data, isValidating, mutate } = useSWR<ExternalNewsResponse>(
    '/api/news/processed?limit=30',
    fetcher,
    {
      fallbackData: {
        success: true,
        count: initialArticles.length,
        articles: initialArticles.map(a => ({
          id: a.id,
          title: a.title,
          header: a.excerpt,
          aiSummary: a.excerpt,
          sourceImageUrl: a.imageUrl,
          aiImageUrl: a.imageUrl,
          sourceUrl: a.sourceUrl || '',
          sourceName: a.source,
          sourceId: a.source.toLowerCase().replace(/\s+/g, '-'),
          category: a.category,
          priority: 5,
          publishedAt: a.publishedAt instanceof Date ? a.publishedAt.toISOString() : String(a.publishedAt),
          processedAt: a.publishedAt instanceof Date ? a.publishedAt.toISOString() : String(a.publishedAt),
          isProcessed: true,
        })),
      },
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Only fetch once per minute max
      onSuccess: () => {
        setLastUpdate(new Date());
      },
    }
  );

  // Transform API response to NewsArticle format
  const articles: NewsArticle[] = (data?.articles || []).map(a => ({
    id: a.id,
    title: a.title,
    slug: a.id,
    excerpt: a.aiSummary || a.header,
    content: a.aiSummary,
    imageUrl: a.sourceImageUrl || a.aiImageUrl || getFallbackImage(a.category, a.title),
    category: a.category,
    source: a.sourceName,
    sourceUrl: a.sourceUrl,
    publishedAt: new Date(a.publishedAt),
    isEditorial: false,
    isExternal: true,
    aiKeyPoints: a.aiKeyPoints,
  }));

  // Manual refresh function
  const handleRefresh = () => {
    mutate();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              Últimas Noticias
            </h2>
            <p className="text-xs text-text-muted">
              Noticias de medios especializados
            </p>
          </div>
        </div>
        
        {/* Refresh indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            <span>Actualizado {formatRelativeTime(lastUpdate.toISOString())}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isValidating}
            className="p-2 rounded-lg hover:bg-interactive-hover text-text-muted hover:text-accent transition-colors disabled:opacity-50"
            title="Actualizar noticias"
          >
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isValidating && articles.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          Cargando noticias...
        </div>
      )}

      {/* External News Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {articles.map((article) => (
          <ExternalNewsCard key={article.id} article={article} />
        ))}
      </div>

      {/* Load More */}
      {articles.length >= 20 && (
        <div className="text-center mt-8">
          <button className="px-6 py-2 text-sm font-medium text-accent hover:text-accent-dark border border-accent hover:border-accent-dark rounded-lg transition-colors">
            Cargar más noticias
          </button>
        </div>
      )}

      {/* Auto-refresh notice */}
      <div className="text-center mt-4 text-xs text-text-muted">
        Las noticias se actualizan automáticamente cada 15 minutos
      </div>
    </section>
  );
}
