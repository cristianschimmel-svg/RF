/**
 * News Store (Database-backed)
 * Handles persistence of processed news using Prisma/PostgreSQL
 * Drop-in replacement for the old JSON file store — same API surface.
 * Works on Vercel serverless (no filesystem dependency).
 */

import { prisma } from '@/lib/db/prisma';
import type { ProcessedNews, NewsStore } from './types';

const STORE_VERSION = 1;

// ─── helpers ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function articleToProcessed(row: any): ProcessedNews {
  return {
    id: row.id,
    title: row.title,
    header: row.header,
    originalContent: row.originalContent,
    aiSummary: row.aiSummary,
    aiKeyPoints: row.aiKeyPoints,
    aiSentiment: row.aiSentiment ?? undefined,
    aiRelevance: row.aiRelevance ?? undefined,
    aiImageUrl: row.aiImageUrl ?? undefined,
    sourceImageUrl: row.sourceImageUrl ?? undefined,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    sourceId: row.sourceId,
    category: row.category,
    priority: row.priority,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
    processedAt: row.processedAt instanceof Date ? row.processedAt.toISOString() : row.processedAt,
    isProcessed: row.isProcessed,
    processingError: row.processingError ?? undefined,
    isClipping: row.isClipping ?? false,
    clippingCategory: row.clippingCategory ?? undefined,
  };
}

/**
 * Ensure the singleton ProcessedNewsStore row exists
 */
async function ensureStoreRow(): Promise<void> {
  await prisma.processedNewsStore.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', version: STORE_VERSION, lastUpdated: new Date() },
  });
}

// ─── public API (same surface as old json-store) ──────────────

/**
 * Read the news store from DB
 */
export async function readStore(): Promise<NewsStore> {
  try {
    await ensureStoreRow();
    const meta = await prisma.processedNewsStore.findUnique({ where: { id: 'singleton' } });
    const rows = await prisma.processedNewsArticle.findMany({
      where: { isDeleted: false },
      orderBy: { publishedAt: 'desc' },
    });

    const articles = rows.map(articleToProcessed);
    console.log(`[DBStore] Loaded ${articles.length} articles from database`);

    return {
      version: meta?.version ?? STORE_VERSION,
      lastUpdated: meta?.lastUpdated.toISOString() ?? new Date().toISOString(),
      articles,
    };
  } catch (error) {
    console.error('[DBStore] Error reading store:', error);
    return { version: STORE_VERSION, lastUpdated: new Date().toISOString(), articles: [] };
  }
}

/**
 * Write the news store (update the lastUpdated timestamp)
 */
export async function writeStore(store: NewsStore): Promise<boolean> {
  try {
    await prisma.processedNewsStore.upsert({
      where: { id: 'singleton' },
      update: { lastUpdated: new Date(), version: store.version },
      create: { id: 'singleton', version: store.version, lastUpdated: new Date() },
    });
    console.log(`[DBStore] Updated store timestamp`);
    return true;
  } catch (error) {
    console.error('[DBStore] Error writing store:', error);
    return false;
  }
}

// ─── title dedup helpers ──────────────────────────────────────

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function areTitlesSimilar(titleA: string, titleB: string): boolean {
  const stopWords = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'en', 'y', 'a', 'un', 'una', 'que', 'por', 'para', 'con', 'se', 'su', 'al', 'es', 'lo', 'como', 'más', 'mas', 'pero', 'o', 'no', 'hoy', 'este', 'esta']);

  const getWords = (t: string) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  const wordsA = getWords(titleA);
  const wordsB = getWords(titleB);
  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const common = wordsA.filter(w => setB.has(w)).length;
  const shorter = Math.min(wordsA.length, wordsB.length);
  return (common / shorter) >= 0.6; // Stricter deduplication threshold (from 0.7 to 0.6)
}

