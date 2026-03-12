/**
 * A3 Clipping — Historical News Scraper (2026)
 *
 * Searches Google News RSS for keywords relevant to A3 Mercados,
 * classifies articles using the A3 keyword classifier,
 * and stores them in the database.
 *
 * Usage: npx tsx scripts/scrape-clipping-2026.ts
 */

import 'dotenv/config';
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

interface ClassifiedArticle extends RawArticle {
  isClipping: boolean;
  clippingCategory: string | null;
  matchedKeyword?: string;
}

// ──────────────────────────────────────────────
// Keyword search groups for Google News
// ──────────────────────────────────────────────

const SEARCH_GROUPS = [
  // INSTITUCIONAL — direct A3 mentions (highest priority)
  {
    label: 'Institucional - A3 Mercados',
    query: '"A3 Mercados"',
    category: 'institucional',
  },
  {
    label: 'Institucional - Robert Olson',
    query: '"Robert Olson" mercados',
    category: 'institucional',
  },
  {
    label: 'Institucional - Andrés Ponte',
    query: '"Andrés Ponte" mercados OR finanzas',
    category: 'institucional',
  },
  {
    label: 'Institucional - ROFEX',
    query: 'ROFEX futuros OR mercado OR dólar',
    category: 'institucional',
  },
  {
    label: 'Institucional - Matba Rofex',
    query: '"Matba Rofex"',
    category: 'institucional',
  },

  // PRODUCTO — instruments & futures
  {
    label: 'Producto - Mercado de futuros',
    query: '"mercado de futuros" Argentina',
    category: 'producto',
  },
  {
    label: 'Producto - Futuros agrícolas',
    query: '"futuros agrícolas" OR "futuros de soja" OR "futuros de maíz" OR "futuros de trigo"',
    category: 'producto',
  },
  {
    label: 'Producto - Dólar futuro',
    query: '"dólar futuro" OR "futuros de dólar" OR "futuros dolar"',
    category: 'producto',
  },
  {
    label: 'Producto - Derivados financieros',
    query: '"derivados financieros" Argentina',
    category: 'producto',
  },
  {
    label: 'Producto - Contratos futuros',
    query: '"contratos de futuros" Argentina',
    category: 'producto',
  },
  {
    label: 'Producto - Licitaciones',
    query: 'licitaciones "mercado de capitales" OR BCRA OR Hacienda Argentina',
    category: 'producto',
  },
  {
    label: 'Producto - Cobertura',
    query: '"cobertura cambiaria" OR "cobertura de precios" Argentina',
    category: 'producto',
  },

  // SECTOR — market infrastructure
  {
    label: 'Sector - BYMA',
    query: 'BYMA "Bolsas y Mercados Argentinos" OR acciones OR merval',
    category: 'sector',
  },
  {
    label: 'Sector - CNV',
    query: 'CNV "Comisión Nacional de Valores" Argentina',
    category: 'sector',
  },
  {
    label: 'Sector - Bolsa de Comercio Rosario',
    query: '"Bolsa de Comercio de Rosario"',
    category: 'sector',
  },
  {
    label: 'Sector - Mercado de capitales',
    query: '"mercado de capitales" Argentina regulación OR reforma',
    category: 'sector',
  },

  // ECOSISTEMA — regulators, key people, macro
  {
    label: 'Ecosistema - BCRA',
    query: 'BCRA "Banco Central" Argentina tasas OR reservas OR "política monetaria"',
    category: 'ecosistema',
  },
  {
    label: 'Ecosistema - Adelmo Gabbi',
    query: '"Adelmo Gabbi"',
    category: 'ecosistema',
  },
  {
    label: 'Ecosistema - Claudio Zuchovicki',
    query: '"Claudio Zuchovicki"',
    category: 'ecosistema',
  },
  {
    label: 'Ecosistema - Salvador Di Stefano',
    query: '"Salvador Di Stefano"',
    category: 'ecosistema',
  },
  {
    label: 'Ecosistema - Secretaría de Agricultura',
    query: '"Secretaría de Agricultura" Argentina',
    category: 'ecosistema',
  },
  {
    label: 'Ecosistema - Dólar & brecha',
    query: '"dólar blue" OR "dólar mep" OR "brecha cambiaria" Argentina 2026',
    category: 'ecosistema',
  },
];

