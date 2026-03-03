/**
 * Cron Job: Process News
 * Runs every 30 minutes via Vercel Cron
 * Fetches RSS feeds, filters, summarizes with AI, and stores in DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllNews } from '@/lib/services/news-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds (Vercel Pro allows up to 300)

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

    console.log(`[Cron] Completed: ${result.processedCount} articles in ${result.duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} articles in ${result.duration}ms`,
      result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Fatal error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
