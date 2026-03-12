/**
 * Twitter/X Search for A3 Clipping via Nitter RSS
 *
 * Searches Twitter/X through Nitter open-source mirrors that expose
 * RSS feeds. Each keyword is searched via Nitter's search RSS endpoint,
 * and tweets linking to news articles are extracted and processed
 * through the same AI pipeline as Google News results.
 *
 * Nitter instances are tried in order; if one fails, the next is used.
 */

import { prisma } from '@/lib/db/prisma';
import { classifyForClipping, getKeywordsFromDB, hasDistinctiveInstitucionalMatch, type ClippingCategory } from './a3-keywords';
import { validateClippingRelevance } from './relevance-validator';
import { scrapeArticleContent, generateAISummary, isAIAvailable, areTitlesSimilar } from '@/lib/services/news-processor';
import { randomUUID } from 'crypto';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface RawTweet {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  author: string;
  /** External URL extracted from the tweet text, if any */
  externalUrl: string | null;
}

export interface TwitterSearchResult {
  totalFound: number;
  newArticles: number;
  duplicatesSkipped: number;
  errors: number;
  duration: number;
  queryResults: { query: string; found: number }[];
  instanceUsed: string;
}

export interface TwitterSearchOptions {
  /** SSE progress callback */
  onProgress?: (message: string) => void;
}

// ──────────────────────────────────────────────
// Nitter instances (tried in order)
// ──────────────────────────────────────────────

const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
  'https://nitter.woodland.cafe',
  'https://nitter.1d4.us',
];

// ──────────────────────────────────────────────
// Build search queries from DB keywords
// ──────────────────────────────────────────────

interface TwitterQuery {
  label: string;
  query: string;
}

/**
 * Build Twitter search queries from institucional keywords.
 * Multi-word phrases are wrapped in quotes for exact match.
 * Single-word keywords shorter than 4 chars are skipped.
 */
function buildTwitterQueries(keywords: Record<string, string[]>): TwitterQuery[] {
  const institucional = keywords.institucional || [];

  // Group accent variants (same logic as Google News)
  const groups = new Map<string, string[]>();
  for (const kw of institucional) {
    const base = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!base.includes(' ') && base.length < 4) continue;
    const existing = groups.get(base);
    if (existing) {
      if (!existing.includes(kw)) existing.push(kw);
    } else {
      groups.set(base, [kw]);
    }
  }

  const queries: TwitterQuery[] = [];
  groups.forEach((variants, _base) => {
    const label = variants[0];
    // Nitter search supports OR and quoted phrases
    const query = variants.map(v => (v.includes(' ') ? `"${v}"` : v)).join(' OR ');
    queries.push({ label, query });
  });

  return queries;
}

const FALLBACK_QUERIES: TwitterQuery[] = [
  { label: 'A3 Mercados', query: '"A3 Mercados"' },
  { label: 'Robert Olson', query: '"Robert Olson"' },
  { label: 'Andrés Ponte', query: '"Andrés Ponte" OR "Andres Ponte"' },
  { label: 'Diego Cosentino', query: '"Diego Cosentino"' },
  { label: 'Matba Rofex', query: '"Matba Rofex"' },
  { label: 'rofex', query: 'rofex' },
];

// ──────────────────────────────────────────────
// XML helpers
// ──────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Extract external URLs from tweet HTML description.
 * Nitter RSS includes linked URLs as <a> tags in the description.
 * We look for http(s) links that are NOT twitter/nitter internal.
 */
function extractExternalUrl(description: string): string | null {
  const urlMatches = description.match(/href="(https?:\/\/[^"]+)"/gi);
  if (!urlMatches) return null;

  for (const m of urlMatches) {
    const urlMatch = m.match(/href="(https?:\/\/[^"]+)"/i);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    // Skip twitter/nitter internal links
    if (/twitter\.com|nitter\.|x\.com|t\.co/i.test(url)) continue;
    return url;
  }
  return null;
}

