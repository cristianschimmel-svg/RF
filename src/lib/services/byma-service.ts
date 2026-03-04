/**
 * BYMA Market Data Service
 * Fetches real-time data from BYMA (Bolsas y Mercados Argentinos)
 * S&P Merval, S&P BYMA Indice General, and stock data
 */

import { cache } from './cache';

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: Date;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: Date;
}

export interface MarketSummary {
  indices: MarketIndex[];
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  mostActive: StockQuote[];
  totalVolume: number;
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours';
  lastUpdate: Date;
  isFallback?: boolean;
  disclaimer?: string;
}

export interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Alternative APIs for market data (BYMA requires auth)
const API_CONFIG = {
  // Yahoo Finance for MERVAL (^MERV)
  yahoo: {
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    symbols: {
      MERVAL: '%5EMERV', // ^MERV encoded
    },
  },
  // RAVA Bursátil for Argentine stocks
  rava: {
    baseUrl: 'https://clasico.rava.com/lib/restapi/v3',
    endpoints: {
      cotizaciones: '/publico/cotizaciones/argentina',
      panelLider: '/publico/cotizaciones/panel/argentina/lider',
    },
  },
  cacheTTL: 60 * 2, // 2 minutes cache
};

// Empty fallback data — never return invented market data
const FALLBACK_DATA: MarketSummary = {
  indices: [],
  topGainers: [],
  topLosers: [],
  mostActive: [],
  totalVolume: 0,
  marketStatus: 'closed',
  lastUpdate: new Date(),
  isFallback: true,
  disclaimer: 'Sin datos disponibles. No se pudo conectar con el mercado.',
};

/**
 * Parse BYMA number format (1.234.567,89 → 1234567.89)
 */
function parseBymaNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove thousand separators (.) and replace decimal comma with dot
  return parseFloat(value.toString().replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Get current market status based on Argentina time
 */
function getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
  const now = new Date();
  // Argentina is UTC-3
  const argentinaOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const argentinaTime = new Date(utcTime + argentinaOffset * 60000);
  
  const hours = argentinaTime.getHours();
  const minutes = argentinaTime.getMinutes();
  const day = argentinaTime.getDay();
  
  // Market closed on weekends
  if (day === 0 || day === 6) return 'closed';
  
  // Pre-market: 9:00 - 11:00
  if (hours >= 9 && hours < 11) return 'pre-market';
  
  // Market open: 11:00 - 17:00
  if (hours >= 11 && hours < 17) return 'open';
  
  // After hours: 17:00 - 18:00
  if (hours >= 17 && hours < 18) return 'after-hours';
  
  return 'closed';
}

/**
 * Fetch MERVAL index from Yahoo Finance
 */
async function fetchMervalFromYahoo(): Promise<MarketIndex | null> {
  try {
    const response = await fetch(
      `${API_CONFIG.yahoo.baseUrl}/${API_CONFIG.yahoo.symbols.MERVAL}?interval=1d&range=1d`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: API_CONFIG.cacheTTL },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result) {
      throw new Error('No data in Yahoo Finance response');
    }

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const previousClose = meta.chartPreviousClose || meta.previousClose;
    const currentPrice = meta.regularMarketPrice;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      symbol: 'MERVAL',
      name: 'S&P MERVAL',
      value: currentPrice,
      change: change,
      changePercent: changePercent,
      high: meta.regularMarketDayHigh || quote?.high?.[0] || currentPrice,
      low: meta.regularMarketDayLow || quote?.low?.[0] || currentPrice,
      previousClose: previousClose,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error fetching MERVAL from Yahoo:', error);
    return null;
  }
}

/**
 * Fetch market indices (uses Yahoo Finance + fallback)
 */
async function fetchMarketIndices(): Promise<MarketIndex[]> {
  try {
    const merval = await fetchMervalFromYahoo();
    
    if (merval) {
      // Only return MERVAL — GENERAL index requires a separate real data source
      // Never approximate GENERAL from MERVAL with an invented ratio
      return [merval];
    }

    return FALLBACK_DATA.indices;
  } catch (error) {
    console.error('Error fetching market indices:', error);
    return FALLBACK_DATA.indices;
  }
}

/**
 * BYMA leader stocks with Yahoo Finance symbols
 */
const LEADER_STOCKS = [
  { yahoo: 'GGAL.BA', symbol: 'GGAL', name: 'Grupo Galicia' },
  { yahoo: 'YPFD.BA', symbol: 'YPFD', name: 'YPF S.A.' },
  { yahoo: 'BBAR.BA', symbol: 'BBAR', name: 'BBVA Argentina' },
  { yahoo: 'PAMP.BA', symbol: 'PAMP', name: 'Pampa Energía' },
  { yahoo: 'TXAR.BA', symbol: 'TXAR', name: 'Ternium Argentina' },
  { yahoo: 'ALUA.BA', symbol: 'ALUA', name: 'Aluar' },
  { yahoo: 'TECO2.BA', symbol: 'TECO2', name: 'Telecom Argentina' },
  { yahoo: 'SUPV.BA', symbol: 'SUPV', name: 'Supervielle' },
  { yahoo: 'COME.BA', symbol: 'COME', name: 'Soc. Comercial del Plata' },
  { yahoo: 'CRES.BA', symbol: 'CRES', name: 'Cresud' },
];

/**
 * Fetch a single stock quote from Yahoo Finance
 */
