/**
 * A3 Mercados — Clipping Keywords & Classifier
 *
 * Classifies scraped news articles for the A3 Mercados clipping service.
 * 
 * TWO TIERS:
 *  - EXEMPT keywords: direct mentions of A3 or its core brands → auto-clipping (score 10)
 *  - CANDIDATE keywords: ecosystem/market terms → need AI validation to confirm relevance
 *
 * Categories:
 *  - institucional: direct mentions of A3, its brand or authorities
 *  - producto:      instruments traded on A3 (futures, derivatives, etc.)
 *  - sector:        legacy brands (ROFEX, Matba Rofex)
 *  - ecosistema:    regulators, key people and entities that impact A3
 *
 * Keywords can be managed dynamically from the admin UI.
 * DB overrides (ClippingKeywordConfig) take precedence over hardcoded defaults.
 */

import { prisma } from '@/lib/db/prisma';

export type ClippingCategory = 'institucional' | 'producto' | 'sector' | 'ecosistema';

export const CLIPPING_CATEGORIES: ClippingCategory[] = ['institucional', 'sector', 'producto', 'ecosistema'];

// ─── EXEMPT categories: always included, no AI validation needed ───
const EXEMPT_CATEGORIES: ClippingCategory[] = ['institucional', 'sector'];

// ─── DEFAULT keywords (hardcoded fallback) ───

const DEFAULT_INSTITUCIONAL = [
  'a3 mercados',
  'robert olson',
  'andrés ponte',
  'andres ponte',
  'diego cosentino',
  'mercado a término',
  'mercado a termino',
];

const DEFAULT_SECTOR = [
  'matba rofex',
  'matba/rofex',
  'rofex',
  'matba',
  'bolsa de comercio de rosario',
  'expoagro',
  'mercado de capitales',
  'bolsa de valores',
  'merval',
  'cámara de comercio',
  'camara de comercio',
];

const DEFAULT_PRODUCTO = [
  'mercado de futuros',
  'contratos de futuros',
  'futuros agrícolas',
  'futuros agricolas',
  'futuros de dólar',
  'futuros de dolar',
  'dólar futuro',
  'dolar futuro',
  'derivados financieros',
  'futuros financieros',
  'licitaciones',
  'futuros de soja',
  'futuros de maíz',
  'futuros de maiz',
  'futuros de trigo',
  'cobertura cambiaria',
  'cobertura de precios',
  'opciones financieras',
  'mercado de opciones',
  'commodities',
  'retenciones',
  'precio de soja',
  'precio del trigo',
  'precio del maíz',
  'precio del maiz',
  'mercado de granos',
  'mercado granario',
  'exportaciones agrícolas',
  'exportaciones agricolas',
  'agrodólar',
  'agrodolar',
  'dólar agro',
  'dolar agro',
  'lecap',
  'lecaps',
  'plazo fijo',
  'tasa de interés',
  'tasa de interes',
  'bonos en dólares',
  'bonos en dolares',
  'renta fija',
];

const DEFAULT_ECOSISTEMA = [
  'byma',
  'cnv',
  'bcra',
  'banco central',
  'adelmo gabbi',
  'claudio zuchovicki',
  'comisión nacional de valores',
  'comision nacional de valores',
  'reservas internacionales',
  'política monetaria',
  'politica monetaria',
  'tipo de cambio',
  'cepo cambiario',
  'crawling peg',
  'devaluación',
  'devaluacion',
  'inflación',
  'inflacion',
  'fmi',
  'wall street',
  'dólar blue',
  'dolar blue',
  'dólar mep',
  'dolar mep',
  'dólar ccl',
  'dolar ccl',
  'brecha cambiaria',
  'adr',
  'adrs',
  'criptomonedas',
  'bitcoin',
  'stablecoin',
  'salvador di stefano',
  'guru del dolar',
  'gurú del dólar',
  'secretaría de agricultura',
  'secretaria de agricultura',
];

/** Hardcoded default keywords by category */
export const DEFAULT_KEYWORDS_BY_CATEGORY: Record<ClippingCategory, string[]> = {
  institucional: DEFAULT_INSTITUCIONAL,
  sector: DEFAULT_SECTOR,
  producto: DEFAULT_PRODUCTO,
  ecosistema: DEFAULT_ECOSISTEMA,
};

// ─── Dynamic keywords from DB ───

/** In-memory cache for DB keywords (refreshed every 60s or on save) */
let _cachedKeywords: Record<ClippingCategory, string[]> | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

/** Load keywords from DB, falling back to hardcoded defaults */
export async function getKeywordsFromDB(): Promise<Record<ClippingCategory, string[]>> {
  const now = Date.now();
  if (_cachedKeywords && (now - _cacheTimestamp) < CACHE_TTL) {
    return _cachedKeywords;
  }

  try {
    const config = await prisma.clippingKeywordConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (config?.keywords) {
      const kws = config.keywords as Record<string, string[]>;
      // Validate structure: must have all 4 categories with string arrays
      const valid = CLIPPING_CATEGORIES.every(
        cat => Array.isArray(kws[cat]) && kws[cat].every((k: unknown) => typeof k === 'string')
      );
      if (valid) {
        _cachedKeywords = kws as Record<ClippingCategory, string[]>;
        _cacheTimestamp = now;
        return _cachedKeywords;
      }
    }
  } catch (error) {
    console.warn('[A3Keywords] Could not load keywords from DB, using defaults:', error);
  }

  _cachedKeywords = DEFAULT_KEYWORDS_BY_CATEGORY;
  _cacheTimestamp = now;
  return _cachedKeywords;
}

