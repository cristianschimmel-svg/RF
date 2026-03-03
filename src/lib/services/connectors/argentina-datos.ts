/**
 * ArgentinaDatos Connector
 * Fuente de respaldo gratuita y sin autenticación
 * https://argentinadatos.com/docs/
 */

import { API_CONFIG } from '../api-config';
import { cache } from '../cache';
import type { Indicator } from '@/types';

interface ArgentinaDatosInflacionItem {
  fecha: string;
  valor: number;
}

interface ArgentinaDatosRiesgoPais {
  fecha: string;
  valor: number;
}

interface ArgentinaDatosDolar {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
}

// Fetch inflation data from ArgentinaDatos
export async function fetchInflacionMensual(): Promise<Indicator | null> {
  const cacheKey = 'argentinadatos:inflacion:mensual';
  const cached = cache.get<Indicator>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const url = `${API_CONFIG.argentinaDatos.baseUrl}${API_CONFIG.argentinaDatos.endpoints.inflacionMensual}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error(`ArgentinaDatos inflacion error: ${response.status}`);
      return null;
    }

    const data: ArgentinaDatosInflacionItem[] = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.error('ArgentinaDatos: No inflation data returned');
      return null;
    }

    // Los datos vienen ordenados cronológicamente, tomamos los últimos 2
    const lastTwo = data.slice(-2);
    const current = lastTwo[1] || lastTwo[0];
    const previous = lastTwo.length > 1 ? lastTwo[0] : null;

    const indicator: Indicator = {
      id: 'argentinadatos-inflacion-mensual',
      name: 'Inflación Mensual',
      shortName: 'Inflación',
      category: 'inflacion',
      value: current.valor,
      previousValue: previous?.valor ?? current.valor,
      change: previous ? current.valor - previous.valor : 0,
      changePercent: previous ? ((current.valor - previous.valor) / previous.valor) * 100 : 0,
      unit: '%',
      format: 'percent',
      decimals: 1,
      source: 'ArgentinaDatos (INDEC)',
      lastUpdated: current.fecha,
      frequency: 'monthly',
      isFallback: false,
    };

    cache.set(cacheKey, indicator, API_CONFIG.argentinaDatos.cacheTTL);
    return indicator;

  } catch (error) {
    console.error('Error fetching ArgentinaDatos inflacion:', error);
    return null;
  }
}

// Fetch interanual inflation
export async function fetchInflacionInteranual(): Promise<Indicator | null> {
  const cacheKey = 'argentinadatos:inflacion:interanual';
  const cached = cache.get<Indicator>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const url = `${API_CONFIG.argentinaDatos.baseUrl}${API_CONFIG.argentinaDatos.endpoints.inflacionInteranual}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data: ArgentinaDatosInflacionItem[] = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const lastTwo = data.slice(-2);
    const current = lastTwo[1] || lastTwo[0];
    const previous = lastTwo.length > 1 ? lastTwo[0] : null;

    const indicator: Indicator = {
      id: 'argentinadatos-inflacion-interanual',
      name: 'Inflación Interanual',
      shortName: 'IPC i.a.',
      category: 'inflacion',
      value: current.valor,
      previousValue: previous?.valor ?? current.valor,
      change: previous ? current.valor - previous.valor : 0,
      changePercent: previous ? ((current.valor - previous.valor) / previous.valor) * 100 : 0,
      unit: '%',
      format: 'percent',
      decimals: 1,
      source: 'ArgentinaDatos (INDEC)',
      lastUpdated: current.fecha,
      frequency: 'monthly',
      isFallback: false,
    };

    cache.set(cacheKey, indicator, API_CONFIG.argentinaDatos.cacheTTL);
    return indicator;

  } catch (error) {
    console.error('Error fetching ArgentinaDatos inflacion interanual:', error);
    return null;
  }
}

