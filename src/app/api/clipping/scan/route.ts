/**
 * Clipping Manual Scan API
 * POST /api/clipping/scan — Triggers news processing and streams progress via SSE
 * Requires valid clipping JWT.
 */

import { NextRequest } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('clipping-token')?.value ?? null;
}

export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }
  const { valid } = verifyClippingToken(token);
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
  }

  // Get existing clipping article IDs before processing (to detect new ones later)
  const existingIds = await prisma.processedNewsArticle.findMany({
    where: { isClipping: true, isDeleted: false },
    select: { id: true },
  });
  const existingIdSet = new Set(existingIds.map(a => a.id));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // Phase 1: Main news processing
        send({ phase: 'rss', message: 'Obteniendo noticias de feeds RSS...', progress: 5 });

        const { processAllNews } = await import('@/lib/services/news-processor');
        
        send({ phase: 'processing', message: 'Procesando y clasificando artículos...', progress: 15 });
        const result = await processAllNews();

        send({
          phase: 'main_done',
          message: `Portal: ${result.processedCount} artículos procesados`,
          progress: 40,
          detail: {
            processed: result.processedCount,
            errors: result.errorCount,
            duration: result.duration,
          },
        });

        // Phase 2: Custom clipping sources
        send({ phase: 'clipping_sources', message: 'Procesando fuentes personalizadas de clipping...', progress: 45 });

        let clippingResult = { processed: 0, errors: 0 };
        try {
          const { processClippingCustomSources } = await import('@/lib/services/news-processor');
          const { getKeywordsFromDB } = await import('@/lib/services/clipping/a3-keywords');
          const dynamicKeywords = await getKeywordsFromDB();
          clippingResult = await processClippingCustomSources(dynamicKeywords);
        } catch (e) {
          console.error('[ClippingScan] Custom sources error:', e);
        }

        send({
          phase: 'clipping_done',
          message: `Clipping: ${clippingResult.processed} artículos de fuentes custom`,
          progress: 55,
          detail: clippingResult,
        });

        // Phase 3: Google News search for institutional keywords
        send({ phase: 'google_search', message: 'Buscando en Google News (keywords institucionales)...', progress: 60 });

        let googleResult = { totalFound: 0, newArticles: 0, duplicatesSkipped: 0, errors: 0, duration: 0, queryResults: [] as { query: string; found: number }[] };
        try {
          const { processGoogleNewsSearch } = await import('@/lib/services/clipping/google-news-search');
          googleResult = await processGoogleNewsSearch({
            onProgress: (msg) => {
              send({ phase: 'google_search', message: `Google: ${msg}`, progress: 65 });
            },
          });
        } catch (e) {
          console.error('[ClippingScan] Google News error:', e);
          send({ phase: 'google_search', message: 'Error en búsqueda de Google News', progress: 85 });
        }

        send({
          phase: 'google_done',
          message: `Google News: ${googleResult.newArticles} nueva(s) de ${googleResult.totalFound} encontrada(s)`,
          progress: 88,
          detail: googleResult,
        });

        // Phase 4: Detect new clipping articles
        send({ phase: 'detecting', message: 'Detectando nuevas noticias de clipping...', progress: 92 });

        const allClippingNow = await prisma.processedNewsArticle.findMany({
          where: { isClipping: true, isDeleted: false },
          select: { id: true },
        });
        const newIds = allClippingNow.map(a => a.id).filter(id => !existingIdSet.has(id));

        send({
          phase: 'complete',
          message: `Finalizado — ${newIds.length} nueva(s) noticia(s) de clipping`,
          progress: 100,
          newArticleIds: newIds,
          summary: {
            portalProcessed: result.processedCount,
            portalErrors: result.errorCount,
            clippingCustom: clippingResult.processed,
            googleNewsFound: googleResult.totalFound,
            googleNewsNew: googleResult.newArticles,
            newClippingArticles: newIds.length,
            durationMs: result.duration + googleResult.duration,
          },
        });
      } catch (error) {
        send({
          phase: 'error',
          message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          progress: 100,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
