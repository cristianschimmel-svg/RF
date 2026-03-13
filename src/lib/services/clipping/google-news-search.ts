/**
 * Google News Search for A3 Clipping
 *
 * Searches Google News RSS for specific institutional keywords,
 * processes articles through the full AI pipeline, and saves
 * new results to the database as clipping articles.
 *
 * Keywords: a3 mercados, robert olson, andrés ponte, andres ponte,
 *           diego cosentino, mercado a término, mercado a termino
 */

import { prisma } from '@/lib/db/prisma';
import { classifyForClipping, extractKeywordContext, getKeywordsFromDB, hasDistinctiveInstitucionalMatch, type ClippingCategory } from './a3-keywords';
import { validateClippingRelevance } from './relevance-validator';
import { scrapeArticleContent, generateAISummary, isAIAvailable, areTitlesSimilar } from '@/lib/services/news-processor';
import { randomUUID } from 'crypto';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface RawArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
}

export interface GoogleNewsSearchResult {
  totalFound: number;
  newArticles: number;
  duplicatesSkipped: number;
  errors: number;
  duration: number;
  queryResults: { query: string; found: number }[];
}

export interface GoogleNewsSearchOptions {
  /** Search all of 2026 (for initial load). Default: last 3 days. */
  fullHistory?: boolean;
  /** Custom date range — overrides fullHistory when provided. Format: 'YYYY-MM-DD' */
  dateFrom?: string;
  /** Custom date range end. Format: 'YYYY-MM-DD' */
  dateTo?: string;
  /** SSE progress callback */
  onProgress?: (message: string) => void;
}

// ──────────────────────────────────────────────
// Google News search queries — built dynamically from DB keywords
// ──────────────────────────────────────────────

interface ClippingQuery {
  label: string;
  query: string;
}

/**
 * Build Google News search queries from institucional + sector keywords.
 * Groups accent variants (e.g. "andrés ponte" / "andres ponte") into OR queries.
 * Single-word keywords shorter than 4 chars are skipped (too generic for Google).
 */
function buildDynamicQueries(keywords: Record<string, string[]>): ClippingQuery[] {
  // Search Google News for institucional + sector keywords (both are EXEMPT categories)
  const institucional = keywords.institucional || [];
  const sector = keywords.sector || [];
  const allKws = [...institucional, ...sector];

  // Group accent variants: normalize to base form, collect originals
  const groups = new Map<string, Set<string>>();
  for (const kw of allKws) {
    const base = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    // Skip very short single-word keywords (too generic for Google search)
    if (!base.includes(' ') && base.length < 4) continue;
    if (!groups.has(base)) groups.set(base, new Set());
    groups.get(base)!.add(kw);
  }

  const queries: ClippingQuery[] = [];
  const entries = Array.from(groups.entries());
  for (const entry of entries) {
    const arr = Array.from(entry[1]);
    const label = arr[0];
    // Build OR query with exact-match quotes
    const query: string = arr.map(v => `"${v}"`).join(' OR ');
    queries.push({ label, query });
  }

  return queries;
}

// Fallback hardcoded queries (used if DB is empty)
const FALLBACK_QUERIES: ClippingQuery[] = [
  { label: 'A3 Mercados', query: '"A3 Mercados"' },
  { label: 'Robert Olson', query: '"Robert Olson"' },
  { label: 'Andrés/Andres Ponte', query: '"Andrés Ponte" OR "Andres Ponte"' },
  { label: 'Diego Cosentino', query: '"Diego Cosentino"' },
  { label: 'Mercado a término', query: '"mercado a término" OR "mercado a termino"' },
  { label: 'rofex', query: '"rofex"' },
  { label: 'matba rofex', query: '"matba rofex"' },
  { label: 'bolsa comercio rosario', query: '"bolsa de comercio de rosario"' },
  { label: 'merval', query: '"merval"' },
  { label: 'MAE mercados', query: '"MAE" mercados argentina' },
  { label: 'derivados financieros', query: '"derivados financieros" argentina' },
];

// ──────────────────────────────────────────────
// XML / HTML parsing helpers
// ──────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractSourceTag(xml: string): { name: string; url: string } {
  const match = xml.match(/<source[^>]*url="([^"]*)"[^>]*>([^<]*)<\/source>/i);
  if (match) return { url: match[1], name: match[2].trim() };
  return { url: '', name: '' };
}

