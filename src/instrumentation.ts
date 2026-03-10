/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts.
 * Sets up an internal cron timer for news processing.
 */

export async function register() {
  // Only run on the server runtime, not during build or in Edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

    /** Check if current hour (Argentina time, UTC-3) is within active hours */
    const isActiveHour = (): boolean => {
      const now = new Date();
      let arHour = now.getUTCHours() - 3;
      if (arHour < 0) arHour += 24;
      return arHour >= 6 && arHour < 22;
    };

    const runScheduledProcessing = async () => {
      if (!isActiveHour()) {
        console.log('[Scheduler] Skipping — outside active hours (06:00-22:00 ART)');
        return;
      }

      try {
        console.log('[Scheduler] Starting scheduled news processing...');
        const { processAllNews } = await import('@/lib/services/news-processor');
        const result = await processAllNews();
        console.log(`[Scheduler] ✅ Completed: ${result.processedCount} articles in ${result.duration}ms`);
      } catch (error) {
        console.error('[Scheduler] ❌ Error:', error instanceof Error ? error.message : error);
      }
    };

    // Run once after a short delay on startup (let the server fully initialize)
    setTimeout(() => {
      console.log('[Scheduler] Initial news processing after startup...');
      runScheduledProcessing();
    }, 15_000); // 15 seconds after boot

    // Then run every 30 minutes
    setInterval(runScheduledProcessing, INTERVAL_MS);

    console.log('[Scheduler] News processing timer registered (every 30 min, 06:00-22:00 ART)');
  }
}
