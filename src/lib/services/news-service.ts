/**
 * News Service
 * Unified service that combines database articles with curated financial news
 */

import { cache } from './cache';
import { prisma } from '@/lib/db/prisma';
import { getFallbackImage as getImageForCategory } from '@/lib/image-fallbacks';

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
  author?: string;
  isFromDB?: boolean;
}

// Image fallback — delegated to shared utility (getFallbackImage → getImageForCategory)
export { getImageForCategory };

// Fetch articles from database
async function fetchDBArticles(): Promise<NewsArticle[]> {
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
      take: 50,
    });

    return dbArticles.map((article: any) => {
      const categoryName = article.category?.name || 'Sin categoría';
      return {
        id: article.id,
        title: article.title,
        excerpt: article.excerpt || '',
        slug: article.slug,
        category: categoryName,
        categorySlug: article.category?.slug,
        imageUrl: article.coverImage || article.featuredImage || getImageForCategory(categoryName, article.title),
        publishedAt: article.publishedAt || article.createdAt,
        source: 'Rosario Finanzas',
        author: article.author?.name || 'Redacción',
        isFromDB: true,
      };
    });
  } catch (error) {
    console.error('Error fetching DB articles:', error);
    return [];
  }
}

// Get all news from database only — never generate fake content
export async function getAllNews(): Promise<NewsArticle[]> {
  const cacheKey = 'news:all';
  let articles = cache.get<NewsArticle[]>(cacheKey);
  
  if (!articles) {
    articles = await fetchDBArticles();
    
    // Sort by date
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    cache.set(cacheKey, articles, 60); // Cache for 1 minute
  }
  
  return articles;
}

// Get latest financial news for homepage
export async function getLatestNews(limit: number = 6): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews.slice(0, limit);
}

// Get news by category
export async function getNewsByCategory(category: string, limit: number = 20): Promise<NewsArticle[]> {
  const allNews = await getAllNews();
  return allNews
    .filter(n => n.category.toLowerCase() === category.toLowerCase() || n.categorySlug === category)
    .slice(0, limit);
}

// Get single news article by slug
export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  const allNews = await getAllNews();
  return allNews.find(n => n.slug === slug) || null;
}

// Force refresh cache
export function invalidateNewsCache(): void {
  cache.delete('news:all');
  cache.delete('news:latest');
}
