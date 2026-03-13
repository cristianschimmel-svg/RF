/**
 * Clipping Historical Google News Search API
 * POST /api/clipping/scan/historical
 *
 * Searches Google News for Institucional + Sector keywords within a custom date range.
 * Streams progress via SSE. Requires valid clipping JWT.
 *
 * Body: { dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD' }
 */

import { NextRequest } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('clipping-token')?.value ?? null;
}

/** Validate YYYY-MM-DD format */
function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str + 'T00:00:00Z').getTime());
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

  // Parse body
  let dateFrom: string;
  let dateTo: string;
  try {
    const body = await request.json();
    dateFrom = body.dateFrom;
    dateTo = body.dateTo;
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido' }), { status: 400 });
  }

  if (!dateFrom || !dateTo || !isValidDate(dateFrom) || !isValidDate(dateTo)) {
    return new Response(JSON.stringify({ error: 'Fechas inválidas. Formato: YYYY-MM-DD' }), { status: 400 });
  }

  if (new Date(dateFrom) > new Date(dateTo)) {
    return new Response(JSON.stringify({ error: 'dateFrom debe ser anterior a dateTo' }), { status: 400 });
  }

  // Max 6 months range
  const diffMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 185) {
    return new Response(JSON.stringify({ error: 'Rango máximo: 6 meses' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    function send(data: Record<string, unknown>) {
      writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)).catch(() => {});
    }

    const keepAlive = setInterval(() => {
      writer.write(encoder.encode(': keepalive\n\n')).catch(() => {});
    }, 10_000);

    try {
      send({
        phase: 'start',
        message: `Búsqueda histórica: ${dateFrom} → ${dateTo} (solo Institucional + Sector)`,
        progress: 5,
      });

      const { processGoogleNewsSearch } = await import('@/lib/services/clipping/google-news-search');

      const result = await processGoogleNewsSearch({
        dateFrom,
        dateTo,
        onProgress: (msg) => {
          send({ phase: 'searching', message: msg, progress: 15 });
        },
      });

      send({
        phase: 'complete',
        message: `Completado: ${result.newArticles} nueva(s) de ${result.totalFound} encontrada(s)`,
        progress: 100,
        summary: {
          totalFound: result.totalFound,
          newArticles: result.newArticles,
          duplicatesSkipped: result.duplicatesSkipped,
          errors: result.errors,
          durationMs: result.duration,
          queryResults: result.queryResults,
          dateFrom,
          dateTo,
        },
      });
    } catch (error) {
      send({
        phase: 'error',
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        progress: 100,
      });
    } finally {
      clearInterval(keepAlive);
      writer.close().catch(() => {});
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection': 'keep-alive',
    },
  });
}
