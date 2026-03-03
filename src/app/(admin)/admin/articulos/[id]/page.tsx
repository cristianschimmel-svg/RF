import { notFound } from 'next/navigation';
import { requireEditor } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ArticleEditor } from '@/components/admin/article-editor';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticuloPage({ params }: PageProps) {
  const user = await requireEditor();
  const { id } = await params;

  const [article, categories, tags] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        status: true,
        publishedAt: true,
        categoryId: true,
        metaTitle: true,
        metaDescription: true,
        ogImage: true,
        keywords: true,
        canonicalUrl: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!article) {
    notFound();
  }

  return (
    <ArticleEditor
      user={user}
      article={article}
      categories={categories}
      tags={tags}
    />
  );
}
