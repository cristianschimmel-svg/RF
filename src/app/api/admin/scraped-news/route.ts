import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { invalidateNewsCache } from '@/lib/services/unified-news-service';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/scraped-news
 * List all scraped/processed news articles from the DB
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const articles = await prisma.processedNewsArticle.findMany({
      where: { isDeleted: false },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        header: true,
        sourceName: true,
        sourceUrl: true,
        category: true,
        publishedAt: true,
        processedAt: true,
        isProcessed: true,
        processingError: true,
        sourceImageUrl: true,
        aiImageUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    console.error('[Admin Scraped News] Error listing:', error);
    return NextResponse.json(
      { error: 'Error al obtener noticias escrapeadas' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/scraped-news
 * Delete one or more scraped news articles by ID
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden eliminar noticias' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de IDs' }, { status: 400 });
    }

    // Soft-delete: mark as deleted so RSS fallback won't re-introduce them
    const result = await prisma.processedNewsArticle.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });

    // Invalidate all news caches so the homepage reflects the change immediately
    invalidateNewsCache();

    // Revalidate pages that show news (use 'layout' to cover route groups)
    revalidatePath('/');
    revalidatePath('/noticias');

    console.log(`[Admin] Soft-deleted ${result.count} scraped news articles. IDs: ${ids.join(', ')}`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `${result.count} noticia(s) eliminada(s) correctamente`,
    });
  } catch (error) {
    console.error('[Admin Scraped News] Error deleting:', error);
    return NextResponse.json(
      { error: 'Error al eliminar noticias' },
      { status: 500 }
    );
  }
}
