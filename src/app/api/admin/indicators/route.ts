import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const indicatorSchema = z.object({
  code: z.string().min(1, 'El código es requerido').max(100).regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guiones bajos'),
  name: z.string().min(1, 'El nombre es requerido').max(200),
  shortName: z.string().min(1, 'El nombre corto es requerido').max(50),
  category: z.enum(['cambios', 'tasas', 'inflacion', 'actividad', 'mercados', 'agro', 'cripto', 'energia']),
  value: z.number({ invalid_type_error: 'El valor debe ser un número' }),
  previousValue: z.number().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  source: z.string().min(1, 'La fuente es requerida').max(200),
  sourceUrl: z.string().url('URL inválida').nullable().optional().or(z.literal('')),
  disclaimer: z.string().max(500).nullable().optional(),
});

async function requireEditorSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }), session: null };
  }
  if (!['ADMIN', 'EDITOR'].includes(session.user.role)) {
    return { error: NextResponse.json({ error: 'Prohibido' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

export async function GET() {
  const { error } = await requireEditorSession();
  if (error) return error;

  const indicators = await prisma.manualIndicator.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json(indicators);
}

export async function POST(request: NextRequest) {
  const { error, session } = await requireEditorSession();
  if (error) return error;

  try {
    const body = await request.json();
    const data = indicatorSchema.parse(body);

    const existing = await prisma.manualIndicator.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { errors: { code: 'Este código ya está en uso' } },
        { status: 400 }
      );
    }

    const indicator = await prisma.manualIndicator.create({
      data: {
        code: data.code,
        name: data.name,
        shortName: data.shortName,
        category: data.category,
        value: data.value,
        previousValue: data.previousValue ?? null,
        unit: data.unit || null,
        source: data.source,
        sourceUrl: data.sourceUrl || null,
        disclaimer: data.disclaimer || null,
        lastUpdatedBy: session!.user.id,
      },
    });

    return NextResponse.json(indicator, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      err.errors.forEach((e) => {
        const field = e.path.join('.');
        errors[field] = e.message;
      });
      return NextResponse.json({ errors }, { status: 400 });
    }
    console.error('Error creating indicator:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
