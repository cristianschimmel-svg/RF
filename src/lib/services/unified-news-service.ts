/**
 * Unified News Service
 * Combines database articles (Editorial) with scraped external news
 * Uses processed news from JSON store when available
 */

import { cache } from './cache';
import { prisma } from '@/lib/db/prisma';
import { scraperManager } from './scrapers';
import { generateNewsSummary, generateNewsImage, isAIAvailable } from './ai';
import { getProcessedNews, isArticleRelevant, scrapeArticleContent, type ProcessedNews } from './news-processor';
import type { ScrapedArticle } from './scrapers/types';
import { getFallbackImage as getImageForCategory } from '@/lib/image-fallbacks';

// ============================================
// TYPES
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  categorySlug?: string;
  imageUrl: string;
  publishedAt: Date;
  source: string;
  sourceUrl?: string;
  author?: string;
  isEditorial: boolean;  // true = from DB (manual/editorial)
  isExternal: boolean;   // true = from scraper
  content?: string;
  // AI-generated content
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiImageUrl?: string;
}

export interface NewsWithAI extends NewsArticle {
  aiSummary: string;
  aiKeyPoints: string[];
  aiRelevance?: string;
  aiSentiment?: 'positive' | 'negative' | 'neutral';
}

// ============================================
// CATEGORY IMAGES (fallback) — delegated to shared utility
// ============================================

export { getImageForCategory };

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100);
}

// ============================================
// EDITORIAL ARTICLES (from Database)
// ============================================

async function fetchEditorialArticles(): Promise<NewsArticle[]> {
  try {
    const dbArticles = await prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
      },
      include: {
        category: true,
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 20,
    });

    return dbArticles.map((article: any) => {
      const categoryName = article.category?.name || 'Economía';
      return {
        id: `editorial-${article.id}`,
        title: article.title,
        excerpt: article.excerpt || '',
        slug: article.slug,
        category: categoryName,
        categorySlug: article.category?.slug,
        imageUrl: article.coverImage || article.featuredImage || getImageForCategory(categoryName, article.title),
        publishedAt: article.publishedAt || article.createdAt,
        source: 'Rosario Finanzas',
        author: article.author?.name || 'Redacción RF',
        isEditorial: true,
        isExternal: false,
        content: article.content,
      };
    });
  } catch (error) {
    console.error('[NewsService] Error fetching editorial articles:', error);
    return [];
  }
}

// ============================================
// EXTERNAL ARTICLES (from Scraper or Processed Store)
// ============================================

/**
 * Check if processed news data is too old to use as primary source
 * If older than 60 minutes, prefer live scraping with processed data as fallback
 */
const MAX_PROCESSED_AGE_MINUTES = 60;

function isProcessedNewsStale(articles: ProcessedNews[]): boolean {
  if (articles.length === 0) return true;
  
  // Check the most recent processedAt timestamp
  const newest = articles.reduce((latest, article) => {
    const processedTime = new Date(article.processedAt).getTime();
    return processedTime > latest ? processedTime : latest;
  }, 0);
  
  const minutesOld = (Date.now() - newest) / (1000 * 60);
  return minutesOld >= MAX_PROCESSED_AGE_MINUTES;
}

/**
 * Try to get processed news first, fall back to raw scraping
 * If processed news is stale, use live scraping as primary source
 */
async function fetchExternalArticles(): Promise<NewsArticle[]> {
  try {
    // First, try to get pre-processed news from JSON store
    const processedNews = await getProcessedNews();
    const stale = isProcessedNewsStale(processedNews);
    
    if (processedNews.length > 0 && !stale) {
      console.log(`[NewsService] Using ${processedNews.length} fresh processed articles from store`);
      return processedNews.map((article: ProcessedNews) => ({
        id: article.id,
        title: article.title,
        excerpt: article.header,
        slug: article.id,
        category: article.category,
        imageUrl: article.sourceImageUrl || article.aiImageUrl || getImageForCategory(article.category, article.title),
        publishedAt: new Date(article.publishedAt),
        source: article.sourceName,
        sourceUrl: article.sourceUrl,
        isEditorial: false,
        isExternal: true,
        aiSummary: article.aiSummary,
        aiKeyPoints: article.aiKeyPoints,
        aiImageUrl: article.aiImageUrl || undefined,
        content: article.originalContent,
      }));
    }

    // Processed news is stale or empty - use live scraping
    if (stale && processedNews.length > 0) {
      console.log(`[NewsService] ⚠️ Processed articles are stale (>${MAX_PROCESSED_AGE_MINUTES}min old). Using live RSS scraping...`);
    } else {
      console.log('[NewsService] No processed articles found. Using live RSS scraping...');
    }
    
    const scrapedArticles = await scraperManager.fetchAllNews();
    
    // Apply the same relevance filter used by the processor (exclusion + finance keywords)
    const filteredArticles = scrapedArticles.filter(isArticleRelevant);
    console.log(`[NewsService] Live RSS: ${scrapedArticles.length} raw → ${filteredArticles.length} after relevance filter`);
    
    if (filteredArticles.length > 0) {
      console.log(`[NewsService] Got ${filteredArticles.length} relevant live articles from RSS feeds`);
      return filteredArticles.map((article: ScrapedArticle) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        slug: article.id,
        category: article.category,
        imageUrl: article.imageUrl || getImageForCategory(article.category, article.title),
        publishedAt: article.publishedAt,
        source: article.source.name,
        sourceUrl: article.url,
        isEditorial: false,
        isExternal: true,
      }));
    }
    
    // If live scraping also failed, fall back to stale processed news as last resort
    if (processedNews.length > 0) {
      console.log(`[NewsService] ⚠️ Live scraping returned nothing. Falling back to stale processed news.`);
      return processedNews.map((article: ProcessedNews) => ({
        id: article.id,
        title: article.title,
        excerpt: article.header,
        slug: article.id,
        category: article.category,
        imageUrl: article.sourceImageUrl || article.aiImageUrl || getImageForCategory(article.category, article.title),
        publishedAt: new Date(article.publishedAt),
        source: article.sourceName,
        sourceUrl: article.sourceUrl,
        isEditorial: false,
        isExternal: true,
        aiSummary: article.aiSummary,
        aiKeyPoints: article.aiKeyPoints,
        aiImageUrl: article.aiImageUrl || undefined,
        content: article.originalContent,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[NewsService] Error fetching external articles:', error);
    return [];
  }
}

// ============================================
// COMBINED NEWS FUNCTIONS
// ============================================

/**
 * Get all news (Editorial first, then External)
 */
export async function getAllNews(): Promise<NewsArticle[]> {
  const cacheKey = 'news:unified:all';
  const cached = cache.get<NewsArticle[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const [editorialArticles, externalArticles] = await Promise.all([
    fetchEditorialArticles(),
    fetchExternalArticles(),
  ]);

  // Combine: Editorial articles first, then external sorted by date
  const allArticles = [
    ...editorialArticles,
    ...externalArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()),
  ];

  cache.set(cacheKey, allArticles, 120); // Cache 2 minutes
  return allArticles;
}

/**
 * Get only editorial articles
 */
export async function getEditorialNews(limit = 5): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews.filter(n => n.isEditorial).slice(0, limit);
}

/**
 * Get only external articles
 */
export async function getExternalNews(limit = 20): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews.filter(n => n.isExternal).slice(0, limit);
}

