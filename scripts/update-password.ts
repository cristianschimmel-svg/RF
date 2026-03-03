/**
 * Script to update the admin password in the database.
 * Run with: npx tsx scripts/update-password.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'WenCri123$';
  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email: 'admin@rosariofinanzas.com.ar' },
    data: { password: hash },
  });

  console.log(`✅ Contraseña actualizada para: ${user.email}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