/** Save keywords to DB and invalidate cache */
export async function saveKeywordsToDB(keywords: Record<ClippingCategory, string[]>): Promise<void> {
  await prisma.clippingKeywordConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', keywords },
    update: { keywords },
  });
  // Invalidate cache so next classify call picks up new keywords
  _cachedKeywords = keywords;
  _cacheTimestamp = Date.now();
}

/** Force-refresh the keyword cache (call after saving from API) */
export function invalidateKeywordCache(): void {
  _cachedKeywords = null;
  _cacheTimestamp = 0;
}

// ─── Classification ───

interface CategoryRule {
  category: ClippingCategory;
  keywords: string[];
  exempt: boolean;
}

function buildCategoryRules(keywordsByCategory: Record<ClippingCategory, string[]>): CategoryRule[] {
  return CLIPPING_CATEGORIES.map(cat => ({
    category: cat,
    keywords: keywordsByCategory[cat],
    exempt: EXEMPT_CATEGORIES.includes(cat),
  }));
}

export interface ClippingClassification {
  isClipping: boolean;
  category: ClippingCategory | null;
  matchedKeyword?: string;
  /** If true, keyword matched an exempt list — skip AI validation */
  exempt: boolean;
}

/**
 * Classify a news article for the A3 clipping service.
 * Searches title + excerpt + content (case-insensitive, accent-normalized).
 *
 * Accepts optional `keywordsByCategory` for dynamic keywords (loaded from DB).
 * If not provided, uses hardcoded defaults (backward compatible).
 */
export function classifyForClipping(
  title: string,
  excerpt: string,
  content?: string,
  keywordsByCategory?: Record<ClippingCategory, string[]>,
): ClippingClassification {
  const rules = buildCategoryRules(keywordsByCategory || DEFAULT_KEYWORDS_BY_CATEGORY);

  const text = `${title} ${excerpt} ${content || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents for matching

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const normalizedKw = keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (text.includes(normalizedKw)) {
        return { isClipping: true, category: rule.category, matchedKeyword: keyword, exempt: rule.exempt };
      }
    }
  }

  return { isClipping: false, category: null, exempt: false };
}

// ─── Secondary validation: "A3" mention check ───

/**
 * Secondary validation when classifyForClipping() finds no full keyword match.
 * Only checks for "A3" — the core brand identifier. Other institucional keywords
 * like names ("robert", "diego") are too generic on their own and require a full
 * keyword match (e.g. "robert olson") via classifyForClipping().
 */
export function hasDistinctiveInstitucionalMatch(
  title: string,
  description: string,
  content: string,
  _institucionalKeywords: string[],
): { found: boolean; matchedWord?: string } {
  const normalizedText = `${title} ${description} ${content}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Only "a3" is distinctive enough as a standalone partial match
  if (/\ba3\b/.test(normalizedText)) {
    return { found: true, matchedWord: 'a3' };
  }

  return { found: false };
}

// ─── Keyword context extraction ───

/**
 * Extract the paragraph from article content where the matched keyword appears.
 * Returns the first paragraph containing the keyword, trimmed.
 */
export function extractKeywordContext(
  content: string,
  matchedKeyword: string,
): string | null {
  if (!content || !matchedKeyword) return null;

  const normalizedKw = matchedKeyword
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Split content into paragraphs (double newline, or <p> tags, or single newlines as fallback)
  let paragraphs = content
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 30);

  // If no double-newline paragraphs, try single newlines
  if (paragraphs.length === 0) {
    paragraphs = content
      .replace(/<[^>]*>/g, '')
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 30);
  }

  for (const para of paragraphs) {
    const normalizedPara = para
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (normalizedPara.includes(normalizedKw)) {
      // Limit to ~500 chars
      return para.length > 500 ? para.slice(0, 500).trimEnd() + '…' : para;
    }
  }

  return null;
}

/** All keywords flattened (from hardcoded defaults) */
export const ALL_CLIPPING_KEYWORDS = [
  ...DEFAULT_INSTITUCIONAL,
  ...DEFAULT_SECTOR,
  ...DEFAULT_PRODUCTO,
  ...DEFAULT_ECOSISTEMA,
];

/**
 * Find ALL matching keywords in article text across all categories.
 * Returns unique keywords found, grouped by category.
 */
export function findAllMatchedKeywords(
  title: string,
  excerpt: string,
  content?: string,
  keywordsByCategory?: Record<ClippingCategory, string[]>,
): { keyword: string; category: ClippingCategory }[] {
  const rules = buildCategoryRules(keywordsByCategory || DEFAULT_KEYWORDS_BY_CATEGORY);

  const text = `${title} ${excerpt} ${content || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const found: { keyword: string; category: ClippingCategory }[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const normalizedKw = keyword
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!seen.has(normalizedKw) && text.includes(normalizedKw)) {
        seen.add(normalizedKw);
        found.push({ keyword, category: rule.category });
      }
    }
  }

  return found;
}

/** Keywords by category — hardcoded defaults (for backward compat) */
export const KEYWORDS_BY_CATEGORY: Record<ClippingCategory, string[]> = DEFAULT_KEYWORDS_BY_CATEGORY;