export function getArticleTopic(title: string): string | null {
  const normTitle = normalizeTitle(title);
  if (normTitle.includes('dolar blue') || normTitle.includes('dolar paralelo')) return 'dolar_blue';
  if (normTitle.includes('dolar mep') || normTitle.includes('contado con liqui') || normTitle.includes('ccl')) return 'dolar_financiero';
  if (normTitle.includes('riesgo pais')) return 'riesgo_pais';
  if (normTitle.includes('inflacion') || normTitle.includes('ipc')) return 'inflacion';
  if (normTitle.includes('merval') || normTitle.includes('s&p merval') || normTitle.includes('bolsa portena')) return 'merval';
  if (normTitle.includes('tasa de interes') || normTitle.includes('plazo fijo') || normTitle.includes('leliq')) return 'tasas';
  if (normTitle.includes('soja') || normTitle.includes('maiz') || normTitle.includes('trigo')) return 'granos';
  if (normTitle.includes('reserva') && normTitle.includes('bcra')) return 'reservas';
  return null;
}

// ─── upsert / query ──────────────────────────────────────────

/**
 * Add or update articles in the store.
 * Deduplicates by ID and by fuzzy title similarity.
 */
export async function upsertArticles(
  newArticles: ProcessedNews[],
  maxArticles: number = 30
): Promise<NewsStore> {
  // 1. Fetch existing articles from DB (exclude soft-deleted)
  const existingRows = await prisma.processedNewsArticle.findMany({
    where: { isDeleted: false },
    orderBy: { publishedAt: 'desc' },
  });
  const existing = existingRows.map(articleToProcessed);

  // 2. Merge by ID (new overrides old)
  const articleMap = new Map<string, ProcessedNews>();
  for (const a of existing) articleMap.set(a.id, a);
  for (const a of newArticles) articleMap.set(a.id, a);

  // 3. Dedup by exact normalised title
  const allArticles = Array.from(articleMap.values());
  allArticles.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const titleMap = new Map<string, ProcessedNews>();
  for (const article of allArticles) {
    const norm = normalizeTitle(article.title);
    if (!titleMap.has(norm)) titleMap.set(norm, article);
  }

  // 4. Fuzzy similarity & Topic dedup
  const uniqueArticles: ProcessedNews[] = [];
  const topicMap = new Map<string, ProcessedNews>();

  // Time window for topic deduplication: 12 hours (only keep 1 article per topic within 12h)
  const TOPIC_TIME_WINDOW_MS = 12 * 60 * 60 * 1000;

  for (const article of Array.from(titleMap.values())) {
    // 4.1 Fuzzy similarity check
    const isDup = uniqueArticles.some(ex => areTitlesSimilar(ex.title, article.title));
    if (isDup) {
      console.log(`[DBStore] Fuzzy-dedup removed: "${article.title.slice(0, 50)}..."`);
      continue;
    }

    // 4.2 Topic temporal deduplication
    const topic = getArticleTopic(article.title);
    if (topic) {
      const existingTopicArticle = topicMap.get(topic);
      if (existingTopicArticle) {
        const timeDiff = Math.abs(new Date(existingTopicArticle.publishedAt).getTime() - new Date(article.publishedAt).getTime());
        if (timeDiff < TOPIC_TIME_WINDOW_MS) {
          // If we found a newer article or higher priority for the same topic within the window, we should decide which to keep.
          // Since allArticles are sorted by publishedAt desc, existingTopicArticle is NEWER.
          // So we skip adding `article` which is older.
          console.log(`[DBStore] Topic-dedup (${topic}) removed older: "${article.title.slice(0, 50)}..."`);
          continue;
        }
      } else {
        // Find if this topic exists in already unique articles to catch it
        const existingInUnique = uniqueArticles.find(ex => {
           let exTopic = getArticleTopic(ex.title);
           if (exTopic === topic) {
              const timeDiff = Math.abs(new Date(ex.publishedAt).getTime() - new Date(article.publishedAt).getTime());
              return timeDiff < TOPIC_TIME_WINDOW_MS;
           }
           return false;
        });
        
        if (existingInUnique) {
          console.log(`[DBStore] Topic-dedup (${topic}) removed older: "${article.title.slice(0, 50)}..."`);
          continue;
        }
      }
      topicMap.set(topic, article);
    }

    uniqueArticles.push(article);
  }

  // 5. Sort and trim
  uniqueArticles.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  
  const validArticles = uniqueArticles.filter(a => !a.processingError?.startsWith('AI Rejected'));
  const rejectedArticles = uniqueArticles.filter(a => a.processingError?.startsWith('AI Rejected'));
  
  const finalValid = validArticles; // Keep all within retention period
  
  // Keep rejected articles that are less than 3 days old so we don't retry them
  const threeDaysAgo = Date.now() - 72 * 60 * 60 * 1000;
  const finalRejected = rejectedArticles.filter(a => new Date(a.publishedAt).getTime() > threeDaysAgo);
  
  const final = [...finalValid, ...finalRejected];

  const dupsRemoved = allArticles.length - final.length;
  if (dupsRemoved > 0) {
    console.log(`[DBStore] Removed ${dupsRemoved} duplicate/excess articles`);
  }

  // 6. Write to DB in a transaction: clear + insert + update meta
  const finalIds = new Set(final.map(a => a.id));

  await prisma.$transaction(async (tx) => {
    // Let purgeOldArticles handle retention instead of deleting on every upsert

    // Upsert each article
    for (const a of final) {
      await (tx.processedNewsArticle.upsert as any)({
        where: { id: a.id },
        update: {
          title: a.title,
          header: a.header,
          originalContent: a.originalContent,
          aiSummary: a.aiSummary,
          aiKeyPoints: a.aiKeyPoints,
          aiSentiment: a.aiSentiment ?? null,
          aiRelevance: a.aiRelevance ?? null,
          aiImageUrl: a.aiImageUrl ?? null,
          sourceImageUrl: a.sourceImageUrl ?? null,
          sourceUrl: a.sourceUrl,
          sourceName: a.sourceName,
          sourceId: a.sourceId,
          category: a.category,
          priority: a.priority,
          publishedAt: new Date(a.publishedAt),
          processedAt: new Date(a.processedAt),
          isProcessed: a.isProcessed,
          processingError: a.processingError ?? null,
          isClipping: a.isClipping ?? false,
          clippingCategory: a.clippingCategory ?? null,
        },
        create: {
          id: a.id,
          title: a.title,
          header: a.header,
          originalContent: a.originalContent,
          aiSummary: a.aiSummary,
          aiKeyPoints: a.aiKeyPoints,
          aiSentiment: a.aiSentiment ?? null,
          aiRelevance: a.aiRelevance ?? null,
          aiImageUrl: a.aiImageUrl ?? null,
          sourceImageUrl: a.sourceImageUrl ?? null,
          sourceUrl: a.sourceUrl,
          sourceName: a.sourceName,
          sourceId: a.sourceId,
          category: a.category,
          priority: a.priority,
          publishedAt: new Date(a.publishedAt),
          processedAt: new Date(a.processedAt),
          isProcessed: a.isProcessed,
          processingError: a.processingError ?? null,
          isClipping: a.isClipping ?? false,
          clippingCategory: a.clippingCategory ?? null,
        },
      });
    }

    // Update store metadata
    await tx.processedNewsStore.upsert({
      where: { id: 'singleton' },
      update: { lastUpdated: new Date() },
      create: { id: 'singleton', version: STORE_VERSION, lastUpdated: new Date() },
    });
  });

  console.log(`[DBStore] Saved ${final.length} articles to database`);

  return {
    version: STORE_VERSION,
    lastUpdated: new Date().toISOString(),
    articles: final,
  };
}

