/**
 * Clipping System Keywords API
 * GET  /api/clipping/keywords — Get current keywords by category (DB or defaults)
 * PUT  /api/clipping/keywords — Update keywords by category (saves to DB, invalidates cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';
import {
  ClippingCategory,
  CLIPPING_CATEGORIES,
  getKeywordsFromDB,
  saveKeywordsToDB,
  DEFAULT_KEYWORDS_BY_CATEGORY,
} from '@/lib/services/clipping/a3-keywords';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('clipping-token')?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { valid } = verifyClippingToken(token);
  if (!valid) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    const keywords = await getKeywordsFromDB();
    return NextResponse.json({
      success: true,
      keywords,
      defaults: DEFAULT_KEYWORDS_BY_CATEGORY,
    });
  } catch (error) {
    console.error('[ClippingKeywords] GET error:', error);
    return NextResponse.json({ error: 'Error al obtener keywords' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { valid } = verifyClippingToken(token);
  if (!valid) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    const body = await request.json();
    const { keywords } = body;

    if (!keywords || typeof keywords !== 'object') {
      return NextResponse.json({ error: 'Formato inválido: se espera { keywords: Record<category, string[]> }' }, { status: 400 });
    }

    // Validate structure
    const cleaned: Record<ClippingCategory, string[]> = {} as Record<ClippingCategory, string[]>;
    for (const cat of CLIPPING_CATEGORIES) {
      if (!Array.isArray(keywords[cat])) {
        return NextResponse.json({ error: `Categoría "${cat}" debe ser un array de strings` }, { status: 400 });
      }
      cleaned[cat] = keywords[cat]
        .map((k: unknown) => String(k).trim().toLowerCase())
        .filter((k: string) => k.length > 0 && k.length <= 100);
    }

    await saveKeywordsToDB(cleaned);

    console.log('[ClippingKeywords] Keywords updated successfully');
    return NextResponse.json({ success: true, keywords: cleaned });
  } catch (error) {
    console.error('[ClippingKeywords] PUT error:', error);
    return NextResponse.json({ error: 'Error al guardar keywords' }, { status: 500 });
  }
}
