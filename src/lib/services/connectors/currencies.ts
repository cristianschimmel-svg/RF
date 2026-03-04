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

    // Only show GBP if the API actually returns it — never approximate
    // DolarAPI may not include GBP; in that case we simply omit it

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

// Empty result when API fails — never return invented data
function getFallbackCurrencyData(): CurrencyFetchResult {
  return {
    currencies: [],
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    isFallback: true,
    disclaimer: 'Sin datos disponibles. No se pudo conectar con la API de cotizaciones.',
  };
}
