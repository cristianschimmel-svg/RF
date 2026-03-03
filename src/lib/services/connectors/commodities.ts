/**
 * Commodities Connector
 * Real-time agricultural and energy commodity prices from Yahoo Finance
 * Uses futures contract tickers (CBOT, NYMEX, COMEX)
 */

import { cache } from '../cache';
import type { Indicator, IndicatorSource } from '@/types';

interface CommoditiesResult {
  indicators: Indicator[];
  source: IndicatorSource;
  lastUpdated: string;
  isFallback: boolean;
  disclaimer?: string;
}

// Yahoo Finance futures tickers and their metadata
const COMMODITY_TICKERS = {
  soja: {
    ticker: 'ZS=F',
    name: 'Soja (Chicago/CBOT)',
    shortName: 'Soja (CBOT)',
    category: 'agro' as const,
    unit: 'USd/bu',       // cents per bushel (native Yahoo unit)
    displayUnit: 'USD/tn', // we convert to USD per metric ton
    market: 'CBOT',
    // 1 bushel soja = 27.2155 kg → 1 tn = 36.7437 bushels
    bushelPerTon: 36.7437,
    convertFromCents: true,
  },
  maiz: {
    ticker: 'ZC=F',
    name: 'Maíz (Chicago/CBOT)',
    shortName: 'Maíz (CBOT)',
    category: 'agro' as const,
    unit: 'USd/bu',
    displayUnit: 'USD/tn',
    market: 'CBOT',
    // 1 bushel maíz = 25.4012 kg → 1 tn = 39.3679 bushels
    bushelPerTon: 39.3679,
    convertFromCents: true,
  },
  trigo: {
    ticker: 'ZW=F',
    name: 'Trigo (Chicago/CBOT)',
    shortName: 'Trigo (CBOT)',
    category: 'agro' as const,
    unit: 'USd/bu',
    displayUnit: 'USD/tn',
    market: 'CBOT',
    // 1 bushel trigo = 27.2155 kg → 1 tn = 36.7437 bushels
    bushelPerTon: 36.7437,
    convertFromCents: true,
  },
  aceite_soja: {
    ticker: 'ZL=F',
    name: 'Aceite de Soja (Chicago/CBOT)',
    shortName: 'Ac. Soja (CBOT)',
    category: 'agro' as const,
    unit: 'USd/lb',
    displayUnit: 'USD/tn',
    market: 'CBOT',
    // 1 lb = 0.453592 kg → 1 tn = 2204.62 lbs
    // Yahoo quotes in cents per pound
    bushelPerTon: 2204.62,
    convertFromCents: true,
  },
  petroleo: {
    ticker: 'CL=F',
    name: 'Petróleo WTI',
    shortName: 'WTI',
    category: 'energia' as const,
    unit: 'USD/bbl',
    displayUnit: 'USD/bbl',
    market: 'NYMEX',
    bushelPerTon: null as number | null,
    convertFromCents: false,
  },
  oro: {
    ticker: 'GC=F',
    name: 'Oro COMEX',
    shortName: 'Oro',
    category: 'energia' as const,
    unit: 'USD/oz',
    displayUnit: 'USD/oz',
    market: 'COMEX',
    bushelPerTon: null as number | null,
    convertFromCents: false,
  },
};

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

/**
 * Fetch a single commodity quote from Yahoo Finance
 */
