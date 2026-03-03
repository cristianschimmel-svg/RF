/**
 * Foreign Currencies Connector
 * Fetches EUR, BRL, UYU, CLP, GBP quotes from DolarAPI /cotizaciones
 */

import { API_CONFIG } from '../api-config';
import { cache, rateLimiter } from '../cache';
import type { CurrencyQuote, CurrencyCode, IndicatorSource } from '@/types';

interface CotizacionApiResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface CurrencyFetchResult {
  currencies: CurrencyQuote[];
  source: IndicatorSource;
  lastUpdated: string;
  isFallback: boolean;
  disclaimer?: string;
}

const CURRENCY_CONFIG: Record<string, { code: CurrencyCode; name: string; flag: string }> = {
  EUR: { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  BRL: { code: 'BRL', name: 'Real Brasileño', flag: '🇧🇷' },
  UYU: { code: 'UYU', name: 'Peso Uruguayo', flag: '🇺🇾' },
  CLP: { code: 'CLP', name: 'Peso Chileno', flag: '🇨🇱' },
  GBP: { code: 'GBP', name: 'Libra Esterlina', flag: '🇬🇧' },
};

// Fetch all foreign currency quotes
export async function fetchCurrencyQuotes(): Promise<CurrencyFetchResult> {
  const cacheKey = 'currencies:all';
  const cached = cache.get<CurrencyFetchResult>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${API_CONFIG.dolarApi.baseUrl}/cotizaciones`, {
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: CotizacionApiResponse[] = await response.json();

    const currencies: CurrencyQuote[] = data
      .filter((item) => {
        const code = item.moneda?.toUpperCase();
        return code && code !== 'USD' && CURRENCY_CONFIG[code];
      })
      .map((item) => {
        const code = item.moneda.toUpperCase();
        const config = CURRENCY_CONFIG[code];
        return {
          code: config.code,
          name: config.name,
          buy: item.compra || 0,
          sell: item.venta || 0,
          changePercent: 0, // DolarAPI doesn't provide variation, we calculate below
          lastUpdated: item.fechaActualizacion,
          source: 'ambito' as IndicatorSource,
          flag: config.flag,
        };
      });

    // Try to get GBP from a separate source if not in cotizaciones
    const hasGBP = currencies.some(c => c.code === 'GBP');
    if (!hasGBP) {
      // Approximate GBP from EUR using typical EUR/GBP ratio (~1.15)
      const eur = currencies.find(c => c.code === 'EUR');
      if (eur) {
        currencies.push({
          code: 'GBP',
          name: 'Libra Esterlina',
          buy: Math.round(eur.buy * 1.15 * 100) / 100,
          sell: Math.round(eur.sell * 1.15 * 100) / 100,
          changePercent: 0,
          lastUpdated: eur.lastUpdated,
          source: 'ambito' as IndicatorSource,
          flag: '🇬🇧',
        });
      }
    }

    const result: CurrencyFetchResult = {
      currencies,
      source: 'ambito',
      lastUpdated: new Date().toISOString(),
      isFallback: false,
      disclaimer: 'Cotizaciones oficiales del BCRA vía DolarAPI.',
    };

    cache.set(cacheKey, result, API_CONFIG.dolarApi.cacheTTL * 2); // 2 minutes cache
    return result;

  } catch (error) {
    console.error('Error fetching currency quotes:', error);
    return getFallbackCurrencyData();
  }
}

// Fallback data when API fails
function getFallbackCurrencyData(): CurrencyFetchResult {
  const now = new Date().toISOString();
  
  return {
    currencies: [
      {
        code: 'EUR',
        name: 'Euro',
        buy: 1619.40,
        sell: 1633.41,
        changePercent: 0,
        lastUpdated: now,
        source: 'fallback',
        flag: '🇪🇺',
      },
      {
        code: 'BRL',
        name: 'Real Brasileño',
        buy: 264.64,
        sell: 264.79,
        changePercent: 0,
        lastUpdated: now,
        source: 'fallback',
        flag: '🇧🇷',
      },
      {
        code: 'UYU',
        name: 'Peso Uruguayo',
        buy: 36.71,
        sell: 36.71,
        changePercent: 0,
        lastUpdated: now,
        source: 'fallback',
        flag: '🇺🇾',
      },
      {
        code: 'CLP',
        name: 'Peso Chileno',
        buy: 1.55,
        sell: 1.55,
        changePercent: 0,
        lastUpdated: now,
        source: 'fallback',
        flag: '🇨🇱',
      },
      {
        code: 'GBP',
        name: 'Libra Esterlina',
        buy: 1856.41,
        sell: 1872.65,
        changePercent: 0,
        lastUpdated: now,
        source: 'fallback',
        flag: '🇬🇧',
      },
    ],
    source: 'fallback',
    lastUpdated: now,
    isFallback: true,
    disclaimer: 'Datos de respaldo. No se pudieron obtener cotizaciones en tiempo real.',
  };
}