async function fetchStockFromYahoo(yahooSymbol: string, localSymbol: string, name: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `${API_CONFIG.yahoo.baseUrl}/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: API_CONFIG.cacheTTL },
      }
    );
    if (!response.ok) return null;
    
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return {
      symbol: localSymbol,
      name,
      price: currentPrice,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      high: meta.regularMarketDayHigh || currentPrice,
      low: meta.regularMarketDayLow || currentPrice,
      open: meta.regularMarketOpen || currentPrice,
      previousClose,
      timestamp: new Date(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch real leader stocks data from Yahoo Finance (with fallback)
 */
async function fetchLeaderStocksData(): Promise<StockQuote[]> {
  try {
    const promises = LEADER_STOCKS.map(s => fetchStockFromYahoo(s.yahoo, s.symbol, s.name));
    const results = await Promise.allSettled(promises);
    
    const stocks = results
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((s): s is StockQuote => s !== null);

    if (stocks.length >= 3) {
      return stocks;
    }
    
    // Return whatever real stocks we got (even if fewer than 3)
    return stocks;
  } catch (error) {
    console.error('Error fetching leader stocks:', error);
  }

  // No fallback to invented data — return empty
  return [];
}

/**
 * Get complete market summary
 */
export async function getMarketSummary(): Promise<MarketSummary> {
  const cacheKey = 'byma:market-summary';
  const cached = cache.get<MarketSummary>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const [indices, leaders] = await Promise.all([
      fetchMarketIndices(),
      fetchLeaderStocksData(),
    ]);
    
    // Check if we got real data from Yahoo
    const isRealData = indices.length > 0 && leaders.length > 0;

    // Sort for gainers/losers
    const sortedByChange = [...leaders].sort((a, b) => b.changePercent - a.changePercent);
    const sortedByVolume = [...leaders].sort((a, b) => b.volume - a.volume);

    const summary: MarketSummary = {
      indices,
      topGainers: sortedByChange.filter(s => s.changePercent > 0).slice(0, 5),
      topLosers: sortedByChange.filter(s => s.changePercent < 0).slice(-5).reverse(),
      mostActive: sortedByVolume.slice(0, 5),
      totalVolume: leaders.reduce((sum, s) => sum + s.volume, 0),
      marketStatus: getMarketStatus(),
      lastUpdate: new Date(),
      isFallback: !isRealData,
      disclaimer: !isRealData ? '⚠️ Datos de referencia. Valores de acciones son simulados.' : undefined,
    };

    cache.set(cacheKey, summary, API_CONFIG.cacheTTL);
    return summary;
  } catch (error) {
    console.error('Error getting market summary:', error);
    return {
      ...FALLBACK_DATA,
      marketStatus: getMarketStatus(),
      lastUpdate: new Date(),
      isFallback: true,
      disclaimer: '⚠️ Datos de referencia. No se pudo conectar con el mercado.',
    };
  }
}

/**
 * Fetch historical data from Yahoo Finance
 */
async function fetchYahooHistorical(
  symbol: string,
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD'
): Promise<HistoricalData[] | null> {
  try {
    const rangeMap: Record<string, string> = {
      '1D': '1d',
      '1W': '5d',
      '1M': '1mo',
      '3M': '3mo',
      '1Y': '1y',
      'YTD': 'ytd',
    };
    
    const intervalMap: Record<string, string> = {
      '1D': '5m',
      '1W': '15m',
      '1M': '1d',
      '3M': '1d',
      '1Y': '1wk',
      'YTD': '1d',
    };

    const yahooSymbol = symbol === 'MERVAL' ? API_CONFIG.yahoo.symbols.MERVAL : '%5EMERV';
    const range = rangeMap[period] || '1mo';
    const interval = intervalMap[period] || '1d';

    const response = await fetch(
      `${API_CONFIG.yahoo.baseUrl}/${yahooSymbol}?interval=${interval}&range=${range}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        next: { revalidate: period === '1D' ? 60 : 300 },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) {
      return null;
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    const historicalData: HistoricalData[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      if (quote.close[i] !== null) {
        historicalData.push({
          date: new Date(timestamps[i] * 1000),
          open: quote.open[i] || quote.close[i],
          high: quote.high[i] || quote.close[i],
          low: quote.low[i] || quote.close[i],
          close: quote.close[i],
          volume: quote.volume[i] || 0,
        });
      }
    }

    return historicalData.length > 0 ? historicalData : null;
  } catch (error) {
    console.error('Error fetching Yahoo historical:', error);
    return null;
  }
}

/**
 * Get specific index data
 */
export async function getIndexData(symbol: 'MERVAL' | 'GENERAL'): Promise<MarketIndex | null> {
  const summary = await getMarketSummary();
  return summary.indices.find(i => i.symbol === symbol) || null;
}

/**
 * Get historical data for an index
 * Tries Yahoo Finance first, falls back to generated data
 */
export async function getIndexHistorical(
  symbol: string,
  period: '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD' = '1M'
): Promise<HistoricalData[]> {
  const cacheKey = `byma:historical:${symbol}:${period}`;
  const cached = cache.get<HistoricalData[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Try Yahoo Finance first
  if (symbol === 'MERVAL') {
    const yahooData = await fetchYahooHistorical(symbol, period);
    if (yahooData && yahooData.length > 0) {
      cache.set(cacheKey, yahooData, period === '1D' ? 60 : 60 * 60);
      return yahooData;
    }
  }

  // No fallback — never generate mock historical data
  return [];
}

/**
 * Get leader stocks list
 */
export async function getLeaderStocks(): Promise<StockQuote[]> {
  const summary = await getMarketSummary();
  return [...summary.topGainers, ...summary.topLosers, ...summary.mostActive]
    .filter((stock, index, self) => 
      index === self.findIndex(s => s.symbol === stock.symbol)
    );
}

/**
 * Format index value for display (2.918.925,84)
 */
export function formatIndexValue(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format variation percentage
 */
export function formatVariation(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
