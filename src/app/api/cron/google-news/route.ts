/**
 * Cron Job: Google News Search for A3 Clipping
 * Runs every 2 hours — searches Google News for institutional keywords
 * and processes new articles through the full AI pipeline.
 *
 * No silent hours: Google searches have no external cost, and
 * news can be published at any time.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[Cron/GoogleNews] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron/GoogleNews] Starting scheduled Google News search...');

  try {
    const { processGoogleNewsSearch } = await import('@/lib/services/clipping/google-news-search');
    const result = await processGoogleNewsSearch(); // incremental (last 3 days)

    console.log(`[Cron/GoogleNews] Completed: ${result.newArticles} new articles from ${result.totalFound} found (${result.duration}ms)`);

    return NextResponse.json({
      success: true,
      message: `Google News: ${result.newArticles} new from ${result.totalFound} found`,
      result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron/GoogleNews] Fatal error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