function normalizeForDedup(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ──────────────────────────────────────────────
// Nitter RSS fetcher
// ──────────────────────────────────────────────

/**
 * Find a working Nitter instance by testing with a simple search.
 */
async function findWorkingInstance(): Promise<string | null> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const testUrl = `${instance}/search/rss?f=tweets&q=test`;
      const res = await fetch(testUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<rss') || text.includes('<channel')) {
          return instance;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Fetch tweets from Nitter search RSS for a given query.
 */
async function fetchNitterSearchRSS(
  instance: string,
  query: string,
): Promise<RawTweet[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `${instance}/search/rss?f=tweets&q=${encodedQuery}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[TwitterSearch] HTTP ${res.status} for query: ${query}`);
      return [];
    }

    const xml = await res.text();
    const tweets: RawTweet[] = [];

    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const item of items) {
      const title = decodeHtml(extractTag(item, 'title'));
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const rawDescription = extractTag(item, 'description');

      if (!title || !link) continue;

      // Extract the tweet author from the link (nitter.instance/@user/status/123)
      const authorMatch = link.match(/\/([^/]+)\/status\//);
      const author = authorMatch ? `@${authorMatch[1]}` : '';

      const externalUrl = extractExternalUrl(rawDescription);

      tweets.push({
        title: title.length > 280 ? title.slice(0, 280) + '…' : title,
        link,
        pubDate,
        description: decodeHtml(rawDescription).slice(0, 500),
        author,
        externalUrl,
      });
    }

    return tweets;
  } catch (err) {
    console.warn(`[TwitterSearch] Error fetching: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

// ──────────────────────────────────────────────
// Portal category/source inference
// ──────────────────────────────────────────────

function inferPortalCategory(title: string): string {
  const t = title.toLowerCase();
  if (/soja|maíz|trigo|cosecha|siembra|agro|campo/.test(t)) return 'Agro';
  if (/cripto|bitcoin|blockchain/.test(t)) return 'Cripto';
  if (/mercado|bolsa|merval|acciones|bonos|renta/.test(t)) return 'Mercados';
  if (/finanza|inversi|derivado|futuro|opciones|cobertura/.test(t)) return 'Finanzas';
  return 'Economía';
}

// ──────────────────────────────────────────────
// Scrape og:image from article page
// ──────────────────────────────────────────────

async function scrapeOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return undefined;

    const html = await res.text();

    const ogMatch =
      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    if (ogMatch) return ogMatch[1];

    const twMatch =
      html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*name="twitter:image"/i);
    if (twMatch) return twMatch[1];

    return undefined;
  } catch {
    return undefined;
  }
}

// ──────────────────────────────────────────────
// Main: processTwitterSearch
// ──────────────────────────────────────────────

export async function processTwitterSearch(
  options: TwitterSearchOptions = {},
): Promise<TwitterSearchResult> {
  const { onProgress } = options;
  const startTime = Date.now();

  const log = (msg: string) => {
    console.log(`[TwitterSearch] ${msg}`);
    onProgress?.(msg);
  };

  // ── Step 0: Find a working Nitter instance ─────
  log('Buscando instancia Nitter disponible...');
  const instance = await findWorkingInstance();
  if (!instance) {
    log('No se encontró ninguna instancia Nitter disponible.');
    return {
      totalFound: 0,
      newArticles: 0,
      duplicatesSkipped: 0,
      errors: 0,
      duration: Date.now() - startTime,
      queryResults: [],
      instanceUsed: 'none',
    };
  }
  log(`Usando instancia: ${instance}`);

  // Load dynamic keywords from DB
  const dynamicKeywords = await getKeywordsFromDB();

  const twitterQueries = buildTwitterQueries(dynamicKeywords as Record<string, string[]>);
  const queries = twitterQueries.length > 0 ? twitterQueries : FALLBACK_QUERIES;

  log(`Iniciando búsqueda Twitter con ${queries.length} queries...`);

  // ── Step 1: Fetch all queries ──────────────────

  const allTweets: RawTweet[] = [];
  const queryResults: { query: string; found: number }[] = [];

  for (const { label, query } of queries) {
    log(`Buscando "${label}"...`);
    const tweets = await fetchNitterSearchRSS(instance, query);
    queryResults.push({ query: label, found: tweets.length });
    allTweets.push(...tweets);
    log(`"${label}": ${tweets.length} tweet(s)`);

    // Polite delay between requests (2-3s)
    const delay = 2000 + Math.random() * 1000;
    await new Promise(r => setTimeout(r, delay));
  }

  log(`Total tweets encontrados: ${allTweets.length}`);

  // ── Step 2: Filter tweets with external links ──
  // We primarily want tweets that link to news articles (not pure text tweets)
  // But also keep tweets from key accounts even without links.

  const tweetsWithLinks = allTweets.filter(t => t.externalUrl);
  const tweetsTextOnly = allTweets.filter(t => !t.externalUrl);

  log(`Con links externos: ${tweetsWithLinks.length}, solo texto: ${tweetsTextOnly.length}`);

  // ── Step 3: Dedup ──────────────────────────────

  const seen = new Map<string, RawTweet>();
  // First: tweets with links (prioritized)
  for (const tweet of tweetsWithLinks) {
    const key = tweet.externalUrl!; // dedup by external URL
    if (!seen.has(key)) seen.set(key, tweet);
  }
  // Then: text-only tweets (dedup by normalized text)
  for (const tweet of tweetsTextOnly) {
    const key = normalizeForDedup(tweet.title);
    if (key.length < 15) continue;
    if (!seen.has(key)) seen.set(key, tweet);
  }

  const unique = Array.from(seen.values());
  log(`Tweets únicos tras dedup: ${unique.length}`);

  // ── Step 4: Check DB for existing articles ─────

  const existingArticles = await prisma.processedNewsArticle.findMany({
    where: { isDeleted: false },
    select: { id: true, title: true, sourceUrl: true },
    orderBy: { publishedAt: 'desc' },
    take: 2000,
  });

  const existingUrls = new Set(existingArticles.map(a => a.sourceUrl));
  const existingTitles = existingArticles.map(a => a.title);

  const newTweets: RawTweet[] = [];
  let duplicatesSkipped = 0;

  for (const tweet of unique) {
    const urlToCheck = tweet.externalUrl || tweet.link;

    if (existingUrls.has(urlToCheck)) {
      duplicatesSkipped++;
      continue;
    }

    // Fuzzy title match against existing DB articles
    const isDuplicate = existingTitles.some(t => areTitlesSimilar(tweet.title, t));
    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    newTweets.push(tweet);
  }

  log(`Nuevos: ${newTweets.length}, duplicados omitidos: ${duplicatesSkipped}`);

  if (newTweets.length === 0) {
    return {
      totalFound: allTweets.length,
      newArticles: 0,
      duplicatesSkipped,
      errors: 0,
      duration: Date.now() - startTime,
      queryResults,
      instanceUsed: instance,
    };
  }

  // ── Step 5: Process new tweets through AI pipeline ─

  let inserted = 0;
  let errors = 0;
  const aiAvailable = isAIAvailable();

  for (let i = 0; i < newTweets.length; i++) {
    const tweet = newTweets[i];
    log(`Procesando ${i + 1}/${newTweets.length}: ${tweet.title.slice(0, 60)}...`);

    try {
      const id = `twitter-${randomUUID().slice(0, 12)}`;
      const pubDate = new Date(tweet.pubDate);
      if (isNaN(pubDate.getTime())) {
        errors++;
        continue;
      }

      const articleUrl = tweet.externalUrl || tweet.link;
      const sourceName = tweet.author ? `Twitter ${tweet.author}` : 'Twitter/X';

      // Scrape full content if there's an external URL
      let fullContent = tweet.description;
      let imageUrl: string | undefined;

      if (tweet.externalUrl) {
        try {
          const scraped = await scrapeArticleContent(tweet.externalUrl);
          if (scraped.success) {
            fullContent = scraped.content;
            imageUrl = scraped.imageUrl;
          }
        } catch { /* best-effort */ }

        if (!imageUrl) {
          try {
            imageUrl = await scrapeOgImage(tweet.externalUrl);
          } catch { /* best-effort */ }
        }
      }

      // AI Summary
      let summary = `<p>${tweet.description || tweet.title}</p>`;
      let keyPoints: string[] = [];
      let sentiment: string = 'neutral';
      let relevance: string | undefined;

      if (aiAvailable && fullContent.length > 50) {
        try {
          const category = inferPortalCategory(tweet.title);
          const aiResult = await generateAISummary(
            tweet.title, tweet.description, fullContent, category, sourceName,
          );
          if (aiResult.success) {
            summary = aiResult.summary;
            keyPoints = aiResult.keyPoints;
            sentiment = aiResult.sentiment || 'neutral';
            relevance = aiResult.relevance;
          }
        } catch { /* fallback to basic summary */ }
      }

      // Classify for clipping
      const clipping = classifyForClipping(tweet.title, tweet.description, fullContent, dynamicKeywords);
      let clippingScore: number | undefined;
      let clippingReason: string | undefined;
      let clippingCategory = clipping.category;

      if (clipping.isClipping) {
        if (clipping.exempt) {
          clippingScore = 10;
          clippingReason = `Mención directa en Twitter: "${clipping.matchedKeyword}"`;
        } else {
          try {
            const val = await validateClippingRelevance(
              tweet.title, tweet.description,
              clipping.matchedKeyword || '', clipping.category || 'ecosistema',
            );
            if (val.score >= 5) {
              clippingScore = val.score;
              clippingReason = val.reason;
              clippingCategory = (val.category as typeof clippingCategory) || clippingCategory;
            }
          } catch {
            clippingScore = 6;
            clippingReason = 'Fallback: error en validación IA';
          }
        }
      } else {
        // No full keyword match — check for distinctive institutional words (e.g. "A3", "Olson")
        const institucionalKws = dynamicKeywords.institucional || [];
        const secondaryMatch = hasDistinctiveInstitucionalMatch(
          tweet.title, tweet.description, fullContent, institucionalKws
        );
        if (secondaryMatch.found) {
          clippingScore = 6;
          clippingCategory = 'institucional';
          clippingReason = `Mención parcial: "${secondaryMatch.matchedWord}" (búsqueda Twitter/X)`;
        } else {
          log(`  ⏭ Descartado (sin keyword distintivo): ${tweet.title.slice(0, 60)}...`);
          continue;
        }
      }

      const portalCategory = inferPortalCategory(tweet.title);

      await prisma.processedNewsArticle.create({
        data: {
          id,
          title: tweet.title,
          header: tweet.description || '',
          originalContent: fullContent,
          aiSummary: summary,
          aiKeyPoints: keyPoints,
          aiSentiment: sentiment,
          aiRelevance: relevance || `Tweet relevante — encontrado en Twitter/X buscando keywords A3 Mercados.`,
          sourceImageUrl: imageUrl || null,
          sourceUrl: articleUrl,
          sourceName,
          sourceId: 'twitter-x',
          category: portalCategory,
          priority: clippingCategory === 'institucional' ? 15 : clippingCategory === 'producto' ? 12 : 8,
          publishedAt: pubDate,
          processedAt: new Date(),
          isProcessed: true,
          isDeleted: false,
          isClipping: true,
          clippingCategory,
          clippingScore,
          clippingReason,
        },
      });

      inserted++;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        duplicatesSkipped++;
      } else {
        errors++;
        console.error(`[TwitterSearch] Error processing "${tweet.title.slice(0, 50)}":`, err?.message || err);
      }
    }

    // Brief delay between articles
    await new Promise(r => setTimeout(r, 500));
  }

  const duration = Date.now() - startTime;
  log(`Completado: ${inserted} insertados, ${duplicatesSkipped} duplicados, ${errors} errores (${(duration / 1000).toFixed(1)}s)`);

  return {
    totalFound: allTweets.length,
    newArticles: inserted,
    duplicatesSkipped,
    errors,
    duration,
    queryResults,
    instanceUsed: instance,
  };
}
