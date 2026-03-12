/**
 * Cron Job: Process News
 * Runs every 30 minutes via Vercel Cron
 * Fetches RSS feeds, filters, summarizes with AI, and stores in DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllNews, processClippingCustomSources } from '@/lib/services/news-processor';
import { getKeywordsFromDB } from '@/lib/services/clipping/a3-keywords';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // seconds — increased for Google News search

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (or allow in development)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[Cron] Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Silent hours check: 19:00 to 06:00 Argentina time
  // AR time is UTC-3. We get current UTC hour, then subtract 3.
  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  let arHour = currentUtcHour - 3;
  if (arHour < 0) arHour += 24;

  // Between 19 and 23, or between 0 and 5
  if (arHour >= 19 || arHour < 6) {
    console.log(`[Cron] Skpping news refresh during silent hours (Current AR hour: ${arHour})`);
    return NextResponse.json({
      success: true,
      message: 'Skipped - Silent hours (19:00 - 06:00 ART)',
      result: { processedCount: 0, duration: 0 }
    });
  }

  console.log('[Cron] Starting scheduled news processing...');

  try {
    const result = await processAllNews();

    // Process custom clipping sources separately (does NOT affect the portal)
    let clippingResult = { processed: 0, errors: 0 };
    try {
      const dynamicKeywords = await getKeywordsFromDB();
      clippingResult = await processClippingCustomSources(dynamicKeywords);
    } catch (e) {
      console.error('[Cron] Clipping custom sources error:', e instanceof Error ? e.message : e);
    }

    // Google News search for A3 clipping institutional keywords
    let googleResult = { totalFound: 0, newArticles: 0, duplicatesSkipped: 0, errors: 0, duration: 0 };
    try {
      const { processGoogleNewsSearch } = await import('@/lib/services/clipping/google-news-search');
      googleResult = await processGoogleNewsSearch();
    } catch (e) {
      console.error('[Cron] Google News search error:', e instanceof Error ? e.message : e);
    }

    console.log(`[Cron] Completed: ${result.processedCount} articles in ${result.duration}ms, clipping custom: ${clippingResult.processed}, google news: ${googleResult.newArticles} new`);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} articles in ${result.duration}ms`,
      result,
      clippingCustom: clippingResult,
      googleNews: googleResult,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Fatal error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
