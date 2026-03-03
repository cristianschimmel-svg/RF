/**
 * Script: reset-informes-especiales.js
 * Elimina todos los artículos editoriales existentes e inserta el nuevo informe especial.
 * Uso: node scripts/reset-informes-especiales.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Eliminando artículos existentes...');

  // Eliminar relaciones primero (TagOnArticle)
  const deletedTags = await prisma.tagOnArticle.deleteMany();
  console.log(`   → ${deletedTags.count} tags de artículos eliminados`);

  // Eliminar todos los artículos
  const deletedArticles = await prisma.article.deleteMany();
  console.log(`   → ${deletedArticles.count} artículos eliminados`);

  console.log('\n📂 Buscando categoría y usuario...');

  const agro = await prisma.category.findFirst({ where: { slug: 'agro' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

  if (!agro) {
    console.error('❌ Categoría "agro" no encontrada. Ejecutá db:seed primero.');
    process.exit(1);
  }
  if (!admin) {
    console.error('❌ Usuario ADMIN no encontrado. Ejecutá db:seed primero.');
    process.exit(1);
  }

  console.log(`   → Categoría: ${agro.name} (${agro.id})`);
  console.log(`   → Autor: ${admin.name} (${admin.id})`);

  const content = `
<p class="lead"><strong>La ofensiva conjunta de Estados Unidos e Israel contra objetivos estratégicos en Irán</strong> y la posterior respuesta iraní elevan significativamente la tensión en Medio Oriente y abren la puerta a una escalada prolongada. El mercado concentra su atención en el Estrecho de Ormuz, por donde circula una parte clave del petróleo mundial. Aunque los envíos de crudo continúan en los principales países productores del Golfo, la suspensión parcial de embarques y el riesgo de interrupciones ya generan presión sobre los precios energéticos. En este contexto, la reunión de OPEC+ será determinante para evaluar posibles aumentos de producción si la oferta se ve comprometida.</p>

<p>Para el agro global, el conflicto implica riesgos directos e indirectos. Un encarecimiento del petróleo y el gas impactaría en costos productivos, fletes y fertilizantes, en una región que es central para la oferta de urea y otros nitrogenados. Los mercados agrícolas podrían reaccionar vía energía y tipo de cambio, especialmente en productos como el aceite de soja y el maíz. Más allá de los ataques iniciales, la clave estará en la postura de China y Rusia y en la estabilidad del flujo por Ormuz. Si la crisis escala, el impacto sería global, con efectos sobre energía, insumos agrícolas y mercados financieros.</p>

<hr />

<h2>China acelera compras de soja brasileña y pone el foco en abril-mayo</h2>

<p>El mercado de soja en China muestra un renovado dinamismo, con los compradores concentrando su interés en las cargas brasileñas para abril y mayo, en un contexto de ajustes en las ofertas y mayor firmeza en los precios.</p>

<p>El interés de compra para septiembre y octubre se mantiene moderado. Según operadores, los vendedores evitaron publicar ofertas firmes para cargas a partir de octubre, ya que septiembre marca el cierre de la temporada exportadora de Brasil y no existe urgencia por fijar precios con tanta anticipación.</p>

<p>El mercado anticipa que la mayor parte de las existencias brasileñas se comercializarán hacia octubre, lo que brinda sostén a los valores. A partir de ese mes, el interés de compra tendería a desplazarse hacia la soja estadounidense, que suele operar con primas más elevadas respecto al origen brasileño.</p>

<p>Actualmente, la cobertura de compras de China ronda el <strong>70 por ciento para embarques de abril</strong> y cerca del <strong>40 por ciento para mayo</strong>, de acuerdo con fuentes del mercado. Sin embargo, las adquisiciones no avanzaron significativamente durante las vacaciones del Año Nuevo Lunar y la demanda aún no muestra una recuperación plena.</p>

<p>En este escenario, los participantes esperan que el comercio continúe concentrado en las cargas de abril y mayo, mientras el mercado monitorea la evolución de la demanda china y la transición estacional entre la oferta sudamericana y la estadounidense.</p>

<hr />

<h2>El aceite de soja no frena: ¿estamos ante un nuevo súper rally energético?</h2>

<p>El aceite de soja mantiene una tendencia alcista firme y vuelve a captar la atención del mercado internacional. La posición marzo en Chicago registró una sólida suba semanal y acumula una ganancia muy significativa en lo que va del año, consolidándose como uno de los subproductos agrícolas con mejor desempeño. A diferencia de otros mercados que han mostrado correcciones técnicas, el aceite logró esquivar la toma de ganancias y sigue encontrando compradores dispuestos a sostener la tendencia.</p>

<p>El principal motor detrás de este movimiento es la expectativa de una mayor demanda desde la industria de biocombustibles en EE.UU. El mercado anticipa un incremento en el uso de biodiésel dentro de los mandatos obligatorios de corte, lo que implicaría una absorción adicional de aceite de soja. A esto se suman las nuevas restricciones para el otorgamiento de créditos fiscales a materias primas importadas fuera del bloque de América del Norte, particularmente el aceite usado de cocina proveniente de China, insumo que había ganado fuerte participación en los últimos años. Esta limitación fortalece la posición del aceite doméstico en EE.UU. como alternativa estratégica.</p>

<p>En paralelo, la confirmación por parte de la Oficina de Administración y Presupuesto de la recepción de la norma final de la Agencia de Protección Ambiental sobre los volúmenes del Estándar de Combustibles Renovables aportó un nuevo elemento de expectativa. Si bien surgieron dudas iniciales respecto de la posibilidad de que la Administración Trump reasigne solo una parte de los volúmenes eximidos a pequeñas refinerías, el mercado interpretó que la redistribución final podría ser mayor a lo inicialmente mencionado. Esa percepción reactivó las compras y devolvió impulso a los precios tras un breve momento de incertidumbre.</p>

<p>El resultado es un mercado que combina fundamentos energéticos sólidos, cambios regulatorios y un fuerte componente de los fondos. Mientras la demanda vinculada al biodiésel siga expandiéndose y las señales regulatorias acompañen, el aceite de soja podría continuar operando con un sesgo alcista, en un contexto donde la energía vuelve a marcar el pulso de los commodities agrícolas.</p>

<p>En los mercados agrícolas con la crisis geopolítica, el aceite de soja podría reaccionar ante movimientos del petróleo y del biodiésel, mientras que el maíz podría enfrentar mayores costos de reposición vía energía y tipo de cambio. Un shock energético sostenido implicaría presión inflacionaria global y mayor volatilidad en granos.</p>

<hr />

<h2>La soja cambia de era: más demanda energética y menos oferta externa sacuden el mercado</h2>

<p>La soja enfrenta un nuevo escenario marcado por mayor superficie sembrada y buenas perspectivas productivas bajo condiciones climáticas normales. Sin embargo, el verdadero factor transformador está del lado de la demanda. El crecimiento sostenido de la industria de biocombustibles, los cambios regulatorios que favorecen el uso de aceite doméstico y la mejora en los incentivos fiscales están impulsando con fuerza la molienda y el consumo interno.</p>

<p>En paralelo, el comercio global podría reconfigurarse. Se proyectan mayores exportaciones, con un rol clave de China, mientras que Argentina podría reducir significativamente sus ventas externas de poroto de soja respecto del año pasado. Con más uso energético y menor oferta exportable desde Sudamérica, el mercado podría volverse más ajustado de lo previsto, cambiando el equilibrio tradicional entre abundancia y precios.</p>

<hr />

<h2>Petróleo en alza y tensión global: los granos se preparan para más volatilidad</h2>

<p>El mercado enfrenta un fuerte shock geopolítico tras los recientes acontecimientos en Medio Oriente, con el foco puesto en el petróleo y el Estrecho de Ormuz. Un repunte sostenido del crudo podría trasladarse a los mercados agrícolas, especialmente al trigo y al aceite de soja, que suelen reaccionar positivamente cuando la energía sube. La apertura de la semana será clave para medir la magnitud del impacto.</p>

<p>Al mismo tiempo, los fondos llevan varias semanas comprando fuerte en el sector agrícola, lo que deja un posicionamiento cargado y mayor riesgo de movimientos bruscos. Con el informe de empleo en EE.UU. en el horizonte y la estacionalidad perdiendo impulso, el escenario es de alta sensibilidad a las noticias y volatilidad creciente.</p>

<hr />

<p><em>Por <strong>Esteban Moscariello</strong></em></p>
`.trim();

  console.log('\n✍️  Creando artículo...');

  const article = await prisma.article.create({
    data: {
      slug: 'alerta-global-escalada-geopolitica-energia-agricultura',
      title: 'Alerta global: escalada geopolítica y amenaza directa sobre energía y agricultura',
      excerpt: 'El mercado monitorea Ormuz, el petróleo y el posicionamiento de China y Rusia mientras crece el riesgo sobre fertilizantes, logística e insumos agrícolas. La ofensiva en Irán, el rally del aceite de soja y la reconfiguración del mercado global de commodities.',
      content,
      status: 'PUBLISHED',
      publishedAt: new Date('2026-03-02T12:00:00.000Z'),
      categoryId: agro.id,
      authorId: admin.id,
      coverImage: '/uploads/commodities-geopolitica.jpg',
      featuredImage: '/uploads/commodities-geopolitica.jpg',
    },
  });

  console.log('\n✅ Artículo creado con éxito:');
  console.log('   → Título:   ', article.title);
  console.log('   → Slug:     ', article.slug);
  console.log('   → Estado:   ', article.status);
  console.log('   → Publicado:', article.publishedAt);
  console.log('   → Imagen:   ', article.coverImage);
  console.log('\n⚠️  Recordá copiar la imagen adjunta a:');
  console.log('   c:\\IA\\RF\\rosario-finanzas\\public\\uploads\\commodities-geopolitica.jpg');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
