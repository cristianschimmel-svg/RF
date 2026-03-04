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
  categoryId: z.string().min(1).optional().nullable().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED']),
  publishedAt: z.string().datetime().optional().nullable(),
  tagIds: z.array(z.string().min(1)).optional(),
  // SEO fields
  metaTitle: z.string().max(70).optional().nullable().or(z.literal('')),
  metaDescription: z.string().max(160).optional().nullable().or(z.literal('')),
  ogImage: z.string().optional().nullable().or(z.literal('')),
  keywords: z.string().max(500).optional().nullable().or(z.literal('')),
  canonicalUrl: z.string().optional().nullable().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = articleSchema.parse(body);

    // Check if slug already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug: data.slug },
    });

    if (existingArticle) {
      return NextResponse.json(
        { errors: { slug: 'Este slug ya está en uso' } },
        { status: 400 }
      );
    }

    // Create article
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: data.content || null,
        coverImage: data.coverImage || null,
        categoryId: data.categoryId || null,
        status: data.status,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        authorId: session.user.id,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        ogImage: data.ogImage || null,
        keywords: data.keywords || null,
        canonicalUrl: data.canonicalUrl || null,
        tags: data.tagIds?.length
          ? {
              create: data.tagIds.map((tagId) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
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

    // Invalidate news cache so the new article appears immediately
    invalidateNewsCache();

    return NextResponse.json(article, { status: 201 });
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

    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '20');
  const status = searchParams.get('status');
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          category: true,
          author: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { tags: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