export async function getProcessedArticles(): Promise<ProcessedNews[]> {
  const rows = await prisma.processedNewsArticle.findMany({
    where: {
      // Exclude soft-deleted articles
      isDeleted: false,
      // Do not return articles that were explicitly rejected by AI
      // Must use OR with null check to avoid SQL NULL comparison trap
      OR: [
        { processingError: null },
        { processingError: { not: { startsWith: 'AI Rejected' } } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
  });
  return rows.map(articleToProcessed);
}

export async function getArticleById(id: string): Promise<ProcessedNews | null> {
  const row = await prisma.processedNewsArticle.findUnique({ where: { id } });
  return row ? articleToProcessed(row) : null;
}

export async function getArticlesByCategory(category: string): Promise<ProcessedNews[]> {
  const rows = await prisma.processedNewsArticle.findMany({
    where: { 
      category: { equals: category, mode: 'insensitive' },
      isDeleted: false,
      OR: [
        { processingError: null },
        { processingError: { not: { startsWith: 'AI Rejected' } } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
  });
  return rows.map(articleToProcessed);
}

export async function isArticleProcessed(id: string): Promise<boolean> {
  // Check if article exists in DB (both successfully processed AND AI-rejected)
  const row = await prisma.processedNewsArticle.findUnique({
    where: { id },
    select: { id: true },
  });
  return row !== null;
}

export async function getStoreInfo(): Promise<{
  articleCount: number;
  lastUpdated: string;
  version: number;
  isStale: boolean;
  staleMinutes: number;
}> {
  const store = await readStore();
  const { isStale, minutesOld } = checkStaleness(store);
  return {
    articleCount: store.articles.length,
    lastUpdated: store.lastUpdated,
    version: store.version,
    isStale,
    staleMinutes: minutesOld,
  };
}

const MAX_STALE_MINUTES = 30;

export function checkStaleness(store: NewsStore): { isStale: boolean; minutesOld: number } {
  const lastUpdated = new Date(store.lastUpdated).getTime();
  const now = Date.now();
  const minutesOld = Math.floor((now - lastUpdated) / (1000 * 60));
  return { isStale: minutesOld >= MAX_STALE_MINUTES, minutesOld };
}

export async function isStoreStale(): Promise<{ stale: boolean; minutesOld: number; lastUpdated: string }> {
  const store = await readStore();
  const { isStale, minutesOld } = checkStaleness(store);
  return { stale: isStale, minutesOld, lastUpdated: store.lastUpdated };
}

export async function purgeOldArticles(maxAgeHours: number = 72): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  // Clipping articles have a much longer retention (30 days)
  const clippingCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Purge non-clipping articles older than maxAgeHours
  const portalResult = await prisma.processedNewsArticle.deleteMany({
    where: { publishedAt: { lt: cutoff }, isClipping: false },
  });
  // Purge clipping articles older than 30 days
  const clippingResult = await prisma.processedNewsArticle.deleteMany({
    where: { publishedAt: { lt: clippingCutoff }, isClipping: true },
  });

  const total = portalResult.count + clippingResult.count;
  if (total > 0) {
    console.log(`[DBStore] Purged ${portalResult.count} portal articles (>${maxAgeHours}h) + ${clippingResult.count} clipping articles (>30d)`);
  }
  return total;
}

export async function getClippingArticles(category?: string): Promise<ProcessedNews[]> {
  const where: any = {
    isClipping: true,
    isDeleted: false,
    isProcessed: true,
    OR: [
      { processingError: null },
      { processingError: { not: { startsWith: 'AI Rejected' } } },
    ],
  };
  if (category) {
    where.clippingCategory = { equals: category, mode: 'insensitive' };
  }
  const rows = await prisma.processedNewsArticle.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
  });
  return rows.map(articleToProcessed);
}

export async function clearStore(): Promise<void> {
  await prisma.processedNewsArticle.deleteMany();
  await prisma.processedNewsStore.upsert({
    where: { id: 'singleton' },
    update: { lastUpdated: new Date() },
    create: { id: 'singleton', version: STORE_VERSION, lastUpdated: new Date() },
  });
  console.log('[DBStore] Store cleared');
}

