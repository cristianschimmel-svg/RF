'use client';

import { useEffect } from 'react';
import { getProxyImageUrl } from '@/lib/utils';
import { getFallbackImage } from '@/lib/image-fallbacks';
import type { NewsArticle } from '@/lib/services/unified-news-service';

export function ImagePrefetcher({ articles }: { articles: NewsArticle[] }) {
  useEffect(() => {
    // Only prefetch valid images for the first 3-5 articles to not waste bandwidth
    const topArticles = articles.slice(0, 5);
    
    topArticles.forEach(article => {
      const src = getProxyImageUrl(article.imageUrl) || getFallbackImage(article.category, article.title);
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [articles]);

  return null;
}
