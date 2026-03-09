/**
 * Indicator Service
 * Unified service for fetching and aggregating all financial indicators
 */

import { fetchDollarQuotes, calculateDollarMetrics } from './connectors/dollar';
import { fetchBCRAVariables, getReservas, getInflacion, getTasaPoliticaMonetaria, getBADLAR } from './connectors/bcra';
import { fetchCryptoPrices, getBitcoinPrice, getEthereumPrice } from './connectors/crypto';
import { fetchCommodities, fetchAgroCommodities, getSojaPrice, getMaizPrice, getTrigoPrice } from './connectors/commodities';
import { cache } from './cache';
import type { Indicator, IndicatorGroup, IndicatorCategory, DollarQuote, TickerItem, Trend } from '@/types';

export interface MarketOverview {
  lastUpdated: string;
  ticker: TickerItem[];
  groups: IndicatorGroup[];
  dollarQuotes: DollarQuote[];
  dollarMetrics: ReturnType<typeof calculateDollarMetrics>;
}

// Get complete market overview for home page
export async function getMarketOverview(): Promise<MarketOverview> {
  const cacheKey = 'market:overview';
  const cached = cache.get<MarketOverview>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Fetch all data in parallel
  const [dollarResult, bcraData, cryptoResult, commoditiesResult] = await Promise.all([
    fetchDollarQuotes(),
    fetchBCRAVariables(),
    fetchCryptoPrices(),
    fetchCommodities(),
  ]);

  const dollarMetrics = calculateDollarMetrics(dollarResult.quotes);

  // Build ticker items
  const ticker = buildTickerItems(
    dollarResult.quotes,
    bcraData,
    cryptoResult.indicators,
    commoditiesResult.indicators
  );

  // Build indicator groups
  const groups = buildIndicatorGroups(
    dollarResult.quotes,
    bcraData,
    cryptoResult.indicators,
    commoditiesResult.indicators
  );

  const overview: MarketOverview = {
    lastUpdated: new Date().toISOString(),
    ticker,
    groups,
    dollarQuotes: dollarResult.quotes,
    dollarMetrics,
  };

  cache.set(cacheKey, overview, 60); // Cache for 1 minute
  return overview;
}

// Get indicators by category
export async function getIndicatorsByCategory(category: IndicatorCategory): Promise<Indicator[]> {
  const overview = await getMarketOverview();
  const group = overview.groups.find((g) => g.category === category);
  return group?.indicators || [];
}

// Get specific indicator by ID
export async function getIndicatorById(id: string): Promise<Indicator | null> {
  const overview = await getMarketOverview();
  
  for (const group of overview.groups) {
    const indicator = group.indicators.find((i) => i.id === id);
    if (indicator) return indicator;
  }
  
  return null;
}

// Get ticker data
export async function getTickerData(): Promise<TickerItem[]> {
  const overview = await getMarketOverview();
  return overview.ticker;
}

// Get all dollar quotes
export async function getDollarQuotes(): Promise<{ quotes: DollarQuote[]; metrics: ReturnType<typeof calculateDollarMetrics> }> {
  const dollarResult = await fetchDollarQuotes();
  return {
    quotes: dollarResult.quotes,
    metrics: calculateDollarMetrics(dollarResult.quotes),
  };
}

