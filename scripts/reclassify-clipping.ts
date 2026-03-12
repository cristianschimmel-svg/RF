/**
 * Reclassify Clipping Script
 * Re-evaluates all ProcessedNewsArticle records using the hybrid system:
 * - Exempt keywords → auto-include with score 10
 * - Candidate keywords → AI validation (score >= 5 to include)
 * Also re-evaluates existing clipping articles to update scores.
 */

import 'dotenv/config';

async function main() {
  console.log('================================================');
  console.log('🔄 Reclassifying articles for A3 Clipping (hybrid AI)...');
  console.log('================================================');
  console.log(`Started at: ${new Date().toLocaleString('es-AR')}\n`);

  const { PrismaClient } = await import('@prisma/client');
  const { classifyForClipping } = await import('../src/lib/services/clipping/a3-keywords');
  const { validateClippingRelevance } = await import('../src/lib/services/clipping/relevance-validator');

  const prisma = new PrismaClient();

  try {
    // Phase 1: Find new clipping articles from non-clipping pool
    const nonClipping = await prisma.processedNewsArticle.findMany({
      where: { isClipping: false },
      select: { id: true, title: true, header: true, originalContent: true },
    });

    console.log(`📊 Phase 1: ${nonClipping.length} non-clipping articles to evaluate\n`);

    let newlyAdded = 0;
    let aiValidated = 0;
    let aiRejected = 0;
    const byCategory: Record<string, number> = {};

    for (const article of nonClipping) {
      const result = classifyForClipping(
        article.title,
        article.header || '',
        article.originalContent || '',
      );

      if (!result.isClipping) continue;

      if (result.exempt) {
        await prisma.processedNewsArticle.update({
          where: { id: article.id },
          data: {
            isClipping: true,
            clippingCategory: result.category,
            clippingScore: 10,
            clippingReason: `Mención directa: "${result.matchedKeyword}"`,
          },
        });
        newlyAdded++;
        byCategory[result.category!] = (byCategory[result.category!] || 0) + 1;
        console.log(`  ✅ [EXEMPT] [${result.category}] "${article.title.substring(0, 70)}..."`);
      } else {
        // AI validation for candidates
        try {
          const relevance = await validateClippingRelevance(
            article.title,
            article.header || '',
            result.matchedKeyword || '',
            result.category || 'ecosistema',
          );
          aiValidated++;

          if (relevance.score >= 5) {
            await prisma.processedNewsArticle.update({
              where: { id: article.id },
              data: {
                isClipping: true,
                clippingCategory: relevance.category || result.category,
                clippingScore: relevance.score,
                clippingReason: relevance.reason,
              },
            });
            newlyAdded++;
            const cat = relevance.category || result.category || 'ecosistema';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
            console.log(`  ✅ [AI=${relevance.score}] [${cat}] "${article.title.substring(0, 70)}..."`);
          } else {
            aiRejected++;
            console.log(`  🚫 [AI=${relevance.score}] "${article.title.substring(0, 70)}..." — ${relevance.reason}`);
          }
          // Rate limit: small delay between AI calls
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`  ⚠️ AI error for "${article.title.substring(0, 50)}":`, err);
        }
      }
    }

    // Phase 2: Update existing clipping articles that don't have a score yet
    const existingClipping = await prisma.processedNewsArticle.findMany({
      where: { isClipping: true, clippingScore: null },
      select: { id: true, title: true, header: true, originalContent: true, clippingCategory: true },
    });

    console.log(`\n📊 Phase 2: ${existingClipping.length} existing clipping articles without score\n`);

    let updated = 0;
    let removed = 0;

    for (const article of existingClipping) {
      const result = classifyForClipping(
        article.title,
        article.header || '',
        article.originalContent || '',
      );

      if (result.exempt) {
        await prisma.processedNewsArticle.update({
          where: { id: article.id },
          data: {
            clippingScore: 10,
            clippingReason: `Mención directa: "${result.matchedKeyword}"`,
          },
        });
        updated++;
        console.log(`  📝 [EXEMPT] score=10 "${article.title.substring(0, 70)}..."`);
      } else if (result.isClipping) {
        try {
          const relevance = await validateClippingRelevance(
            article.title,
            article.header || '',
            result.matchedKeyword || '',
            article.clippingCategory || 'ecosistema',
          );

          if (relevance.score >= 5) {
            await prisma.processedNewsArticle.update({
              where: { id: article.id },
              data: {
                clippingScore: relevance.score,
                clippingReason: relevance.reason,
                clippingCategory: relevance.category || article.clippingCategory,
              },
            });
            updated++;
            console.log(`  📝 [AI=${relevance.score}] "${article.title.substring(0, 70)}..."`);
          } else {
            // Remove from clipping — not relevant enough
            await prisma.processedNewsArticle.update({
              where: { id: article.id },
              data: { isClipping: false, clippingScore: relevance.score, clippingReason: relevance.reason },
            });
            removed++;
            console.log(`  🗑️ [AI=${relevance.score}] REMOVED "${article.title.substring(0, 70)}..." — ${relevance.reason}`);
          }
          await new Promise(r => setTimeout(r, 200));
        } catch (err) {
          console.error(`  ⚠️ AI error for "${article.title.substring(0, 50)}":`, err);
        }
      } else {
        // Keyword no longer matches — flag with low score but keep
        await prisma.processedNewsArticle.update({
          where: { id: article.id },
          data: { clippingScore: 5, clippingReason: 'Sin coincidencia de keywords actualizada' },
        });
        updated++;
      }
    }

    console.log('\n================================================');
    console.log('📋 Results:');
    console.log('================================================');
    console.log(`  Phase 1 — Non-clipping evaluated: ${nonClipping.length}`);
    console.log(`  Phase 1 — Newly classified: ${newlyAdded}`);
    console.log(`  Phase 1 — AI validated: ${aiValidated} (rejected: ${aiRejected})`);
    for (const [cat, count] of Object.entries(byCategory)) {
      console.log(`    - ${cat}: ${count}`);
    }
    console.log(`  Phase 2 — Existing updated: ${updated}`);
    console.log(`  Phase 2 — Removed (low score): ${removed}`);
    console.log(`\nFinished at: ${new Date().toLocaleString('es-AR')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
