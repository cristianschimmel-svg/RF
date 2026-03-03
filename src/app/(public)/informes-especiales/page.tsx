import { MainLayout } from '@/components/layout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getEditorialNews } from '@/lib/services/unified-news-service';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  BarChart3,
  Clock,
  ChevronRight,
  FileText,
  Pen,
  Star,
} from 'lucide-react';

export const revalidate = 300; // 5 minutes

export const metadata = {
  title: 'Informes Especiales | Rosario Finanzas',
  description: 'Informes especiales y análisis financiero exclusivo de Rosario Finanzas.',
};

export default async function InformesEspecialesPage() {
  const editorialArticles = await getEditorialNews(20);

  const featured = editorialArticles[0];
  const secondary = editorialArticles.slice(1, 4);
  const rest = editorialArticles.slice(4);

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary dark:text-white">
                Informes Especiales
              </h1>
              <p className="text-sm text-text-muted dark:text-slate-400">
                Informes especiales y análisis exclusivo de nuestra redacción
              </p>
            </div>
          </div>
        </header>

        {editorialArticles.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
              Próximamente
            </h2>
            <p className="text-text-secondary max-w-md mx-auto">
              Nuestro equipo está preparando análisis e informes especiales. Muy pronto encontrarás contenido aquí.
            </p>
            <Link 
              href="/noticias" 
              className="inline-flex items-center gap-1 text-accent hover:underline mt-4 text-sm"
            >
              Ir a Noticias <ChevronRight className="w-4 h-4" />
            </Link>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Featured Article */}
            {featured && (
              <Link href={`/noticias/${featured.slug}`} className="group block">
                <Card className="overflow-hidden border-2 border-amber-400/30 hover:border-amber-400/60 transition-all hover:shadow-xl">
                  <div className="grid md:grid-cols-2">
                    <div className="relative aspect-video md:aspect-auto min-h-[250px] overflow-hidden">
                      <Image
                        src={featured.imageUrl}
                        alt={featured.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="50vw"
                        priority
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Destacado
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col justify-center">
                      <Badge variant="accent" size="sm" className="w-fit mb-3">
                        {featured.category}
                      </Badge>
                      <h2 className="text-xl font-bold text-text-primary dark:text-white group-hover:text-amber-600 transition-colors mb-3 line-clamp-3">
                        {featured.title}
                      </h2>
                      <p className="text-sm text-text-secondary line-clamp-3 mb-4">
                        {featured.excerpt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Pen className="w-3 h-3 text-amber-500" />
                        <span className="font-medium text-amber-600">
                          {featured.author || 'Redacción RF'}
                        </span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(featured.publishedAt).toLocaleDateString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {/* Secondary Articles */}
            {secondary.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {secondary.map((article) => (
                  <Link key={article.id} href={`/noticias/${article.slug}`} className="group block">
                    <Card className="overflow-hidden h-full border-l-4 border-l-amber-400 hover:shadow-lg transition-all">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="33vw"
                        />
                      </div>
                      <div className="p-4">
                        <Badge variant="accent" size="sm" className="mb-2">
                          {article.category}
                        </Badge>
                        <h3 className="text-sm font-semibold text-text-primary dark:text-white group-hover:text-amber-600 line-clamp-2 transition-colors mb-2">
                          {article.title}
                        </h3>
                        <p className="text-xs text-text-muted line-clamp-2 mb-2">
                          {article.excerpt}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock className="w-3 h-3" />
                          {new Date(article.publishedAt).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Rest of Articles */}
            {rest.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-text-primary dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  Más Análisis
                </h2>
                <div className="space-y-3">
                  {rest.map((article) => (
                    <Link key={article.id} href={`/noticias/${article.slug}`} className="group block">
                      <Card className="p-4 hover:shadow-md transition-all">
                        <div className="flex gap-4">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={article.imageUrl}
                              alt={article.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-text-primary dark:text-white group-hover:text-accent line-clamp-2 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-xs text-text-muted line-clamp-1 mt-1">
                              {article.excerpt}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                              <Badge variant="accent" size="sm">{article.category}</Badge>
                              <span>•</span>
                              <Clock className="w-3 h-3" />
                              {new Date(article.publishedAt).toLocaleDateString('es-AR')}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
