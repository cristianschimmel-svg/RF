import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { invalidateNewsCache } from '@/lib/services/news-service';
import { z } from 'zod';

const articleSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200),
  slug: z.string().min(1, 'El slug es requerido').max(200),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable().or(z.literal('')),
  categoryId: z.string().uuid().optional().nullable().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']),
  publishedAt: z.string().datetime().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  // SEO fields
  metaTitle: z.string().max(70).optional().nullable().or(z.literal('')),
  metaDescription: z.string().max(160).optional().nullable().or(z.literal('')),
  ogImage: z.string().optional().nullable().or(z.literal('')),
  keywords: z.string().max(500).optional().nullable().or(z.literal('')),
  canonicalUrl: z.string().optional().nullable().or(z.literal('')),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        category: true,
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = articleSchema.parse(body);

    // Check if article exists
    const existingArticle = await prisma.article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Check if slug is unique (excluding current article)
    if (data.slug !== existingArticle.slug) {
      const slugExists = await prisma.article.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { errors: { slug: 'Este slug ya está en uso' } },
          { status: 400 }
        );
      }
    }

    // Update article
    const article = await prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: data.content || null,
        coverImage: data.coverImage || null,
        categoryId: data.categoryId || null,
        status: data.status,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        ogImage: data.ogImage || null,
        keywords: data.keywords || null,
        canonicalUrl: data.canonicalUrl || null,
        tags: {
          deleteMany: {},
          create: data.tagIds?.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })) || [],
        },
      },
      include: {
        category: true,
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    // Invalidate cache so changes appear immediately
    invalidateNewsCache();

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((e) => {
        if (e.path[0]) {
          errors[e.path[0].toString()] = e.message;
        }
      });
      return NextResponse.json({ errors }, { status: 400 });
    }

    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Artículo no encontrado' },
        { status: 404 }
      );
    }

    // Delete article (cascade will delete tags)
    await prisma.article.delete({
      where: { id },
    });

    // Invalidate cache so deletion is reflected immediately
    invalidateNewsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
