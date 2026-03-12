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
import { generateAISummary } from './news-processor/ai-summarizer';
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
  aiSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  aiRelevance?: string;
}

export interface NewsWithAI extends NewsArticle {
  aiSummary: string;
  aiKeyPoints: string[];
  aiRelevance?: string;
  aiSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
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
        aiSentiment: article.aiSentiment,
        aiRelevance: article.aiRelevance,
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
    
    // Get URLs of soft-deleted articles to exclude from live RSS results
    const deletedArticles = await prisma.processedNewsArticle.findMany({
      where: { isDeleted: true },
      select: { sourceUrl: true },
    });
    const deletedUrls = new Set(deletedArticles.map(a => a.sourceUrl));
    
    // Apply the same relevance filter used by the processor (exclusion + finance keywords)
    // Also exclude articles that were soft-deleted by admin
    const filteredArticles = scrapedArticles
      .filter(a => !deletedUrls.has(a.url))
      .filter(a => isArticleRelevant(a));
    console.log(`[NewsService] Live RSS: ${scrapedArticles.length} raw → ${filteredArticles.length} after relevance + deletion filter`);
    
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
        aiSentiment: article.aiSentiment,
        aiRelevance: article.aiRelevance,
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

  cache.set(cacheKey, allArticles, 30); // Cache 30 seconds (short to reflect admin changes quickly)
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
  // First attempt: check if it's an editorial article by direct DB query (Fast path)
  try {
    const dbArticle = await prisma.article.findUnique({
      where: {
        slug: slug,
      },
      include: {
        category: true,
        author: {
          select: { name: true },
        },
      },
    });

    if (dbArticle && dbArticle.status === 'PUBLISHED') {
      const categoryName = dbArticle.category?.name || 'Economía';
      const article: NewsArticle = {
        id: `editorial-${dbArticle.id}`,
        title: dbArticle.title,
        excerpt: dbArticle.excerpt || '',
        slug: dbArticle.slug,
        category: categoryName,
        categorySlug: dbArticle.category?.slug,
        imageUrl: dbArticle.coverImage || dbArticle.featuredImage || getImageForCategory(categoryName, dbArticle.title),
        publishedAt: dbArticle.publishedAt || dbArticle.createdAt,
        source: 'Rosario Finanzas',
        author: dbArticle.author?.name || 'Redacción RF',
        isEditorial: true,
        isExternal: false,
        content: dbArticle.content ?? undefined,
      };

      return {
        ...article,
        aiSummary: article.content || article.excerpt,
        aiKeyPoints: [],
      };
    }
  } catch (error) {
    console.error(`[NewsService] Error fetching editorial article by slug ${slug}:`, error);
    // Ignore and fallback to full search if DB fails
  }

  // Second attempt: it's not an editorial article, so we get external articles
  // Get from processed store first
  const processedNews = await getProcessedNews();
  let article: NewsArticle | undefined;
  
  if (processedNews && processedNews.length > 0) {
    const mapped = processedNews.map((p: ProcessedNews) => ({
      id: p.id,
      title: p.title,
      excerpt: p.header,
      slug: p.id,
      category: p.category,
      imageUrl: p.sourceImageUrl || p.aiImageUrl || getImageForCategory(p.category, p.title),
      publishedAt: new Date(p.publishedAt),
      source: p.sourceName,
      sourceUrl: p.sourceUrl,
      isEditorial: false,
      isExternal: true,
      aiSummary: p.aiSummary,
      aiKeyPoints: p.aiKeyPoints,
      aiImageUrl: p.aiImageUrl || undefined,
      aiSentiment: p.aiSentiment,
      aiRelevance: p.aiRelevance,
      content: p.originalContent,
    }));
    article = mapped.find(n => n.slug === slug);
  }

  // Fallback to fetchExternalArticles if not found in processed (which handles fallback fetching)
  if (!article) {
    const externalNews = await fetchExternalArticles();
    article = externalNews.find(n => n.slug === slug);
  }
  
  if (!article) {
    return null;
  }