// Build ticker items from all sources
function buildTickerItems(
  dollars: DollarQuote[],
  bcra: Indicator[],
  crypto: Indicator[],
  commodities: Indicator[]
): TickerItem[] {
  const items: TickerItem[] = [];

  // Dollar quotes (prioritize blue, oficial, mep)
  const dollarOrder = ['oficial', 'blue', 'mep', 'ccl'];
  dollarOrder.forEach((type) => {
    const dollar = dollars.find((d) => d.type === type);
    if (dollar) {
      items.push({
        id: `ticker-dolar-${type}`,
        label: dollar.name.replace('Dólar ', 'USD '),
        value: `$${dollar.sell.toLocaleString('es-AR')}`,
        change: dollar.changePercent ? `${dollar.changePercent > 0 ? '+' : ''}${dollar.changePercent.toFixed(1)}%` : undefined,
        trend: getTrend(dollar.changePercent),
      });
    }
  });

  // Key BCRA indicators
  const inflacion = bcra.find((i) => i.id.includes('27') || i.shortName.toLowerCase().includes('inflación'));
  if (inflacion) {
    items.push({
      id: 'ticker-inflacion',
      label: 'Inflación',
      value: inflacion.noData ? 'No disp.' : `${inflacion.value.toFixed(1)}%`,
      change: inflacion.noData ? undefined : (inflacion.changePercent ? `${inflacion.changePercent > 0 ? '+' : ''}${inflacion.changePercent.toFixed(1)}%` : undefined),
      trend: inflacion.noData ? 'neutral' : getTrend(-inflacion.changePercent), // Negative is good for inflation
    });
  }

  const reservas = bcra.find((i) => i.id.includes('1') || i.shortName.toLowerCase().includes('reservas'));
  if (reservas) {
    items.push({
      id: 'ticker-reservas',
      label: 'Reservas',
      value: `$${(reservas.value / 1e9).toFixed(1)}B`,
      change: reservas.changePercent ? `${reservas.changePercent > 0 ? '+' : ''}${reservas.changePercent.toFixed(1)}%` : undefined,
      trend: getTrend(reservas.changePercent),
    });
  }

  // Crypto
  const btc = crypto.find((i) => i.shortName === 'BTC');
  const eth = crypto.find((i) => i.shortName === 'ETH');
  
  if (btc) {
    items.push({
      id: 'ticker-btc',
      label: 'BTC',
      value: `$${btc.value.toLocaleString('en-US')}`,
      change: `${btc.changePercent > 0 ? '+' : ''}${btc.changePercent.toFixed(1)}%`,
      trend: getTrend(btc.changePercent),
    });
  }
  
  if (eth) {
    items.push({
      id: 'ticker-eth',
      label: 'ETH',
      value: `$${eth.value.toLocaleString('en-US')}`,
      change: `${eth.changePercent > 0 ? '+' : ''}${eth.changePercent.toFixed(1)}%`,
      trend: getTrend(eth.changePercent),
    });
  }

  // Commodities
  const soja = commodities.find((i) => i.shortName.toLowerCase().includes('soja'));
  const maiz = commodities.find((i) => i.shortName.toLowerCase().includes('maíz'));
  
  if (soja) {
    items.push({
      id: 'ticker-soja',
      label: 'Soja (CBOT)',
      value: `$${soja.value.toFixed(0)}`,
      change: `${soja.changePercent > 0 ? '+' : ''}${soja.changePercent.toFixed(1)}%`,
      trend: getTrend(soja.changePercent),
    });
  }
  
  if (maiz) {
    items.push({
      id: 'ticker-maiz',
      label: 'Maíz (CBOT)',
      value: `$${maiz.value.toFixed(0)}`,
      change: `${maiz.changePercent > 0 ? '+' : ''}${maiz.changePercent.toFixed(1)}%`,
      trend: getTrend(maiz.changePercent),
    });
  }

  return items;
}

