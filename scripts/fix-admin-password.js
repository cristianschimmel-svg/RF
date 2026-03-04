const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Check if admin exists
  let user = await prisma.user.findFirst({ where: { email: 'admin@rosariofinanzas.com.ar' } });
  
  if (!user) {
    console.log('Usuario no encontrado. Creando admin...');
    const hash = await bcrypt.hash('WenCri123$', 12);
    user = await prisma.user.create({
      data: {
        email: 'admin@rosariofinanzas.com.ar',
        password: hash,
        name: 'Administrador',
        role: 'ADMIN',
        active: true,
      },
    });
    console.log('✅ Usuario admin creado:', user.email);
  } else {
    console.log('Usuario encontrado:', user.email, '| rol:', user.role);
    const hash = await bcrypt.hash('WenCri123$', 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash, active: true } });
    console.log('✅ Contraseña actualizada correctamente');
  }

  // Verify login works
  const updated = await prisma.user.findFirst({ where: { email: 'admin@rosariofinanzas.com.ar' } });
  const valid = await bcrypt.compare('WenCri123$', updated.password);
  console.log('🔐 Verificación de contraseña:', valid ? 'CORRECTA ✅' : 'FALLA ❌');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