function decodeHtml(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSourceFromTitle(title: string): string {
  const lastDash = title.lastIndexOf(' - ');
  if (lastDash > 20) return title.substring(0, lastDash).trim();
  return title;
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
// Google News RSS fetcher
// ──────────────────────────────────────────────

async function fetchGoogleNewsRSS(
  query: string,
  after: string,
  before: string,
): Promise<RawArticle[]> {
  const encodedQuery = encodeURIComponent(`${query} after:${after} before:${before}`);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es-419&gl=AR&ceid=AR:es-419`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[GoogleNews] HTTP ${res.status} for query: ${query}`);
      return [];
    }

    const xml = await res.text();
    const articles: RawArticle[] = [];

    const items = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const item of items) {
      const rawTitle = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const description = extractTag(item, 'description');
      const source = extractSourceTag(item);

      if (!rawTitle || !link) continue;

      articles.push({
        title: decodeHtml(stripSourceFromTitle(rawTitle)),
        link,
        pubDate,
        description: decodeHtml(description).slice(0, 500),
        sourceName: decodeHtml(source.name) || 'Desconocido',
        sourceUrl: source.url || link,
      });
    }

    return articles;
  } catch (err) {
    console.warn(`[GoogleNews] Error fetching: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

// ──────────────────────────────────────────────
// Resolve Google News redirect → actual article URL
// ──────────────────────────────────────────────

async function resolveGoogleRedirect(googleUrl: string): Promise<string> {
  try {
    const res = await fetch(googleUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    const location = res.headers.get('location');
    if (location && !location.includes('news.google.com')) {
      return location;
    }

    // Fallback: GET with follow
    const res2 = await fetch(googleUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res2.url && !res2.url.includes('news.google.com')) {
      return res2.url;
    }
  } catch {
    // ignore
  }
  return googleUrl;
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
// Portal category/source inference
// ──────────────────────────────────────────────

function inferPortalCategory(sourceName: string, title: string): string {
  const s = sourceName.toLowerCase();
  const t = title.toLowerCase();
  if (/infocampo|bichos|valor soja|rural|agro|campo/.test(s) || /soja|maíz|trigo|cosecha|siembra|agro|campo/.test(t)) return 'Agro';
  if (/cripto|bitcoin|blockchain/.test(s) || /cripto|bitcoin|ethereum/.test(t)) return 'Cripto';
  if (/mercado|bolsa|merval|acciones|bonos|renta/.test(t)) return 'Mercados';
  if (/finanza|inversi|derivado|futuro|opciones|cobertura/.test(t)) return 'Finanzas';
  return 'Economía';
}

function inferSourceId(sourceName: string): string {
  const map: Record<string, string> = {
    'Ámbito': 'ambito', 'La Nación': 'lanacion', 'Clarín': 'clarin',
    'El Cronista': 'cronista', 'Bloomberg': 'bloomberg', 'Infocampo': 'infocampo',
    'Infobae': 'infobae', 'Rosario3': 'rosario3', 'iProfesional': 'iprofesional',
    'TN': 'tn', 'Perfil': 'perfil', 'Página 12': 'pagina12',
  };
  for (const [key, id] of Object.entries(map)) {
    if (sourceName.toLowerCase().includes(key.toLowerCase())) return `google-${id}`;
  }
  return `google-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`;
}

// ──────────────────────────────────────────────
// Compute date ranges
// ──────────────────────────────────────────────

function getDateRanges(fullHistory: boolean, dateFrom?: string, dateTo?: string): { after: string; before: string; label: string }[] {
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Custom date range: split into monthly chunks for better Google News results
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom + 'T00:00:00Z');
    const to = new Date(dateTo + 'T00:00:00Z');
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return [{ after: dateFrom, before: dateTo, label: `${dateFrom} — ${dateTo}` }];
    }

    const ranges: { after: string; before: string; label: string }[] = [];
    let current = new Date(from);
    while (current <= to) {
      const monthStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0));

      const effectiveStart = monthStart < from ? from : monthStart;
      const effectiveEnd = monthEnd > to ? to : monthEnd;

      // Google News uses exclusive after/before
      const afterDate = new Date(effectiveStart);
      afterDate.setUTCDate(afterDate.getUTCDate() - 1);
      const beforeDate = new Date(effectiveEnd);
      beforeDate.setUTCDate(beforeDate.getUTCDate() + 1);

      const monthLabel = effectiveStart.toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      ranges.push({
        after: fmt(afterDate),
        before: fmt(beforeDate),
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });

      current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
    }
    return ranges;
  }

  if (fullHistory) {
    return [
      { after: '2025-12-31', before: '2026-02-01', label: 'Enero 2026' },
      { after: '2026-01-31', before: '2026-03-01', label: 'Febrero 2026' },
      { after: '2026-02-28', before: '2026-03-13', label: 'Marzo 2026' },
    ];
  }

  // Incremental: last 3 days
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return [{ after: fmt(threeDaysAgo), before: fmt(tomorrow), label: 'Últimos 3 días' }];
}

// ──────────────────────────────────────────────
// Main: processGoogleNewsSearch
// ──────────────────────────────────────────────

export async function processGoogleNewsSearch(
  options: GoogleNewsSearchOptions = {},
): Promise<GoogleNewsSearchResult> {
  const { fullHistory = false, dateFrom, dateTo, onProgress } = options;
  const startTime = Date.now();
  const dateRanges = getDateRanges(fullHistory, dateFrom, dateTo);

  // Load dynamic keywords from DB
  const dynamicKeywords = await getKeywordsFromDB();

  const log = (msg: string) => {
    console.log(`[GoogleNews] ${msg}`);
    onProgress?.(msg);
  };

  // Build dynamic queries from institucional + sector keywords
  const clippingQueries = buildDynamicQueries(dynamicKeywords as Record<string, string[]>);
  const queries = clippingQueries.length > 0 ? clippingQueries : FALLBACK_QUERIES;

  const modeLabel = dateFrom && dateTo
    ? `rango personalizado ${dateFrom} a ${dateTo}`
    : fullHistory ? 'histórico completo' : 'incremental 3 días';
  log(`Iniciando búsqueda (${modeLabel}) con ${queries.length} queries...`);

  // ── Step 1: Fetch all queries ──────────────────

  const allRaw: RawArticle[] = [];
  const queryResults: { query: string; found: number }[] = [];

  for (const { label, query } of queries) {
    let queryTotal = 0;
    for (const range of dateRanges) {
      log(`Buscando "${label}" — ${range.label}...`);
      const articles = await fetchGoogleNewsRSS(query, range.after, range.before);
      queryTotal += articles.length;
      allRaw.push(...articles);

      // Polite delay between requests (2-3s)
      const delay = 2000 + Math.random() * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
    queryResults.push({ query: label, found: queryTotal });
    log(`"${label}": ${queryTotal} resultado(s)`);
  }

  log(`Total encontrados: ${allRaw.length}`);

  // ── Step 2: Dedup by normalized title ──────────

  const seen = new Map<string, RawArticle>();
  for (const art of allRaw) {
    const key = normalizeForDedup(art.title);
    if (key.length < 15) continue; // too short = junk
    if (!seen.has(key)) {
      seen.set(key, art);
    }
  }
  const unique = Array.from(seen.values());
  log(`Artículos únicos tras dedup: ${unique.length}`);

  // ── Step 3: Check DB for existing articles ─────

  // Load recent titles from DB for fuzzy matching (include deleted to avoid re-fetching)
  const existingArticles = await prisma.processedNewsArticle.findMany({
    select: { id: true, title: true, sourceUrl: true },
    orderBy: { publishedAt: 'desc' },
    take: 3000,
  });

  const existingUrls = new Set(existingArticles.map(a => a.sourceUrl));
  const existingTitles = existingArticles.map(a => a.title);

  const newArticles: RawArticle[] = [];
  let duplicatesSkipped = 0;

  for (const art of unique) {
    // Resolve the actual URL first (for accurate dedup)
    let resolvedUrl = art.link;
    if (art.link.includes('news.google.com')) {
      resolvedUrl = await resolveGoogleRedirect(art.link);
      await new Promise(r => setTimeout(r, 200));
    }
    art.link = resolvedUrl;

    // Check by URL
    if (existingUrls.has(resolvedUrl)) {
      duplicatesSkipped++;
      continue;
    }

    // Check by fuzzy title match
    const isDuplicate = existingTitles.some(t => areTitlesSimilar(art.title, t));
    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    newArticles.push(art);
  }

  log(`Nuevos (no duplicados): ${newArticles.length}, duplicados omitidos: ${duplicatesSkipped}`);

  if (newArticles.length === 0) {
    return {
      totalFound: allRaw.length,
      newArticles: 0,
      duplicatesSkipped,
      errors: 0,
      duration: Date.now() - startTime,
      queryResults,
    };
  }

  // ── Step 4: Process new articles through AI pipeline ─

  let inserted = 0;
  let errors = 0;
  const aiAvailable = isAIAvailable();

  for (let i = 0; i < newArticles.length; i++) {
    const art = newArticles[i];
    log(`Procesando ${i + 1}/${newArticles.length}: ${art.title.slice(0, 60)}...`);

    try {
      const id = `google-${randomUUID().slice(0, 12)}`;
      const pubDate = new Date(art.pubDate);
      if (isNaN(pubDate.getTime())) {
        errors++;
        continue;
      }

      // Scrape full content
      let fullContent = '';
      let imageUrl: string | undefined;
      try {
        const scraped = await scrapeArticleContent(art.link);
        if (scraped.success) {
          fullContent = scraped.content;
          imageUrl = scraped.imageUrl;
        }
      } catch { /* best-effort */ }

      // Scrape og:image if content scraping didn't provide one
      if (!imageUrl) {
        try {
          imageUrl = await scrapeOgImage(art.link);
        } catch { /* best-effort */ }
      }

      // AI Summary
      let summary = `<p>${art.description || art.title}</p>`;
      let keyPoints: string[] = [];
      let sentiment: string = 'neutral';
      let relevance: string | undefined;

      if (aiAvailable && fullContent) {
        try {
          const category = inferPortalCategory(art.sourceName, art.title);
          const aiResult = await generateAISummary(art.title, art.description, fullContent, category, art.sourceName);
          if (aiResult.success) {
            summary = aiResult.summary;
            keyPoints = aiResult.keyPoints;
            sentiment = aiResult.sentiment || 'neutral';
            relevance = aiResult.relevance;
          }
        } catch { /* fallback to basic summary */ }
      }

      // Classify for clipping
      const clipping = classifyForClipping(art.title, art.description, fullContent, dynamicKeywords);
      let clippingScore: number | undefined;
      let clippingReason: string | undefined;
      let clippingCategory = clipping.category;

      if (clipping.isClipping) {
        if (clipping.exempt) {
          clippingScore = 10;
          clippingReason = `Mención directa: "${clipping.matchedKeyword}"`;
        } else {
          // Candidate → AI validation
          try {
            const val = await validateClippingRelevance(
              art.title, art.description,
              clipping.matchedKeyword || '', clipping.category || 'ecosistema',
            );
            if (val.score >= 5) {
              clippingScore = val.score;
              clippingReason = val.reason;
              clippingCategory = (val.category as typeof clippingCategory) || clippingCategory;
            }
          } catch {
            // Conservative fallback
            clippingScore = 6;
            clippingReason = 'Fallback: error en validación IA';
          }
        }
      } else {
        // No full keyword match — check for distinctive institutional words (e.g. "A3", "Olson")
        const institucionalKws = dynamicKeywords.institucional || [];
        const secondaryMatch = hasDistinctiveInstitucionalMatch(
          art.title, art.description, fullContent, institucionalKws
        );
        if (secondaryMatch.found) {
          clippingScore = 6;
          clippingCategory = 'institucional';
          clippingReason = `Mención parcial: "${secondaryMatch.matchedWord}" (búsqueda Google News)`;
        } else {
          log(`  ⏭ Descartado (sin keyword distintivo): ${art.title.slice(0, 60)}...`);
          continue;
        }
      }

      const portalCategory = inferPortalCategory(art.sourceName, art.title);
      const sourceId = inferSourceId(art.sourceName);

      // Extract the paragraph where the keyword was found
      const matchedKw = clipping.matchedKeyword || (clippingReason?.match(/"(.+?)"/)?.[1]) || '';
      const clippingMatchContext = extractKeywordContext(
        fullContent || `${art.title} ${art.description}`,
        matchedKw,
      );

      await prisma.processedNewsArticle.create({
        data: {
          id,
          title: art.title,
          header: art.description || '',
          originalContent: fullContent,
          aiSummary: summary,
          aiKeyPoints: keyPoints,
          aiSentiment: sentiment,
          aiRelevance: relevance || `Artículo relevante — encontrado en Google News buscando keywords A3 Mercados.`,
          sourceImageUrl: imageUrl || null,
          sourceUrl: art.link,
          sourceName: art.sourceName,
          sourceId,
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
          clippingMatchContext,
        },
      });

      inserted++;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        duplicatesSkipped++;
      } else {
        errors++;
        console.error(`[GoogleNews] Error processing "${art.title.slice(0, 50)}":`, err?.message || err);
      }
    }

    // Brief delay between articles to avoid overwhelming services
    await new Promise(r => setTimeout(r, 500));
  }

  const duration = Date.now() - startTime;
  log(`Completado: ${inserted} insertados, ${duplicatesSkipped} duplicados, ${errors} errores (${(duration / 1000).toFixed(1)}s)`);

  return {
    totalFound: allRaw.length,
    newArticles: inserted,
    duplicatesSkipped,
    errors,
    duration,
    queryResults,
  };
}