// Fetch Riesgo País
export async function fetchRiesgoPais(): Promise<Indicator | null> {
  const cacheKey = 'argentinadatos:riesgo-pais';
  const cached = cache.get<Indicator>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Intentamos primero el endpoint "ultimo" que es más rápido
    const url = `${API_CONFIG.argentinaDatos.baseUrl}${API_CONFIG.argentinaDatos.endpoints.riesgoPaisUltimo}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const data: ArgentinaDatosRiesgoPais = await response.json();
    
    if (!data || typeof data.valor !== 'number') {
      return null;
    }

    const indicator: Indicator = {
      id: 'argentinadatos-riesgo-pais',
      name: 'Riesgo País',
      shortName: 'EMBI+',
      category: 'actividad',
      value: data.valor,
      previousValue: data.valor, // No tenemos el anterior en este endpoint
      change: 0,
      changePercent: 0,
      unit: 'pb',
      format: 'number',
      decimals: 0,
      source: 'ArgentinaDatos (JP Morgan)',
      lastUpdated: data.fecha,
      frequency: 'daily',
      isFallback: false,
    };

    cache.set(cacheKey, indicator, API_CONFIG.argentinaDatos.cacheTTL);
    return indicator;

  } catch (error) {
    console.error('Error fetching ArgentinaDatos riesgo pais:', error);
    return null;
  }
}

// Fetch dólares (todas las cotizaciones)
export async function fetchDolares(): Promise<Indicator[]> {
  const cacheKey = 'argentinadatos:dolares';
  const cached = cache.get<Indicator[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const url = `${API_CONFIG.argentinaDatos.baseUrl}${API_CONFIG.argentinaDatos.endpoints.dolares}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const data: ArgentinaDatosDolar[] = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }

    const now = new Date().toISOString();
    
    const indicators: Indicator[] = data
      .filter(d => d.venta !== null)
      .map(dolar => ({
        id: `argentinadatos-dolar-${dolar.casa}`,
        name: `Dólar ${dolar.nombre}`,
        shortName: dolar.nombre,
        category: 'cambios' as const,
        value: dolar.venta ?? 0,
        previousValue: dolar.compra ?? dolar.venta ?? 0,
        change: dolar.venta && dolar.compra ? dolar.venta - dolar.compra : 0,
        changePercent: 0, // No tenemos variación diaria en este endpoint
        unit: 'ARS',
        format: 'currency' as const,
        decimals: 2,
        source: 'ArgentinaDatos',
        lastUpdated: dolar.fechaActualizacion || now,
        frequency: 'realtime' as const,
        isFallback: false,
        metadata: {
          compra: dolar.compra,
          venta: dolar.venta,
          casa: dolar.casa,
        },
      }));

    cache.set(cacheKey, indicators, 60); // 1 minuto para dólar
    return indicators;

  } catch (error) {
    console.error('Error fetching ArgentinaDatos dolares:', error);
    return [];
  }
}

// Historical inflation for charts
export async function fetchInflacionHistorica(meses: number = 12): Promise<{ fecha: string; valor: number }[]> {
  try {
    const url = `${API_CONFIG.argentinaDatos.baseUrl}${API_CONFIG.argentinaDatos.endpoints.inflacionMensual}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // 1 hora para históricos
    });

    if (!response.ok) {
      return [];
    }

    const data: ArgentinaDatosInflacionItem[] = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }

    // Retornamos los últimos N meses
    return data.slice(-meses);

  } catch (error) {
    console.error('Error fetching ArgentinaDatos inflacion historica:', error);
    return [];
  }
}
// Fetch Plazo Fijo Rates
export async function fetchTasaPlazoFijo(): Promise<Indicator | null> {
  const cacheKey = 'argentinadatos:plazo-fijo';
  const cached = cache.get<Indicator>(cacheKey);

  if (cached) return cached;

  try {
    const url = `${API_CONFIG.argentinaDatos.baseUrl}/v1/finanzas/tasas/plazoFijo`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } });
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Tomar la tasa maxima disponible para clientes
    const validRates = data.filter(d => d.tnaClientes != null);
    if (validRates.length === 0) return null;

    // Obtener el promedio o la max, tomamos el promedio de los top 5 bancos
    const maxTasa = Math.max(...validRates.map(d => d.tnaClientes * 100)); // Convertir a porcentaje

    const indicator: Indicator = {
      id: 'argentinadatos-plazofijo',
      name: 'Tasa Plazo Fijo (Promedio Ref)',
      shortName: 'Plazo Fijo',
      category: 'tasas',
      value: maxTasa,
      previousValue: maxTasa,
      change: 0,
      changePercent: 0,
      unit: '%',
      format: 'percent',
      decimals: 2,
      source: 'ArgentinaDatos (respaldo)',
      sourceUrl: 'https://argentinadatos.com',
      lastUpdated: new Date().toISOString(),
      frequency: 'daily',
    };

    cache.set(cacheKey, indicator, API_CONFIG.argentinaDatos.cacheTTL);
    return indicator;
  } catch (error) {
    console.error('Error fetching ArgentinaDatos plazo fijo:', error);
    return null;
  }
}
