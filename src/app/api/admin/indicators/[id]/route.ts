import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, 'Solo mayúsculas, números y guiones bajos').optional(),
  name: z.string().min(1).max(200).optional(),
  shortName: z.string().min(1).max(50).optional(),
  category: z.enum(['cambios', 'tasas', 'inflacion', 'actividad', 'mercados', 'agro', 'cripto', 'energia']).optional(),
  value: z.number().optional(),
  previousValue: z.number().nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
  source: z.string().min(1).max(200).optional(),
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireEditorSession();
  if (error) return error;

  const { id } = params;

  try {
    const existing = await prisma.manualIndicator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Indicador no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    // If code changed, check uniqueness
    if (data.code && data.code !== existing.code) {
      const codeInUse = await prisma.manualIndicator.findUnique({
        where: { code: data.code },
      });
      if (codeInUse) {
        return NextResponse.json(
          { errors: { code: 'Este código ya está en uso' } },
          { status: 400 }
        );
      }
    }

    // Store previous value when value changes
    const updateData: Record<string, unknown> = {
      ...data,
      sourceUrl: data.sourceUrl || null,
      lastUpdatedBy: session!.user.id,
    };

    if (data.value !== undefined && data.value !== existing.value) {
      updateData.previousValue = existing.value;
    }

    const indicator = await prisma.manualIndicator.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(indicator);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      err.errors.forEach((e) => {
        const field = e.path.join('.');
        errors[field] = e.message;
      });
      return NextResponse.json({ errors }, { status: 400 });
    }
    console.error('Error updating indicator:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireEditorSession();
  if (error) return error;

  const { id } = params;

  try {
    const existing = await prisma.manualIndicator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Indicador no encontrado' }, { status: 404 });
    }

    await prisma.manualIndicator.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting indicator:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