/**
 * Get latest news for homepage
 */
export async function getLatestNews(limit = 8): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews.slice(0, limit);
}

/**
 * Get news by category
 */
export async function getNewsByCategory(category: string, limit = 20): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews
    .filter(n => 
      n.category.toLowerCase() === category.toLowerCase() || 
      n.categorySlug === category
    )
    .slice(0, limit);
}

/**
 * Get single article by slug (with AI summary for external)
 */
export async function getNewsArticle(slug: string): Promise<NewsWithAI | null> {
  const allNews = await getAllNews();
  const article = allNews.find(n => n.slug === slug);
  
  if (!article) {
    return null;
  }

  // If article already has AI summary (from processed store), use it
  if (article.aiSummary && article.aiSummary !== article.excerpt) {
    // Even with pre-processed summary, ensure we have a real image
    let imageUrl = article.imageUrl;
    if (article.isExternal && article.sourceUrl && (!imageUrl || imageUrl.includes('unsplash.com'))) {
      try {
        const scraped = await scrapeArticleContent(article.sourceUrl);
        if (scraped.imageUrl) {
          imageUrl = scraped.imageUrl;
        }
      } catch { /* ignore */ }
    }
    return {
      ...article,
      imageUrl,
      aiSummary: article.aiSummary,
      aiKeyPoints: article.aiKeyPoints || [],
    };
  }

  // For external articles without pre-processed summary, generate on-demand
  if (article.isExternal && isAIAvailable()) {
    const summary = await generateNewsSummary(
      article.title,
      article.excerpt,
      article.source
    );
    
    // Check if we have a real source image (not an Unsplash fallback)
    let realImageUrl = article.imageUrl && !article.imageUrl.includes('unsplash.com')
      ? article.imageUrl
      : undefined;

    // If no real image, try scraping og:image from the source URL
    if (!realImageUrl && article.sourceUrl) {
      try {
        console.log(`[NewsService] Scraping og:image for: ${article.title.slice(0, 50)}...`);
        const scraped = await scrapeArticleContent(article.sourceUrl);
        if (scraped.imageUrl) {
          realImageUrl = scraped.imageUrl;
          console.log(`[NewsService] ✅ Got og:image: ${realImageUrl.slice(0, 80)}...`);
        }
      } catch (err) {
        console.warn('[NewsService] Failed to scrape og:image:', err);
      }
    }

    // Fall back to AI image generation only if we still don't have a real image
    const aiImage = realImageUrl ? undefined : await generateNewsImage(article.title, article.category);

    return {
      ...article,
      imageUrl: realImageUrl || article.imageUrl,
      aiSummary: summary?.summary || article.excerpt,
      aiKeyPoints: summary?.keyPoints || [],
      aiRelevance: summary?.relevance,
      aiSentiment: summary?.sentiment,
      aiImageUrl: aiImage || article.aiImageUrl,
    };
  }

  // For external articles without AI, still try to get real image
  if (article.isExternal && article.sourceUrl) {
    let imageUrl = article.imageUrl;
    if (!imageUrl || imageUrl.includes('unsplash.com')) {
      try {
        const scraped = await scrapeArticleContent(article.sourceUrl);
        if (scraped.imageUrl) {
          imageUrl = scraped.imageUrl;
        }
      } catch { /* ignore */ }
    }
    return {
      ...article,
      imageUrl,
      aiSummary: article.content || article.excerpt,
      aiKeyPoints: [],
    };
  }

  // For editorial, use content as summary
  return {
    ...article,
    aiSummary: article.content || article.excerpt,
    aiKeyPoints: [],
  };
}

/**
 * Get article by ID
 */
export async function getNewsById(id: string): Promise<NewsArticle | null> {
  const allNews = await getAllNews();
  return allNews.find(n => n.id === id) || null;
}

/**
 * Force refresh all caches
 */
export function invalidateNewsCache(): void {
  cache.delete('news:unified:all');
  scraperManager.invalidateCache();
}