async function fetchYahooQuote(
  id: string,
  config: typeof COMMODITY_TICKERS[keyof typeof COMMODITY_TICKERS]
): Promise<Indicator | null> {
  try {
    const encodedTicker = encodeURIComponent(config.ticker);
    const response = await fetch(
      `${YAHOO_BASE_URL}/${encodedTicker}?interval=1d&range=5d`,
      {
        headers: YAHOO_HEADERS,
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      console.error(`Yahoo Finance error for ${config.ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.error(`No data in Yahoo response for ${config.ticker}`);
      return null;
    }

    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose;

    if (!currentPrice || !previousClose) {
      console.error(`Missing price data for ${config.ticker}`);
      return null;
    }

    // Convert to display units
    let displayValue: number;
    let displayPrev: number;

    if (config.bushelPerTon && config.convertFromCents) {
      // Convert from cents/bushel (or cents/lb) to USD/ton
      displayValue = (currentPrice / 100) * config.bushelPerTon;
      displayPrev = (previousClose / 100) * config.bushelPerTon;
    } else {
      displayValue = currentPrice;
      displayPrev = previousClose;
    }

    const change = Math.round((displayValue - displayPrev) * 100) / 100;
    const changePercent = displayPrev > 0
      ? Math.round(((displayValue - displayPrev) / displayPrev) * 10000) / 100
      : 0;

    console.log(`✅ ${config.name}: $${displayValue.toFixed(2)} ${config.displayUnit} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);

    return {
      id: `commodity-${id}`,
      name: config.name,
      shortName: config.shortName,
      category: config.category,
      value: Math.round(displayValue * 100) / 100,
      previousValue: Math.round(displayPrev * 100) / 100,
      change,
      changePercent,
      unit: config.displayUnit,
      format: 'number',
      decimals: 2,
      source: 'yahoo',
      lastUpdated: new Date().toISOString(),
      frequency: 'realtime',
      isFallback: false,
      metadata: {
        market: config.market,
        ticker: config.ticker,
        rawPrice: currentPrice,
        rawPrevious: previousClose,
        rawUnit: config.unit,
      },
    };
  } catch (error) {
    console.error(`Error fetching ${config.ticker} from Yahoo Finance:`, error);
    return null;
  }
}

/**
 * Main fetch function - fetches all commodities from Yahoo Finance in parallel
 */
export async function fetchCommodities(): Promise<CommoditiesResult> {
  const cacheKey = 'commodities:yahoo:v2';
  const cached = cache.get<CommoditiesResult>(cacheKey);

  if (cached) {
    return cached;
  }

  const now = new Date().toISOString();
  const indicators: Indicator[] = [];
  let fetchedCount = 0;

  // Fetch all commodities in parallel
  const entries = Object.entries(COMMODITY_TICKERS);
  const promises = entries.map(([id, config]) => fetchYahooQuote(id, config));
  const results = await Promise.allSettled(promises);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      indicators.push(result.value);
      fetchedCount++;
    } else {
      const [id] = entries[i];
      console.warn(`⚠️ Could not fetch ${id} from Yahoo Finance`);
    }
  }

  const hasRealData = fetchedCount > 0;
  const allFetched = fetchedCount === entries.length;

  const commoditiesResult: CommoditiesResult = {
    indicators,
    source: hasRealData ? 'yahoo' : 'fallback',
    lastUpdated: now,
    isFallback: !hasRealData,
    disclaimer: !hasRealData
      ? 'No se pudieron obtener cotizaciones. Intente nuevamente en unos minutos.'
      : !allFetched
        ? `Se obtuvieron ${fetchedCount} de ${entries.length} cotizaciones.`
        : undefined,
  };

  // Cache for 5 minutes
  cache.set(cacheKey, commoditiesResult, 300);
  return commoditiesResult;
}

// Utility functions for specific categories
export async function fetchAgroCommodities(): Promise<Indicator[]> {
  const result = await fetchCommodities();
  return result.indicators.filter((i) => i.category === 'agro');
}

export async function fetchEnergyCommodities(): Promise<Indicator[]> {
  const result = await fetchCommodities();
  return result.indicators.filter((i) => i.category === 'energia');
}

export async function getCommodityBySymbol(symbol: string): Promise<Indicator | null> {
  const result = await fetchCommodities();
  return result.indicators.find(
    (i) => i.id === `commodity-${symbol.toLowerCase()}` ||
           i.shortName.toLowerCase() === symbol.toLowerCase()
  ) || null;
}

// Specific commodity getters
export async function getSojaPrice(): Promise<Indicator | null> {
  return getCommodityBySymbol('soja');
}

export async function getMaizPrice(): Promise<Indicator | null> {
  return getCommodityBySymbol('maiz');
}

export async function getTrigoPrice(): Promise<Indicator | null> {
  return getCommodityBySymbol('trigo');
}

export async function getPetroleoPrice(): Promise<Indicator | null> {
  return getCommodityBySymbol('petroleo');
}

export async function getOroPrice(): Promise<Indicator | null> {
  return getCommodityBySymbol('oro');
}
