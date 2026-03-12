const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Show clipping articles
  const clipping = await p.processedNewsArticle.findMany({
    where: { isClipping: true, isDeleted: false },
    select: { title: true, clippingCategory: true, publishedAt: true },
    orderBy: { publishedAt: 'desc' }
  });
  console.log('=== CLIPPING ARTICLES ===');
  clipping.forEach(a => console.log(`[${a.clippingCategory}] ${a.title}`));
  console.log(`\nTotal clipping: ${clipping.length}`);

  // Show all titles for reference
  const all = await p.processedNewsArticle.findMany({
    where: { isDeleted: false },
    select: { title: true },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  });
  console.log('\n=== LATEST 20 TITLES ===');
  all.forEach(a => console.log(`  ${a.title.slice(0, 100)}`));

  await p.$disconnect();
}
main().catch(console.error);
