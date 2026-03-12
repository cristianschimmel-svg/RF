/**
 * A3 Clipping — Google News Initial Load (2026)
 *
 * One-time script to fetch ALL Google News results for A3 keywords
 * across all of 2026. Run this once to populate the database with
 * historical articles, then let the cron handle incremental updates.
 *
 * Usage: npx tsx scripts/google-news-initial.ts
 */

import 'dotenv/config';

async function main() {
  console.log('════════════════════════════════════════════════');
  console.log('📰 A3 Clipping — Google News Initial Load (2026)');
  console.log('════════════════════════════════════════════════');
  console.log(`Started: ${new Date().toLocaleString('es-AR')}`);
  console.log('');

  const { processGoogleNewsSearch } = await import('../src/lib/services/clipping/google-news-search');

  const result = await processGoogleNewsSearch({
    fullHistory: true,
    onProgress: (msg) => console.log(`  → ${msg}`),
  });

  console.log('');
  console.log('═══ RESULTADO ═══');
  console.log(`📥 Total encontrados: ${result.totalFound}`);
  console.log(`✅ Nuevos insertados: ${result.newArticles}`);
  console.log(`⏭  Duplicados:        ${result.duplicatesSkipped}`);
  console.log(`❌ Errores:           ${result.errors}`);
  console.log(`⏱  Duración:          ${(result.duration / 1000).toFixed(1)}s`);
  console.log('');
  console.log('═══ POR QUERY ═══');
  for (const qr of result.queryResults) {
    console.log(`  🔍 ${qr.query}: ${qr.found} resultado(s)`);
  }
  console.log('');
  console.log('════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