// ──────────────────────────────────────────────
// Date ranges to search (monthly slices for better coverage)
// ──────────────────────────────────────────────

const DATE_RANGES = [
  { after: '2025-12-31', before: '2026-02-01', label: 'Enero 2026' },
  { after: '2026-01-31', before: '2026-03-01', label: 'Febrero 2026' },
  { after: '2026-02-28', before: '2026-03-11', label: 'Marzo 2026' },
];

// ──────────────────────────────────────────────
// RSS Parsing helpers
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
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .trim();
}

function stripSourceFromTitle(title: string): string {
  // Google News appends " - Source Name" to titles
  const lastDash = title.lastIndexOf(' - ');
  if (lastDash > 20) return title.substring(0, lastDash).trim();
  return title;
}

// ──────────────────────────────────────────────
// Google News RSS fetcher
// ──────────────────────────────────────────────

async function fetchGoogleNewsRSS(
  query: string,
  after: string,
  before: string
): Promise<RawArticle[]> {
  const encodedQuery = encodeURIComponent(`${query} after:${after} before:${before}`);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=es-419&gl=AR&ceid=AR:es-419`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`  ⚠ HTTP ${res.status} for query: ${query}`);
      return [];
    }

    const xml = await res.text();
    const articles: RawArticle[] = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.match(itemRegex) || [];

    for (const item of items) {
      const rawTitle = extractTag(item, 'title');
      const link = extractTag(item, 'link');
      const pubDate = extractTag(item, 'pubDate');
      const description = extractTag(item, 'description');
      const source = extractSourceTag(item);

      if (!rawTitle || !link) continue;

      const title = decodeHtml(stripSourceFromTitle(rawTitle));
      const cleanDesc = decodeHtml(description);

      articles.push({
        title,
        link,
        pubDate,
        description: cleanDesc.slice(0, 500),
        sourceName: source.name || 'Desconocido',
        sourceUrl: source.url || link,
      });
    }

    return articles;
  } catch (err: any) {
    console.warn(`  ⚠ Error fetching: ${err.message}`);
    return [];
  }
}

// ──────────────────────────────────────────────
// Follow Google redirect to get actual article URL
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

    // Fallback: try GET with follow
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

    // Try og:image
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    if (ogMatch) return ogMatch[1];

    // Try twitter:image
    const twMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"/i)
      || html.match(/<meta[^>]*content="([^"]+)"[^>]*name="twitter:image"/i);
    if (twMatch) return twMatch[1];

    return undefined;
  } catch {
    return undefined;
  }
}

// ──────────────────────────────────────────────
// Deduplication helpers
// ──────────────────────────────────────────────

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
// Determine source category for the portal
// ──────────────────────────────────────────────

function inferPortalCategory(sourceName: string, title: string): string {
  const s = sourceName.toLowerCase();
  const t = title.toLowerCase();

  if (/infocampo|bichos|valor soja|rural|agro|campo/.test(s) ||
      /soja|maíz|trigo|cosecha|siembra|agro|campo|girasol/.test(t)) {
    return 'Agro';
  }
  if (/cripto|bitcoin|blockchain/.test(s) || /cripto|bitcoin|ethereum/.test(t)) {
    return 'Cripto';
  }
  if (/mercado|bolsa|merval|acciones|bonos|renta/.test(t)) {
    return 'Mercados';
  }
  if (/finanza|inversi|derivado|futuro|opciones|cobertura/.test(t)) {
    return 'Finanzas';
  }
  return 'Economía';
}

function inferSourceId(sourceName: string): string {
  const map: Record<string, string> = {
    'Ámbito': 'ambito',
    'Ámbito Financiero': 'ambito-finanzas',
    'La Nación': 'lanacion-economia',
    'Clarín': 'clarin-economia',
    'El Cronista': 'cronista-finanzas',
    'Bloomberg Línea': 'bloomberg-mercados',
    'Infocampo': 'infocampo',
    'Bichos de Campo': 'bichosdecampo',
    'Valor Soja': 'valorsoja',
    'CriptoNoticias': 'criptonoticias',
    'Rosario3': 'rosario3',
    'iProfesional': 'iprofesional',
    'Infobae': 'infobae',
    'TN': 'tn',
    'Perfil': 'perfil',
    'Página 12': 'pagina12',
    'BAE Negocios': 'bae-negocios',
  };

  for (const [key, id] of Object.entries(map)) {
    if (sourceName.toLowerCase().includes(key.toLowerCase())) return id;
  }
  return sourceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────

async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('📰 A3 Clipping — Historical News Scraper (2026)');
  console.log('════════════════════════════════════════════════');
  console.log(`Started: ${new Date().toLocaleString('es-AR')}`);
  console.log('');

  // Dynamic imports for project modules
  const { classifyForClipping } = await import('../src/lib/services/clipping/a3-keywords');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Test DB connection
    const existingCount = await prisma.processedNewsArticle.count({
      where: { isClipping: true },
    });
    console.log(`📊 Existing clipping articles in DB: ${existingCount}`);
    console.log('');

    // Collect all raw articles
    const allRaw: RawArticle[] = [];
    let searchCount = 0;
    const totalSearches = SEARCH_GROUPS.length * DATE_RANGES.length;

    for (const group of SEARCH_GROUPS) {
      for (const range of DATE_RANGES) {
        searchCount++;
        const pct = Math.round((searchCount / totalSearches) * 100);
        process.stdout.write(`\r🔍 [${pct}%] ${group.label} — ${range.label}...                    `);

        const articles = await fetchGoogleNewsRSS(group.query, range.after, range.before);
        if (articles.length > 0) {
          allRaw.push(...articles);
          process.stdout.write(` → ${articles.length} artículos`);
        }

        // Polite delay between requests (1.5-3s random)
        const delay = 1500 + Math.random() * 1500;
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.log(`\n\n📥 Total artículos raw: ${allRaw.length}`);

    // Dedup by normalized title
    const seen = new Map<string, RawArticle>();
    for (const art of allRaw) {
      const key = normalizeForDedup(art.title);
      if (key.length < 15) continue; // too short = junk
      if (!seen.has(key)) {
        seen.set(key, art);
      }
    }
    const unique = Array.from(seen.values());
    console.log(`🧹 After dedup: ${unique.length} artículos únicos`);

    // Classify each article
    const classified: ClassifiedArticle[] = unique.map(art => {
      const result = classifyForClipping(art.title, art.description);
      return { ...art, ...result };
    });

    const clippingArticles = classified.filter(a => a.isClipping);
    const nonClipping = classified.filter(a => !a.isClipping);

    console.log(`\n📋 Clasificación:`);
    console.log(`   ✅ Clipping:     ${clippingArticles.length}`);
    console.log(`   ❌ No relevante: ${nonClipping.length}`);

    // Breakdown by category
    const byCat = { institucional: 0, producto: 0, sector: 0, ecosistema: 0 };
    for (const a of clippingArticles) {
      if (a.clippingCategory && a.clippingCategory in byCat) {
        byCat[a.clippingCategory as keyof typeof byCat]++;
      }
    }
    console.log(`\n   📊 Por categoría:`);
    console.log(`      🏛  Institucional: ${byCat.institucional}`);
    console.log(`      📦 Producto:       ${byCat.producto}`);
    console.log(`      🏢 Sector:         ${byCat.sector}`);
    console.log(`      🌐 Ecosistema:     ${byCat.ecosistema}`);

    // Resolve actual URLs and scrape images for clipping articles
    console.log(`\n🔗 Resolviendo URLs reales y extrayendo imágenes...`);
    let resolved = 0;

    for (const art of clippingArticles) {
      resolved++;
      if (resolved % 10 === 0 || resolved === clippingArticles.length) {
        process.stdout.write(`\r   Procesando ${resolved}/${clippingArticles.length}...          `);
      }

      // Resolve Google redirect to actual URL
      if (art.link.includes('news.google.com')) {
        art.link = await resolveGoogleRedirect(art.link);
        await new Promise(r => setTimeout(r, 300));
      }

      // Try to get og:image (with delay to be polite)
      if (!art.link.includes('news.google.com')) {
        const img = await scrapeOgImage(art.link);
        if (img) (art as any).imageUrl = img;
        await new Promise(r => setTimeout(r, 200));
      }
    }
    console.log('\n');

    // Store in database
    console.log('💾 Guardando artículos en la base de datos...');
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const art of clippingArticles) {
      try {
        const id = `clipping-2026-${randomUUID().slice(0, 12)}`;
        const pubDate = new Date(art.pubDate);

        // Validate date
        if (isNaN(pubDate.getTime())) {
          skipped++;
          continue;
        }

        // Check if article with same URL already exists
        const existing = await prisma.processedNewsArticle.findFirst({
          where: {
            OR: [
              { sourceUrl: art.link },
              { title: art.title },
            ],
          },
        });

        if (existing) {
          // Update clipping classification if not already set
          if (!existing.isClipping) {
            await prisma.processedNewsArticle.update({
              where: { id: existing.id },
              data: {
                isClipping: true,
                clippingCategory: art.clippingCategory,
              },
            });
            inserted++;
          } else {
            skipped++;
          }
          continue;
        }

        const portalCategory = inferPortalCategory(art.sourceName, art.title);
        const sourceId = inferSourceId(art.sourceName);

        await prisma.processedNewsArticle.create({
          data: {
            id,
            title: art.title,
            header: art.description || '',
            originalContent: '',
            aiSummary: `<p>${art.description || art.title}</p>`,
            aiKeyPoints: art.matchedKeyword ? [`Keyword: ${art.matchedKeyword}`] : [],
            aiSentiment: 'neutral',
            aiRelevance: `Artículo relevante para el clipping A3 Mercados (${art.clippingCategory}). Keyword detectada: "${art.matchedKeyword || 'clasificación directa'}".`,
            sourceImageUrl: (art as any).imageUrl || null,
            sourceUrl: art.link,
            sourceName: art.sourceName,
            sourceId: sourceId,
            category: portalCategory,
            priority: art.clippingCategory === 'institucional' ? 15 : art.clippingCategory === 'producto' ? 12 : 8,
            publishedAt: pubDate,
            processedAt: new Date(),
            isProcessed: true,
            isDeleted: false,
            isClipping: true,
            clippingCategory: art.clippingCategory,
          },
        });

        inserted++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          skipped++; // duplicate key
        } else {
          errors++;
          console.warn(`   ⚠ Error inserting "${art.title.slice(0, 50)}": ${err.message}`);
        }
      }
    }

    console.log(`\n✅ Resultado:`);
    console.log(`   📝 Insertados/Actualizados: ${inserted}`);
    console.log(`   ⏭  Duplicados omitidos:     ${skipped}`);
    console.log(`   ❌ Errores:                 ${errors}`);

    // Final count
    const finalCount = await prisma.processedNewsArticle.count({
      where: { isClipping: true },
    });
    console.log(`\n📊 Total artículos clipping en DB: ${finalCount}`);

    // Also print some of the most interesting finds
    console.log('\n═══ TOP MENCIONES INSTITUCIONALES ═══');
    const institucional = clippingArticles
      .filter(a => a.clippingCategory === 'institucional')
      .slice(0, 10);
    for (const a of institucional) {
      const date = new Date(a.pubDate);
      const dateStr = isNaN(date.getTime()) ? '??' : date.toLocaleDateString('es-AR');
      console.log(`   📰 [${dateStr}] ${a.title.slice(0, 80)}`);
      console.log(`      🔗 ${a.sourceName} | Keyword: ${a.matchedKeyword}`);
    }

    if (institucional.length === 0) {
      console.log('   (ninguna mención directa encontrada)');
    }

    await prisma.$disconnect();

  } catch (err: any) {
    console.error('\n❌ Error fatal:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n════════════════════════════════════════════════`);
  console.log(`Finalizado: ${new Date().toLocaleString('es-AR')}`);
  console.log('════════════════════════════════════════════════');
}

main();
