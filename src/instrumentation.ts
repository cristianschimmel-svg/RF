/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts.
 * Sets up internal cron timers for all scheduled tasks:
 *  - News processing (every 30 min, 06-22 ART)
 *  - Google News clipping search (every 2h)
 *  - Twitter/X clipping search (every 3h)
 */

export async function register() {
  // Only run on the server runtime, not during build or in Edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const NEWS_INTERVAL = 30 * 60 * 1000;        // 30 minutes
    const GOOGLE_NEWS_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
    const TWITTER_INTERVAL = 3 * 60 * 60 * 1000;     // 3 hours

    /** Check if current hour (Argentina time, UTC-3) is within active hours */
    const isActiveHour = (): boolean => {
      const now = new Date();
      let arHour = now.getUTCHours() - 3;
      if (arHour < 0) arHour += 24;
      return arHour >= 6 && arHour < 22;
    };

    const runScheduledProcessing = async () => {
      if (!isActiveHour()) {
        console.log('[Scheduler] Skipping news — outside active hours (06:00-22:00 ART)');
        return;
      }

      try {
        console.log('[Scheduler] Starting scheduled news processing...');
        const { processAllNews, processClippingCustomSources } = await import('@/lib/services/news-processor');
        const { getKeywordsFromDB } = await import('@/lib/services/clipping/a3-keywords');
        const result = await processAllNews();
        console.log(`[Scheduler] ✅ News: ${result.processedCount} articles in ${result.duration}ms`);

        // Process clipping custom sources
        try {
          const dynamicKeywords = await getKeywordsFromDB();
          const clippingResult = await processClippingCustomSources(dynamicKeywords);
          console.log(`[Scheduler] ✅ Clipping custom sources: ${clippingResult.processed} processed, ${clippingResult.errors} errors`);
        } catch (e) {
          console.error('[Scheduler] ❌ Clipping custom sources error:', e instanceof Error ? e.message : e);
        }
      } catch (error) {
        console.error('[Scheduler] ❌ News error:', error instanceof Error ? error.message : error);
      }
    };

    const runGoogleNewsSearch = async () => {
      try {
        console.log('[Scheduler] Starting Google News clipping search...');
        const { processGoogleNewsSearch } = await import('@/lib/services/clipping/google-news-search');
        const result = await processGoogleNewsSearch();
        console.log(`[Scheduler] ✅ Google News: ${result.newArticles} new from ${result.totalFound} found (${result.duration}ms)`);
      } catch (error) {
        console.error('[Scheduler] ❌ Google News error:', error instanceof Error ? error.message : error);
      }
    };

    const runTwitterSearch = async () => {
      try {
        console.log('[Scheduler] Starting Twitter/X clipping search...');
        const { processTwitterSearch } = await import('@/lib/services/clipping/twitter-search');
        const result = await processTwitterSearch();
        console.log(`[Scheduler] ✅ Twitter: ${result.newArticles} new from ${result.totalFound} found (${result.duration}ms) via ${result.instanceUsed}`);
      } catch (error) {
        console.error('[Scheduler] ❌ Twitter error:', error instanceof Error ? error.message : error);
      }
    };

    // Ensure default clipping user exists
    const seedClippingUser = async () => {
      try {
        const { prisma } = await import('@/lib/db/prisma');
        const existing = await prisma.clippingUser.findUnique({
          where: { email: 'clipping@a3mercados.com.ar' },
        });
        if (!existing) {
          const bcrypt = await import('bcryptjs');
          const hash = await bcrypt.hash('A3clipping2024!', 12);
          await prisma.clippingUser.create({
            data: {
              email: 'clipping@a3mercados.com.ar',
              password: hash,
              name: 'A3 Mercados',
              company: 'A3 Mercados',
            },
          });
          console.log('[Seed] ✅ Created default clipping user');
        }
      } catch (error) {
        console.error('[Seed] ❌ Could not seed clipping user:', error instanceof Error ? error.message : error);
      }
    };

    // Run once after a short delay on startup (let the server fully initialize)
    setTimeout(() => {
      console.log('[Scheduler] Initial runs after startup...');
      seedClippingUser();
      runScheduledProcessing();
      runGoogleNewsSearch();
      runTwitterSearch();
    }, 15_000); // 15 seconds after boot

    // Recurring schedules
    setInterval(runScheduledProcessing, NEWS_INTERVAL);         // every 30 min
    setInterval(runGoogleNewsSearch, GOOGLE_NEWS_INTERVAL);     // every 2h
    setInterval(runTwitterSearch, TWITTER_INTERVAL);            // every 3h

    console.log('[Scheduler] All timers registered:');
    console.log('  - News + Clipping custom sources: every 30 min');
    console.log('  - Google News search: every 2h');
    console.log('  - Twitter/X search: every 3h');
    console.log('  - Active hours: 06:00-22:00 ART');
  }
}
