/**
 * Clipping User Preferences API
 * GET  /api/clipping/preferences — Get user's custom keywords + enabled sources + custom sources
 * PUT  /api/clipping/preferences — Update user's custom keywords + enabled sources + custom sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyClippingToken } from '@/lib/services/clipping/jwt';
import { prisma } from '@/lib/db/prisma';
import { KEYWORDS_BY_CATEGORY } from '@/lib/services/clipping/a3-keywords';
import { getKeywordsFromDB } from '@/lib/services/clipping/a3-keywords';

// Available media source names (matches RSS feed source names)
const AVAILABLE_SOURCES = [
  'Infocampo',
  'Bichos de Campo',
  'Valor Soja',
  'Clarín Rural',
  'Ámbito Economía',
  'Ámbito Finanzas',
  'Ámbito Negocios',
  'La Nación Economía',
  'Clarín Economía',
  'El Cronista Finanzas',
  'El Cronista Economía',
  'Bloomberg Mercados',
  'Bloomberg Economía',
  'Bloomberg Negocios',
  'CriptoNoticias',
];

interface CustomSource {
  name: string;
  feedUrl: string;
}

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('clipping-token')?.value ?? null;
}

export async function GET(request: NextRequest) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { valid, payload } = verifyClippingToken(token);
  if (!valid || !payload?.email) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    const user = await prisma.clippingUser.findUnique({
      where: { email: payload.email as string },
      select: { customKeywords: true, enabledSources: true, customSources: true },
    });

    const dynamicKeywords = await getKeywordsFromDB();

    return NextResponse.json({
      success: true,
      customKeywords: (user?.customKeywords as string[] | null) || [],
      enabledSources: (user?.enabledSources as string[] | null) || [],
      availableSources: AVAILABLE_SOURCES,
      customSources: (user?.customSources as CustomSource[] | null) || [],
      defaultKeywords: dynamicKeywords,
    });
  } catch (error) {
    console.error('[ClippingPreferences] GET error:', error);
    return NextResponse.json({ error: 'Error al obtener preferencias' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { valid, payload } = verifyClippingToken(token);
  if (!valid || !payload?.email) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (Array.isArray(body.customKeywords)) {
      const keywords = body.customKeywords
        .map((k: unknown) => String(k).trim().toLowerCase())
        .filter((k: string) => k.length > 0)
        .slice(0, 100);
      updateData.customKeywords = keywords;
    }

    if (Array.isArray(body.enabledSources)) {
      // Allow known sources + names of custom sources
      const userCustomSources = (body.customSources as CustomSource[] | undefined) || [];
      const customSourceNames = userCustomSources.map((s: CustomSource) => s.name);
      const allValidNames = [...AVAILABLE_SOURCES, ...customSourceNames];
      const sources = body.enabledSources
        .map((s: unknown) => String(s).trim())
        .filter((s: string) => allValidNames.includes(s));
      updateData.enabledSources = sources;
    }

    if (Array.isArray(body.customSources)) {
      // Validate: each item must have name + valid URL, limit to 20
      const customSources: CustomSource[] = body.customSources
        .filter((s: any) => s && typeof s.name === 'string' && typeof s.feedUrl === 'string')
        .map((s: any) => ({
          name: String(s.name).trim().slice(0, 100),
          feedUrl: String(s.feedUrl).trim().slice(0, 500),
        }))
        .filter((s: CustomSource) => {
          if (!s.name || !s.feedUrl) return false;
          try { new URL(s.feedUrl); return true; } catch { return false; }
        })
        .slice(0, 20);
      updateData.customSources = customSources;
    }

    const user = await prisma.clippingUser.update({
      where: { email: payload.email as string },
      data: updateData,
      select: { customKeywords: true, enabledSources: true, customSources: true },
    });

    return NextResponse.json({
      success: true,
      customKeywords: (user.customKeywords as string[] | null) || [],
      enabledSources: (user.enabledSources as string[] | null) || [],
      customSources: (user.customSources as CustomSource[] | null) || [],
    });
  } catch (error) {
    console.error('[ClippingPreferences] PUT error:', error);
    return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 });
  }
}