  // --- Defer slow operations if possible ---
  // Return early with whatever we have. If generating summaries/scraping images is taking too long
  // we do a background fire-and-forget or client-side fetch, but for now we'll speed it up
  // internally or let next layout quickly.

  // If article already has AI summary (from processed store), use it
  if (article.aiSummary && article.aiSummary !== article.excerpt) {
    // Fire-and-forget image scraping if missing
    if (article.isExternal && article.sourceUrl && (!article.imageUrl || article.imageUrl.includes('unsplash.com'))) {
      scrapeArticleContent(article.sourceUrl).then(scraped => {
         // Background processing. We don't wait for UI.
         if (scraped.imageUrl) {
             console.log(`[NewsService] Async scraped image: ${scraped.imageUrl}`);
         }
      }).catch(() => {});
    }

    return {
      ...article,
      aiSummary: article.aiSummary,
      aiKeyPoints: article.aiKeyPoints || [],
    };
  }

  // To keep UI fast, we return the article and let AI happen asynchronously in other processes
  // or return the raw excerpt.
  
  // On-demand AI processing: generate AI summary for articles that don't have one
  // This covers new articles that haven't been processed by the cron job yet
  if (article.isExternal && article.sourceUrl && isAIAvailable()) {
    try {
      console.log(`[NewsService] On-demand AI processing for: ${article.title.slice(0, 60)}...`);
      
      // Scrape full content from source
      let fullContent = article.content || '';
      let scrapedImage: string | undefined;
      
      if (fullContent.length < 200) {
        const scraped = await scrapeArticleContent(article.sourceUrl);
        if (scraped.success && scraped.content) {
          fullContent = scraped.content;
        }
        if (scraped.imageUrl) {
          scrapedImage = scraped.imageUrl;
        }
      }

      // Generate AI summary using the same pipeline as the cron processor
      const aiResult = await generateAISummary(
        article.title,
        article.excerpt,
        fullContent,
        article.category,
        article.source
      );

      if (aiResult.success) {
        console.log(`[NewsService] ✅ On-demand AI summary generated for: ${slug}`);
        
        // Save to DB for future requests (fire-and-forget)
        prisma.processedNewsArticle.upsert({
          where: { id: slug },
          create: {
            id: slug,
            title: aiResult.cleanTitle || article.title,
            header: aiResult.cleanExcerpt || article.excerpt,
            originalContent: fullContent,
            aiSummary: aiResult.summary,
            aiKeyPoints: aiResult.keyPoints,
            aiSentiment: aiResult.sentiment || null,
            aiRelevance: aiResult.relevance || null,
            aiImageUrl: null,
            sourceImageUrl: scrapedImage || article.imageUrl || null,
            sourceUrl: article.sourceUrl,
            sourceName: article.source,
            sourceId: slug.replace(/-[^-]+$/, ''),
            category: article.category,
            publishedAt: article.publishedAt,
            isProcessed: true,
          },
          update: {
            aiSummary: aiResult.summary,
            aiKeyPoints: aiResult.keyPoints,
            aiSentiment: aiResult.sentiment || null,
            aiRelevance: aiResult.relevance || null,
            originalContent: fullContent,
            sourceImageUrl: scrapedImage || article.imageUrl || null,
            isProcessed: true,
          },
        }).catch(err => console.error('[NewsService] Failed to persist on-demand AI:', err));

        return {
          ...article,
          title: aiResult.cleanTitle || article.title,
          excerpt: aiResult.cleanExcerpt || article.excerpt,
          imageUrl: scrapedImage || article.imageUrl,
          aiSummary: aiResult.summary,
          aiKeyPoints: aiResult.keyPoints,
          aiSentiment: aiResult.sentiment as NewsWithAI['aiSentiment'],
          aiRelevance: aiResult.relevance,
        };
      }
    } catch (error) {
      console.error('[NewsService] On-demand AI processing failed:', error);
    }
  }
  
  return {
    ...article,
    aiSummary: article.excerpt, // Fast fallback
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
