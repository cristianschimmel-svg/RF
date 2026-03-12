/**
 * Retroclassification Script for A3 Clipping
 * 
 * Scans ALL existing processed articles and applies clipping classification
 * to any that match A3 keywords but weren't previously classified.
 * 
 * Usage: npx tsx scripts/classify-clipping.ts
 */

import 'dotenv/config';

async function main() {
  console.log('================================================');
  console.log('📋 A3 Clipping — Retroclassification');
  console.log('================================================');
  console.log(`Started at: ${new Date().toLocaleString('es-AR')}`);
  console.log('');

  // Dynamic imports to pick up env
  const { PrismaClient } = await import('@prisma/client');
  const { classifyForClipping } = await import('../src/lib/services/clipping/a3-keywords');

  const prisma = new PrismaClient();

  try {
    // Get all non-deleted articles
    const articles = await prisma.processedNewsArticle.findMany({
      where: { isDeleted: false },
      select: { id: true, title: true, header: true, isClipping: true, clippingCategory: true },
    });

    console.log(`📰 Total articles in DB: ${articles.length}`);

    let classified = 0;
    let alreadyClassified = 0;
    let updated = 0;

    for (const article of articles) {
      const result = classifyForClipping(article.title, article.header || '');

      if (result.isClipping) {
        classified++;

        if (article.isClipping && article.clippingCategory === result.category) {
          alreadyClassified++;
          continue;
        }

        await prisma.processedNewsArticle.update({
          where: { id: article.id },
          data: {
            isClipping: true,
            clippingCategory: result.category,
          },
        });
        updated++;
        console.log(`  ✅ [${result.category}] "${article.title.slice(0, 80)}..." (kw: ${result.matchedKeyword})`);
      }
    }

    console.log('');
    console.log('================================================');
    console.log('📊 Results:');
    console.log(`   Scanned:            ${articles.length}`);
    console.log(`   Matched clipping:   ${classified}`);
    console.log(`   Already classified: ${alreadyClassified}`);
    console.log(`   Newly updated:      ${updated}`);
    console.log('================================================');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
