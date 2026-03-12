/**
 * Clipping Analytics API
 * GET /api/clipping/analytics — Word frequency, trends, category breakdown
 * 
 * Query params:
 *  - q: optional keyword filter (only articles matching this keyword)
 *  - category: optional clipping category filter
 *  - type: "wordcloud" | "trends" | "all" (default: all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';
import { prisma } from '@/lib/db/prisma';

// ─── Spanish stop words to exclude from word cloud ───
const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'los', 'del', 'las', 'un', 'por', 'con', 'una',
  'su', 'para', 'es', 'al', 'lo', 'como', 'más', 'mas', 'pero', 'sus', 'le',
  'ya', 'o', 'fue', 'este', 'ha', 'sí', 'si', 'porque', 'esta', 'entre',
  'cuando', 'muy', 'sin', 'sobre', 'ser', 'también', 'tambien', 'me', 'hasta',
  'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno',
  'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto',
  'mí', 'antes', 'algunos', 'qué', 'que', 'unos', 'yo', 'otro', 'otras', 'otra',
  'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual',
  'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis',
  'tú', 'te', 'ti', 'tu', 'tus', 'ellas', 'nosotras', 'vosotros', 'vosotras',
  'os', 'mío', 'mía', 'míos', 'mías', 'tuyo', 'tuya', 'tuyos', 'tuyas',
  'suyo', 'suya', 'suyos', 'suyas', 'nuestro', 'nuestra', 'nuestros', 'nuestras',
  'vuestro', 'vuestra', 'vuestros', 'vuestras', 'esos', 'esas', 'estoy', 'estás',
  'está', 'estamos', 'estáis', 'están', 'esté', 'estés', 'estemos', 'estéis',
  'estén', 'estaré', 'estarás', 'estará', 'estaremos', 'estaréis', 'estarán',
  'estaría', 'estarías', 'estaríamos', 'estaríais', 'estarían', 'estaba',
  'estabas', 'estábamos', 'estabais', 'estaban', 'estuve', 'estuviste', 'estuvo',
  'estuvimos', 'estuvisteis', 'estuvieron', 'he', 'has', 'hemos', 'habéis',
  'han', 'haya', 'hayas', 'hayamos', 'hayáis', 'hayan', 'habré', 'habrás',
  'habrá', 'habremos', 'habréis', 'habrán', 'habría', 'habrías', 'habríamos',
  'habríais', 'habrían', 'había', 'habías', 'habíamos', 'habíais', 'habían',
  'hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron', 'sea', 'seas',
  'seamos', 'seáis', 'sean', 'fuera', 'fueras', 'fuéramos', 'fuerais', 'fueran',
  'fuese', 'fueses', 'fuésemos', 'fueseis', 'fuesen', 'siendo', 'sido', 'tengo',
  'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen', 'tenga', 'tengas', 'tengamos',
  'tengáis', 'tengan', 'tendré', 'tendrás', 'tendrá', 'tendremos', 'tendréis',
  'tendrán', 'tendría', 'tendrías', 'tendríamos', 'tendríais', 'tendrían',
  'tenía', 'tenías', 'teníamos', 'teníais', 'tenían', 'tuve', 'tuviste', 'tuvo',
  'tuvimos', 'tuvisteis', 'tuvieron', 'tuviese', 'tuvieses', 'tuviésemos',
  'son', 'era', 'eras', 'éramos', 'eran', 'fui', 'fuiste', 'fueron', 'fuimos',
  'será', 'serán', 'sería', 'serían', 'no', 'se', 'a', 'q',
  // HTML/Markdown tag leaks
  'strong', 'em', 'br', 'div', 'span', 'href', 'http', 'https', 'www', 'com',
  'html', 'amp', 'nbsp', 'quot', 'lt', 'gt', 'class', 'img', 'src', 'alt',
  // Numeric fragments (e.g. thousands separators: 1.000.000 → "000")
  '000', '00',
  // Common non-informative words in news
  'según', 'segun', 'dijo', 'señaló', 'indicó', 'destacó', 'explicó', 'afirmó',
  'sostuvo', 'agregó', 'aseguró', 'informó', 'puede', 'podría', 'pueden',
  'hoy', 'ayer', 'semana', 'año', 'años', 'día', 'días', 'mes', 'meses',
  'así', 'así', 'parte', 'luego', 'ser', 'cada', 'bien', 'hacer', 'tiene',
  'tras', 'solo', 'sólo', 'tan', 'aquí', 'ahora', 'vez', 'dos', 'tres',
  'cuatro', 'cinco', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'gran', 'primera',
  'primer', 'manera', 'además', 'pudo', 'mejor', 'general', 'cómo', 'mismo',
  'misma', 'mismos', 'mismas', 'van', 'vamos', 'ir', 'va', 'hecho', 'dicho',
  'dado', 'dada', 'ser', 'sido', 'medio', 'mientras', 'aunque', 'embargo',
  'sin embargo', 'aún', 'aun',
]);

function normalizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')           // strip HTML tags FIRST
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // strip markdown bold **text**
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     // remove accents
    .replace(/[^a-z0-9áéíóúüñ\s]/g, ' ') // keep only letters/numbers/spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function extractWords(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('clipping-token')?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { valid, payload } = verifyClippingToken(token);
  if (!valid || !payload?.email) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type') || 'all';
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');

    // Parse and validate date range
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;
    if (dateFromParam) {
      const d = new Date(dateFromParam);
      if (!isNaN(d.getTime())) dateFrom = d;
    }
    if (dateToParam) {
      const d = new Date(dateToParam + 'T23:59:59.999Z');
      if (!isNaN(d.getTime())) dateTo = d;
    }

    // Load user preferences
    const user = await prisma.clippingUser.findUnique({
      where: { email: payload.email as string },
      select: { customKeywords: true, enabledSources: true },
    });

    const userKeywords = (user?.customKeywords as string[] | null) || [];
    const userSources = (user?.enabledSources as string[] | null) || [];

    // Build DB filter
    const where: any = {
      isClipping: true,
      isDeleted: false,
      isProcessed: true,
    };
    if (category) {
      where.clippingCategory = { equals: category, mode: 'insensitive' };
    }
    if (userSources.length > 0) {
      where.sourceName = { in: userSources };
    }
    if (dateFrom || dateTo) {
      where.publishedAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    // Combine user keywords + search query into filter
    const keywordFilters: any[] = [];
    if (userKeywords.length > 0) {
      keywordFilters.push(
        ...userKeywords.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' } },
            { header: { contains: kw, mode: 'insensitive' } },
            { aiSummary: { contains: kw, mode: 'insensitive' } },
          ],
        }))
      );
    }
    if (query) {
      keywordFilters.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { header: { contains: query, mode: 'insensitive' } },
          { aiSummary: { contains: query, mode: 'insensitive' } },
        ],
      });
    }
    if (keywordFilters.length > 0) {
      // If user has keywords AND there's a search query, articles must match
      // at least one user keyword AND the search query
      if (userKeywords.length > 0 && query) {
        where.AND = [
          { OR: userKeywords.map(kw => ({
              OR: [
                { title: { contains: kw, mode: 'insensitive' } },
                { header: { contains: kw, mode: 'insensitive' } },
                { aiSummary: { contains: kw, mode: 'insensitive' } },
              ],
            }))
          },
          { OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { header: { contains: query, mode: 'insensitive' } },
              { aiSummary: { contains: query, mode: 'insensitive' } },
            ]
          },
        ];
      } else if (userKeywords.length > 0) {
        where.OR = userKeywords.map(kw => ({
          OR: [
            { title: { contains: kw, mode: 'insensitive' } },
            { header: { contains: kw, mode: 'insensitive' } },
            { aiSummary: { contains: kw, mode: 'insensitive' } },
          ],
        }));
      } else if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { header: { contains: query, mode: 'insensitive' } },
          { aiSummary: { contains: query, mode: 'insensitive' } },
        ];
      }
    }

    const articles = await prisma.processedNewsArticle.findMany({
      where,
      select: {
        id: true,
        title: true,
        header: true,
        aiSummary: true,
        aiKeyPoints: true,
        clippingCategory: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 500, // Cap for performance on wide date ranges
    });

    const result: any = {
      success: true,
      query,
      articlesAnalyzed: articles.length,
    };

    // ─── Word Cloud ───
    if (type === 'all' || type === 'wordcloud') {
      const wordFreq: Record<string, number> = {};
      for (const article of articles) {
        const text = [
          article.title || '',
          article.header || '',
          article.aiSummary || '',
          ...(Array.isArray(article.aiKeyPoints) ? article.aiKeyPoints as string[] : []),
        ].join(' ');

        const words = extractWords(text);
        for (const word of words) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }

      // Sort by frequency, take top 80
      const wordcloud = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 80)
        .map(([word, count]) => ({ word, count }));

      result.wordcloud = wordcloud;
    }

    // ─── Trends over time ───
    if (type === 'all' || type === 'trends') {
      const dateBuckets: Record<string, { total: number; institucional: number; producto: number; sector: number; ecosistema: number }> = {};

      for (const article of articles) {
        const date = article.publishedAt
          ? new Date(article.publishedAt).toISOString().slice(0, 10)
          : 'unknown';
        if (date === 'unknown') continue;

        if (!dateBuckets[date]) {
          dateBuckets[date] = { total: 0, institucional: 0, producto: 0, sector: 0, ecosistema: 0 };
        }
        dateBuckets[date].total++;
        const cat = (article.clippingCategory || 'ecosistema') as keyof typeof dateBuckets[typeof date];
        if (cat in dateBuckets[date]) {
          dateBuckets[date][cat]++;
        }
      }

      // Sort by date
      const trends = Object.entries(dateBuckets)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, counts]) => ({ date, ...counts }));

      result.trends = trends;
    }

    // ─── Category breakdown (treemap data) ───
    if (type === 'all' || type === 'categories') {
      const catCounts: Record<string, number> = {};
      for (const article of articles) {
        const cat = article.clippingCategory || 'sin categoría';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
      result.categories = Object.entries(catCounts).map(([name, count]) => ({ name, count }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[ClippingAnalytics] Error:', error);
    return NextResponse.json({ error: 'Error al analizar datos' }, { status: 500 });
  }
}
