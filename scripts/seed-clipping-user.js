const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('A3clipping2024!', 12);
  const user = await prisma.clippingUser.upsert({
    where: { email: 'clipping@a3mercados.com.ar' },
    update: {},
    create: {
      email: 'clipping@a3mercados.com.ar',
      password: hash,
      name: 'A3 Mercados',
      company: 'A3 Mercados',
    },
  });
  console.log('Created clipping user:', user.email);
  await prisma.$disconnect();
}

main().catch(console.error);
