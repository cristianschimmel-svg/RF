/**
 * Clipping News API
 * GET /api/clipping/news — Protected endpoint returning A3 clipping articles
 * Requires valid clipping JWT in Authorization header or cookie.
 * 
 * Query params:
 *  - category: clipping category filter
 *  - page / limit: pagination
 *  - sources: comma-separated source names to filter (overrides user prefs)
 *  - keywords: comma-separated custom keyword filter (overrides user prefs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';
import { prisma } from '@/lib/db/prisma';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return request.cookies.get('clipping-token')?.value ?? null;
}

export async function GET(request: NextRequest) {
  // Auth check
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
    const category = searchParams.get('category') || undefined;
    const searchQuery = searchParams.get('q')?.trim() || '';
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    // Load user preferences
    const user = await prisma.clippingUser.findUnique({
      where: { email: payload.email as string },
      select: { customKeywords: true, enabledSources: true, email: true, company: true },
    });

    const userKeywords = (user?.customKeywords as string[] | null) || [];
    const userSources = (user?.enabledSources as string[] | null) || [];

    // Build DB filter
    const where: Record<string, unknown> = {
      isClipping: true,
      isDeleted: false,
      isProcessed: true,
    };

    if (category) {
      where.clippingCategory = { equals: category, mode: 'insensitive' };
    }

    // Filter by enabled sources (if user has configured any)
    // Google News articles (sourceId starts with "google-") always pass — they come
    // from many different outlets whose sourceName won't match the curated list.
    if (userSources.length > 0) {
      where.OR = [
        { sourceName: { in: userSources } },
        { sourceId: { startsWith: 'google-' } },
      ];
    }

    // Filter by custom keywords (if user has configured any)
    if (userKeywords.length > 0) {
      const kwFilter = userKeywords.map(kw => ({
        OR: [
          { title: { contains: kw, mode: 'insensitive' } },
          { header: { contains: kw, mode: 'insensitive' } },
          { aiSummary: { contains: kw, mode: 'insensitive' } },
        ],
      }));
      // Combine with existing OR (from sources) using AND
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: kwFilter }];
        delete where.OR;
      } else {
        where.OR = kwFilter;
      }
    }

    // Text search filter (q param)
    if (searchQuery) {
      const searchFilter = {
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' as const } },
          { header: { contains: searchQuery, mode: 'insensitive' as const } },
          { aiSummary: { contains: searchQuery, mode: 'insensitive' as const } },
          { originalContent: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      };
      if (where.AND) {
        (where.AND as unknown[]).push(searchFilter);
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, searchFilter];
        delete where.OR;
      } else {
        where.AND = [searchFilter];
      }
    }

    // Count for pagination
    const total = await prisma.processedNewsArticle.count({ where: where as any });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const articles = await prisma.processedNewsArticle.findMany({
      where: where as any,
      orderBy: { publishedAt: 'desc' },
      skip,
      take: limit,
    });

    // Stats — unfiltered for the category breakdown (show all clipping articles)
    const statsWhere: Record<string, unknown> = {
      isClipping: true,
      isDeleted: false,
      isProcessed: true,
    };

    const allForStats = await prisma.processedNewsArticle.findMany({
      where: statsWhere as any,
      select: { clippingCategory: true },
    });

    const stats = {
      total: allForStats.length,
      institucional: allForStats.filter(a => a.clippingCategory === 'institucional').length,
      producto: allForStats.filter(a => a.clippingCategory === 'producto').length,
      sector: allForStats.filter(a => a.clippingCategory === 'sector').length,
      ecosistema: allForStats.filter(a => a.clippingCategory === 'ecosistema').length,
    };

    return NextResponse.json({
      success: true,
      data: articles.map(a => ({
        id: a.id,
        title: a.title,
        header: a.header,
        aiSummary: a.aiSummary,
        aiKeyPoints: a.aiKeyPoints,
        aiSentiment: a.aiSentiment,
        aiRelevance: a.aiRelevance,
        sourceUrl: a.sourceUrl,
        sourceName: a.sourceName,
        sourceImageUrl: a.sourceImageUrl,
        category: a.category,
        clippingCategory: a.clippingCategory,
        clippingScore: a.clippingScore,
        clippingReason: a.clippingReason,
        priority: a.priority,
        publishedAt: a.publishedAt,
        processedAt: a.processedAt,
        // Include originalContent when searching (needed for client-side matching)
        ...(searchQuery ? { originalContent: a.originalContent } : {}),
      })),
      pagination: { page, limit, total, totalPages },
      stats,
      user: { email: user?.email ?? (payload.email as string), company: user?.company ?? 'A3 Mercados' },
    });
  } catch (error) {
    console.error('[ClippingNews] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener noticias del clipping' },
      { status: 500 }
    );
  }
}
