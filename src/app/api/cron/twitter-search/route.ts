/**
 * Cron Job: Twitter/X Search for A3 Clipping via Nitter RSS
 * Runs every 3 hours — searches Twitter/X through Nitter mirrors
 * for institutional keywords and processes new tweets/articles.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[Cron/TwitterSearch] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron/TwitterSearch] Starting scheduled Twitter/X search...');

  try {
    const { processTwitterSearch } = await import('@/lib/services/clipping/twitter-search');
    const result = await processTwitterSearch();

    console.log(`[Cron/TwitterSearch] Completed: ${result.newArticles} new from ${result.totalFound} found (${result.duration}ms) via ${result.instanceUsed}`);

    return NextResponse.json({
      success: true,
      message: `Twitter: ${result.newArticles} new from ${result.totalFound} found`,
      result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron/TwitterSearch] Fatal error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
