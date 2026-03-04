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

// Curated financial news topics for Argentina & Region (fallback/demo content)
const NEWS_TOPICS = [
  { title: 'El dólar blue marca una nueva jornada de volatilidad', category: 'Economía', keywords: ['dolar', 'blue', 'cotizacion'] },
  { title: 'La soja recupera terreno en Chicago ante demanda asiática', category: 'Agro', keywords: ['soja', 'chicago', 'granos'] },
  { title: 'El Merval extiende su rally alcista con récords históricos', category: 'Mercados', keywords: ['merval', 'acciones', 'bolsa'] },
  { title: 'Bitcoin supera nuevos máximos mientras el mercado cripto se fortalece', category: 'Cripto', keywords: ['bitcoin', 'crypto', 'btc'] },
  { title: 'El BCRA mantiene la tasa de política monetaria sin cambios', category: 'Economía', keywords: ['bcra', 'tasa', 'monetaria'] },
  { title: 'Trigo y maíz muestran señales mixtas en el mercado local', category: 'Agro', keywords: ['trigo', 'maiz', 'cereales'] },
  { title: 'Los bonos argentinos continúan en demanda con fuerte volumen', category: 'Mercados', keywords: ['bonos', 'argentina', 'riesgo pais'] },
  { title: 'La inflación mensual muestra desaceleración según consultoras', category: 'Economía', keywords: ['inflacion', 'precios', 'ipc'] },
  { title: 'Ethereum lidera las altcoins con ganancias semanales destacadas', category: 'Cripto', keywords: ['ethereum', 'altcoin', 'eth'] },
  { title: 'El sector energético impulsa nuevas inversiones en Argentina', category: 'Mercados', keywords: ['energia', 'ypf', 'vaca muerta'] },
];

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

// Generate curated news articles (fallback/demo)
function generateCuratedArticles(): NewsArticle[] {
  const now = new Date();
  
  return NEWS_TOPICS.map((topic, index) => {
    const hoursAgo = Math.floor(Math.random() * 48) + (index * 3);
    const publishedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    return {
      id: `curated-${index + 1}`,
      title: topic.title,
      excerpt: `Análisis detallado sobre ${topic.keywords.join(', ')} y su impacto en el mercado financiero argentino.`,
      slug: topic.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      category: topic.category,
      imageUrl: getImageForCategory(topic.category, topic.title),
      publishedAt,
      source: 'Rosario Finanzas',
      isFromDB: false,
    };
  });
}

// Get all news combining DB articles and curated content
export async function getAllNews(): Promise<NewsArticle[]> {
  const cacheKey = 'news:all';
  let articles = cache.get<NewsArticle[]>(cacheKey);
  
  if (!articles) {
    const [dbArticles, curatedArticles] = await Promise.all([
      fetchDBArticles(),
      Promise.resolve(generateCuratedArticles()),
    ]);
    
    // Combine and sort by date, DB articles take priority
    articles = [...dbArticles, ...curatedArticles]
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
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
