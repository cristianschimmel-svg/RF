import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.tagOnArticle.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.manualIndicator.deleteMany();
  await prisma.setting.deleteMany();

  console.log('🧹 Cleaned existing data');

  // Create admin user
  const adminPassword = await bcrypt.hash('WenCri123$', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@rosariofinanzas.com.ar',
      password: adminPassword,
      name: 'Administrador',
      role: 'ADMIN',
      bio: 'Administrador del portal Rosario Finanzas',
    },
  });
  console.log('👤 Created admin user:', admin.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        slug: 'economia',
        name: 'Economía',
        description: 'Noticias económicas nacionales e internacionales',
        color: '#8B7355',
        icon: 'trending-up',
        order: 1,
      },
    }),
    prisma.category.create({
      data: {
        slug: 'mercados',
        name: 'Mercados',
        description: 'Bolsa, acciones y mercado de capitales',
        color: '#3D7A5C',
        icon: 'bar-chart',
        order: 2,
      },
    }),
    prisma.category.create({
      data: {
        slug: 'agro',
        name: 'Agro',
        description: 'Noticias del sector agropecuario',
        color: '#6B8E23',
        icon: 'wheat',
        order: 3,
      },
    }),
    prisma.category.create({
      data: {
        slug: 'finanzas-personales',
        name: 'Finanzas Personales',
        description: 'Consejos y guías para tus finanzas',
        color: '#4A90A4',
        icon: 'wallet',
        order: 4,
      },
    }),
    prisma.category.create({
      data: {
        slug: 'empresas',
        name: 'Empresas',
        description: 'Noticias corporativas y de negocios',
        color: '#7B68EE',
        icon: 'building',
        order: 5,
      },
    }),
    prisma.category.create({
      data: {
        slug: 'internacional',
        name: 'Internacional',
        description: 'Economía y finanzas globales',
        color: '#CD853F',
        icon: 'globe',
        order: 6,
      },
    }),
  ]);
  console.log(`📂 Created ${categories.length} categories`);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.create({ data: { slug: 'dolar', name: 'Dólar' } }),
    prisma.tag.create({ data: { slug: 'inflacion', name: 'Inflación' } }),
    prisma.tag.create({ data: { slug: 'bcra', name: 'BCRA' } }),
    prisma.tag.create({ data: { slug: 'tasas', name: 'Tasas' } }),
    prisma.tag.create({ data: { slug: 'merval', name: 'Merval' } }),
    prisma.tag.create({ data: { slug: 'soja', name: 'Soja' } }),
    prisma.tag.create({ data: { slug: 'bitcoin', name: 'Bitcoin' } }),
    prisma.tag.create({ data: { slug: 'argentina', name: 'Argentina' } }),
    prisma.tag.create({ data: { slug: 'rosario', name: 'Rosario' } }),
    prisma.tag.create({ data: { slug: 'campo', name: 'Campo' } }),
  ]);
  console.log(`🏷️ Created ${tags.length} tags`);

  // Create sample articles
  const articles = await Promise.all([
    prisma.article.create({
      data: {
        slug: 'dolar-blue-alcanza-nuevo-maximo',
        title: 'El dólar blue alcanza un nuevo máximo histórico',
        excerpt:
          'La divisa informal superó los $1.200 en las principales cuevas del microcentro, marcando una brecha del 15% con el tipo de cambio oficial.',
        content: `
# El dólar blue alcanza un nuevo máximo histórico

El dólar blue volvió a marcar un récord este miércoles al superar los **$1.200** en el mercado informal, lo que representa una suba de $25 respecto al cierre del día anterior.

## Contexto del mercado

La suba se produce en un contexto de:
- Mayor demanda estacional
- Incertidumbre por las negociaciones con el FMI
- Expectativas de inflación elevadas

## Cotizaciones del día

| Tipo | Compra | Venta |
|------|--------|-------|
| Blue | $1.175 | $1.200 |
| Oficial | $1.020 | $1.045 |
| MEP | $1.140 | $1.155 |

## Perspectivas

Los analistas consultados por Rosario Finanzas anticipan que la volatilidad continuará en las próximas semanas.

> "Es esperable ver movimientos bruscos hasta que se defina el rumbo de la política económica", señaló un operador de mesa.

---

*Actualizado: ${new Date().toLocaleDateString('es-AR')}*
        `,
        categoryId: categories[0].id, // Economía
        authorId: admin.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        metaTitle: 'Dólar Blue Récord: Supera los $1.200 | Rosario Finanzas',
        metaDescription:
          'El dólar blue alcanzó un nuevo máximo histórico, superando los $1.200 en el mercado informal. Análisis completo de las causas y perspectivas.',
        views: 1250,
        tags: {
          create: [
            { tag: { connect: { slug: 'dolar' } } },
            { tag: { connect: { slug: 'argentina' } } },
          ],
        },
      },
    }),
    prisma.article.create({
      data: {
        slug: 'soja-recupera-terreno-chicago',
        title: 'La soja recupera terreno en Chicago impulsada por demanda china',
        excerpt:
          'Los precios de la oleaginosa subieron más de 2% en la semana, alcanzando los US$395 por tonelada.',
        content: `
# La soja recupera terreno en Chicago

Los futuros de soja en el mercado de Chicago (CBOT) registraron una suba semanal superior al 2%, impulsados por la renovada demanda desde China.

## Factores alcistas

1. **Compras chinas**: Se confirmaron nuevas operaciones de importación
2. **Clima en Sudamérica**: Preocupaciones por sequía en Brasil
3. **Dólar débil**: El debilitamiento del dólar favorece las exportaciones

## Impacto local

Para los productores de la zona de Rosario, esto representa una mejora en los márgenes de comercialización.

### Precios de referencia (Rosario)

- Soja disponible: $385.000/tn
- Soja Mayo: $390.000/tn

## Perspectivas

El informe del USDA de la próxima semana será clave para definir la tendencia.
        `,
        categoryId: categories[2].id, // Agro
        authorId: admin.id,
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 86400000), // Yesterday
        metaTitle: 'Soja en Chicago: Sube 2% por Demanda China | Rosario Finanzas',
        metaDescription:
          'La soja recuperó terreno en Chicago con una suba semanal del 2%. Análisis del mercado y perspectivas para productores de Rosario.',
        views: 890,
        tags: {
          create: [
            { tag: { connect: { slug: 'soja' } } },
            { tag: { connect: { slug: 'campo' } } },
            { tag: { connect: { slug: 'rosario' } } },
          ],
        },
      },
    }),
    prisma.article.create({
      data: {
        slug: 'merval-record-suba-acciones',
        title: 'El Merval marca un nuevo récord histórico en pesos',
        excerpt:
          'El índice bursátil argentino superó los 1.900.000 puntos, impulsado por el sector bancario y energético.',
        content: `
# El Merval marca un nuevo récord histórico

El índice S&P Merval cerró este jueves en un nuevo máximo histórico, superando los **1.900.000 puntos**, con una suba diaria del 2.3%.

## Acciones destacadas

Las principales subas fueron lideradas por:
- **GGAL** (Grupo Galicia): +4.2%
- **YPF**: +3.8%
- **PAMP** (Pampa Energía): +3.5%

## Volumen operado

Se registró un volumen récord de operaciones, superando los $150.000 millones en la jornada.

## Análisis técnico

El índice superó la resistencia clave de los 1.850.000 puntos, lo que abre camino a nuevos máximos.
        `,
        categoryId: categories[1].id, // Mercados
        authorId: admin.id,
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 172800000), // 2 days ago
        views: 2100,
        tags: {
          create: [
            { tag: { connect: { slug: 'merval' } } },
            { tag: { connect: { slug: 'argentina' } } },
          ],
        },
      },
    }),
    prisma.article.create({
      data: {
        slug: 'bcra-mantiene-tasa-politica-monetaria',
        title: 'El BCRA mantiene sin cambios la tasa de política monetaria',
        excerpt:
          'El Banco Central decidió mantener la tasa en el 100% anual, en línea con las expectativas del mercado.',
        content: `
# El BCRA mantiene la tasa de política monetaria

El Banco Central de la República Argentina (BCRA) decidió mantener sin cambios la tasa de política monetaria en el **100% anual** (TNA).

## Fundamentos de la decisión

- Inflación en línea con proyecciones
- Estabilidad del tipo de cambio oficial
- Señales de desaceleración económica

## Reacción del mercado

Los bonos en pesos reaccionaron con subas moderadas, mientras que el dólar se mantuvo estable.
        `,
        categoryId: categories[0].id, // Economía
        authorId: admin.id,
        status: 'DRAFT',
        views: 0,
        tags: {
          create: [
            { tag: { connect: { slug: 'bcra' } } },
            { tag: { connect: { slug: 'tasas' } } },
          ],
        },
      },
    }),
  ]);
  console.log(`📰 Created ${articles.length} articles`);

  // Create manual indicators for Rosario-specific data
  await Promise.all([
    prisma.manualIndicator.create({
      data: {
        code: 'SOJA_ROSARIO_DISPONIBLE',
        name: 'Soja Disponible Rosario',
        shortName: 'Soja Disp.',
        category: 'agro',
        value: 385000,
        previousValue: 382000,
        unit: 'ARS/tn',
        source: 'Bolsa de Comercio de Rosario',
        sourceUrl: 'https://www.bcr.com.ar',
      },
    }),
    prisma.manualIndicator.create({
      data: {
        code: 'MAIZ_ROSARIO_DISPONIBLE',
        name: 'Maíz Disponible Rosario',
        shortName: 'Maíz Disp.',
        category: 'agro',
        value: 178500,
        previousValue: 180000,
        unit: 'ARS/tn',
        source: 'Bolsa de Comercio de Rosario',
        sourceUrl: 'https://www.bcr.com.ar',
      },
    }),
    prisma.manualIndicator.create({
      data: {
        code: 'TRIGO_ROSARIO_DISPONIBLE',
        name: 'Trigo Disponible Rosario',
        shortName: 'Trigo Disp.',
        category: 'agro',
        value: 195000,
        previousValue: 193500,
        unit: 'ARS/tn',
        source: 'Bolsa de Comercio de Rosario',
        sourceUrl: 'https://www.bcr.com.ar',
      },
    }),
  ]);
  console.log('📊 Created manual indicators');

  // Create settings
  await prisma.setting.create({
    data: {
      key: 'site_config',
      value: JSON.stringify({
        siteName: 'Rosario Finanzas',
        siteDescription: 'Portal de finanzas para Rosario y zona',
        contactEmail: 'contacto@rosariofinanzas.com.ar',
        socialLinks: {
          twitter: 'https://twitter.com/rosariofinanzas',
          instagram: 'https://instagram.com/rosariofinanzas',
          linkedin: 'https://linkedin.com/company/rosariofinanzas',
        },
      }),
    },
  });
  console.log('⚙️ Created settings');

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Admin user: admin@rosariofinanzas.com.ar / WenCri123$`);
  console.log(`   - Categories: ${categories.length}`);
  console.log(`   - Tags: ${tags.length}`);
  console.log(`   - Articles: ${articles.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