// Build indicator groups by category
function buildIndicatorGroups(
  dollars: DollarQuote[],
  bcra: Indicator[],
  crypto: Indicator[],
  commodities: Indicator[]
): IndicatorGroup[] {
  const groups: IndicatorGroup[] = [];

  // Cambios (Dollar/Exchange)
  groups.push({
    id: 'group-cambios',
    name: 'Tipo de Cambio',
    category: 'cambios',
    description: 'Cotizaciones del dólar en sus distintas variantes',
    indicators: dollars.map((d) => dollarToIndicator(d)),
  });

  // Inflación & Precios
  const inflacionIndicators = bcra.filter(
    (i) => i.category === 'inflacion' || i.shortName.toLowerCase().includes('uva') || i.shortName.toLowerCase().includes('cer')
  );
  if (inflacionIndicators.length > 0) {
    groups.push({
      id: 'group-inflacion',
      name: 'Inflación & Precios',
      category: 'inflacion',
      description: 'Indicadores de inflación y coeficientes de ajuste',
      indicators: inflacionIndicators,
    });
  }

  // Tasas
  const tasasIndicators = bcra.filter(
    (i) => i.category === 'tasas' || i.shortName.toLowerCase().includes('tasa') || i.shortName.toLowerCase().includes('badlar')
  );
  if (tasasIndicators.length > 0) {
    groups.push({
      id: 'group-tasas',
      name: 'Tasas de Interés',
      category: 'tasas',
      description: 'Tasas de referencia del sistema financiero',
      indicators: tasasIndicators,
    });
  }

  // Actividad
  const actividadIndicators = bcra.filter(
    (i) => i.category === 'actividad' || i.shortName.toLowerCase().includes('reservas') || i.shortName.toLowerCase().includes('base')
  );
  if (actividadIndicators.length > 0) {
    groups.push({
      id: 'group-actividad',
      name: 'Actividad Económica',
      category: 'actividad',
      description: 'Indicadores macroeconómicos',
      indicators: actividadIndicators,
    });
  }

  // Riesgo País
  const riesgoIndicators = bcra.filter(
    (i) => i.category === 'riesgo' || i.shortName.toLowerCase().includes('embi') || i.shortName.toLowerCase().includes('riesgo')
  );
  if (riesgoIndicators.length > 0) {
    groups.push({
      id: 'group-riesgo',
      name: 'Riesgo País',
      category: 'riesgo',
      description: 'Índice EMBI+ de JP Morgan',
      indicators: riesgoIndicators,
    });
  }

  // Cripto
  if (crypto.length > 0) {
    groups.push({
      id: 'group-cripto',
      name: 'Criptomonedas',
      category: 'cripto',
      description: 'Precios de principales criptoactivos',
      indicators: crypto,
    });
  }

  // Agro
  const agroIndicators = commodities.filter((c) => c.category === 'agro');
  if (agroIndicators.length > 0) {
    groups.push({
      id: 'group-agro',
      name: 'Agro & Commodities',
      category: 'agro',
      description: 'Precios de granos y commodities agrícolas',
      indicators: agroIndicators,
    });
  }

  // Energía
  const energiaIndicators = commodities.filter((c) => c.category === 'energia');
  if (energiaIndicators.length > 0) {
    groups.push({
      id: 'group-energia',
      name: 'Energía & Metales',
      category: 'energia',
      description: 'Petróleo, gas y metales preciosos',
      indicators: energiaIndicators,
    });
  }

  return groups;
}

// Convert DollarQuote to Indicator
function dollarToIndicator(dollar: DollarQuote): Indicator {
  return {
    id: `dolar-${dollar.type}`,
    name: dollar.name,
    shortName: dollar.name.replace('Dólar ', ''),
    category: 'cambios',
    value: dollar.sell,
    previousValue: dollar.sell - (dollar.sell * dollar.changePercent / 100),
    change: dollar.change,
    changePercent: dollar.changePercent,
    unit: 'ARS',
    format: 'currency',
    decimals: 0,
    source: dollar.source,
    lastUpdated: dollar.lastUpdated,
    frequency: 'realtime',
  };
}

// Get trend from change percent
function getTrend(changePercent: number): Trend {
  if (changePercent > 0.1) return 'up';
  if (changePercent < -0.1) return 'down';
  return 'neutral';
}

// Export connectors for direct use
export * from './connectors/dollar';
export * from './connectors/bcra';
export * from './connectors/crypto';
export * from './connectors/commodities';
