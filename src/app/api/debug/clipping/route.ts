import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const clippingArticles = await prisma.processedNewsArticle.findMany({
      where: { isClipping: true, isDeleted: false },
      select: {
        id: true,
        title: true,
        category: true,
        clippingCategory: true,
        sourceName: true,
        sourceId: true,
        isProcessed: true,
        publishedAt: true,
        processedAt: true,
        processingError: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    const deletedClipping = await prisma.processedNewsArticle.count({
      where: { isClipping: true, isDeleted: true },
    });

    const totalAll = await prisma.processedNewsArticle.count();
    const totalClipping = clippingArticles.length;

    const byCategory: Record<string, number> = {};
    for (const a of clippingArticles) {
      const cat = a.clippingCategory || a.category || 'sin-categoria';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    const bySource: Record<string, number> = {};
    for (const a of clippingArticles) {
      const src = a.sourceId || a.sourceName || 'desconocido';
      bySource[src] = (bySource[src] || 0) + 1;
    }

    return NextResponse.json({
      totalArticlesInDB: totalAll,
      clippingActive: totalClipping,
      clippingDeleted: deletedClipping,
      nonClipping: totalAll - totalClipping - deletedClipping,
      byClippingCategory: byCategory,
      bySource: bySource,
      recent: clippingArticles.slice(0, 20).map(a => ({
        id: a.id,
        title: a.title?.slice(0, 80),
        clippingCategory: a.clippingCategory,
        category: a.category,
        source: a.sourceId,
        publishedAt: a.publishedAt,
        processedAt: a.processedAt,
        error: a.processingError?.slice(0, 80) ?? null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
