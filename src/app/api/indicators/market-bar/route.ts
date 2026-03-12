import { NextResponse } from 'next/server';
import { getMarketOverview } from '@/lib/services/indicator-service';
import { getMarketSummary } from '@/lib/services/byma-service';
import { fetchRiesgoPais } from '@/lib/services/connectors/argentina-datos';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [overview, marketSummary, riesgoPais] = await Promise.all([
      getMarketOverview(),
      getMarketSummary(),
      fetchRiesgoPais(),
    ]);

    return NextResponse.json({
      dollarQuotes: overview.dollarQuotes,
      dollarMetrics: overview.dollarMetrics,
      riesgoPais,
      mervalIndex: marketSummary?.indices?.[0] ?? null,
      lastUpdated: overview.lastUpdated,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching market bar data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del mercado' },
      { status: 500 }
    );
  }
}
