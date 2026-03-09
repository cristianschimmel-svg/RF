/**
 * BCRA Connector
 * Fetches official indicators from Banco Central de la República Argentina
 * Con respaldo de ArgentinaDatos API
 */

import { API_CONFIG, BCRA_VARIABLE_IDS } from '../api-config';
import { cache, rateLimiter } from '../cache';
import type { Indicator, IndicatorSource } from '@/types';
import { fetchInflacionMensual, fetchInflacionInteranual, fetchRiesgoPais, fetchTasaPlazoFijo, fetchTasaDepositos30Dias } from './argentina-datos';

interface BCRAPrincipalVariable {
  idVariable: number;
  cdSerie: number;
  descripcion: string;
  fecha: string;
  valor: number;
}

interface BCRAResponse {
  status: number;
  results: BCRAPrincipalVariable[];
}

// Fetch all principal variables from BCRA
export async function fetchBCRAVariables(): Promise<Indicator[]> {
  const cacheKey = 'bcra:principales';
  const cached = cache.get<Indicator[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Check rate limit
  if (!rateLimiter.canProceed('bcra', API_CONFIG.bcra.rateLimit)) {
    console.warn('BCRA rate limit reached, trying backup...');
    return await getBackupData();
  }

  try {
    const url = `${API_CONFIG.bcra.baseUrl}${API_CONFIG.bcra.endpoints.principalesVariables}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5 minutes
    });

    if (!response.ok) {
      throw new Error(`BCRA API error: ${response.status}`);
    }

    const data: BCRAResponse = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid BCRA response format');
    }

    const indicators = data.results.map((item) => mapBCRAToIndicator(item));
    
    cache.set(cacheKey, indicators, API_CONFIG.bcra.cacheTTL);
    return indicators;

  } catch (error) {
    console.error('Error fetching BCRA data, trying backup:', error);
    return await getBackupData();
  }
}

// Fetch specific BCRA variable
export async function fetchBCRAVariable(variableId: number): Promise<Indicator | null> {
  const cacheKey = `bcra:var:${variableId}`;
  const cached = cache.get<Indicator>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // First get from principales variables
    const variables = await fetchBCRAVariables();
    const variable = variables.find((v) => v.id === `bcra-${variableId}`);
    
    if (variable) {
      cache.set(cacheKey, variable, API_CONFIG.bcra.cacheTTL);
      return variable;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching BCRA variable ${variableId}:`, error);
    return null;
  }
}

// Fetch historical data for a variable (for sparklines)
export async function fetchBCRAHistory(
  variableId: number, 
  days: number = 30
): Promise<number[]> {
  const cacheKey = `bcra:history:${variableId}:${days}`;
  const cached = cache.get<number[]>(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const url = `${API_CONFIG.bcra.baseUrl}/estadisticas/v2.0/datosvariable/${variableId}/${formatDate(startDate)}/${formatDate(endDate)}`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // 1 hour
    });

    if (!response.ok) {
      throw new Error(`BCRA History API error: ${response.status}`);
    }

    const data = await response.json();
    const values = data.results?.map((r: { valor: number }) => r.valor) || [];
    
    cache.set(cacheKey, values, 3600); // Cache for 1 hour
    return values;

  } catch (error) {
    console.error(`Error fetching BCRA history for ${variableId}:`, error);
    return [];
  }
}

// Map BCRA data to our Indicator type
function mapBCRAToIndicator(item: BCRAPrincipalVariable): Indicator {
  const config = getVariableConfig(item.idVariable);
  
  return {
    id: `bcra-${item.idVariable}`,
    name: config.name || item.descripcion,
    shortName: config.shortName || item.descripcion.substring(0, 20),
    category: config.category || 'actividad',
    value: item.valor,
    previousValue: item.valor, // Would need historical for real comparison
    change: 0,
    changePercent: 0,
    unit: config.unit || '',
    format: config.format || 'number',
    decimals: config.decimals ?? 2,
    source: 'bcra' as IndicatorSource,
    sourceUrl: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp',
    lastUpdated: item.fecha,
    frequency: config.frequency || 'daily',
  };
}

// Configuration for known BCRA variables
function getVariableConfig(variableId: number): Partial<Indicator> {
  const configs: Record<number, Partial<Indicator>> = {
    [BCRA_VARIABLE_IDS.reservasInternacionales]: {
      name: 'Reservas Internacionales',
      shortName: 'Reservas',
      category: 'actividad',
      unit: 'USD',
      format: 'currency',
      decimals: 0,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.baseMonetaria]: {
      name: 'Base Monetaria',
      shortName: 'Base Mon.',
      category: 'actividad',
      unit: 'ARS',
      format: 'currency',
      decimals: 0,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.tasaPoliticaMonetaria]: {
      name: 'Tasa de Política Monetaria',
      shortName: 'Tasa PM',
      category: 'tasas',
      unit: '%',
      format: 'percent',
      decimals: 2,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.uva]: {
      name: 'UVA (Unidad de Valor Adquisitivo)',
      shortName: 'UVA',
      category: 'inflacion',
      unit: 'ARS',
      format: 'currency',
      decimals: 2,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.cer]: {
      name: 'CER (Coeficiente de Estabilización)',
      shortName: 'CER',
      category: 'inflacion',
      format: 'number',
      decimals: 4,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.inflacionMensual]: {
      name: 'Inflación Mensual (INDEC)',
      shortName: 'Inflación',
      category: 'inflacion',
      unit: '%',
      format: 'percent',
      decimals: 2,
      frequency: 'monthly',
    },
    [BCRA_VARIABLE_IDS.inflacionInteranual]: {
      name: 'Inflación Interanual',
      shortName: 'Inflación i.a.',
      category: 'inflacion',
      unit: '%',
      format: 'percent',
      decimals: 2,
      frequency: 'monthly',
    },
    [BCRA_VARIABLE_IDS.tipoCambioMinorista]: {
      name: 'Tipo de Cambio Minorista',
      shortName: 'TC Min.',
      category: 'cambios',
      unit: 'ARS',
      format: 'currency',
      decimals: 2,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.tipoCambioMayorista]: {
      name: 'Tipo de Cambio Mayorista',
      shortName: 'TC May.',
      category: 'cambios',
      unit: 'ARS',
      format: 'currency',
      decimals: 4,
      frequency: 'daily',
    },
    [BCRA_VARIABLE_IDS.badlarPrivados]: {
      name: 'BADLAR Bancos Privados',
      shortName: 'BADLAR',
      category: 'tasas',
      unit: '%',
      format: 'percent',
      decimals: 2,
      frequency: 'daily',
    },
  };

  return configs[variableId] || {};
}

// Obtiene datos de respaldo desde ArgentinaDatos API
// Si tampoco hay datos, retorna indicadores en 0 (nunca datos falsos)
async function getBackupData(): Promise<Indicator[]> {
  console.log('🔄 Intentando obtener datos de respaldo desde ArgentinaDatos...');
  
  const indicators: Indicator[] = [];
  const now = new Date().toISOString();

  try {
    // Intentar obtener inflación mensual
    const inflacion = await fetchInflacionMensual();
    if (inflacion) {
      indicators.push({
        ...inflacion,
        id: 'bcra-27', // Mantener compatibilidad
        source: 'ArgentinaDatos (respaldo)',
      });
      console.log('✅ Inflación mensual obtenida de respaldo:', inflacion.value);
    } else {
      // Sin datos reales = mostrar 0
      indicators.push(createEmptyIndicator('bcra-27', 'Inflación Mensual', 'Inflación', 'inflacion', '%', now));
    }

    // Intentar obtener inflación interanual
    const inflacionIA = await fetchInflacionInteranual();
    if (inflacionIA) {
      indicators.push({
        ...inflacionIA,
        id: 'bcra-28',
        source: 'ArgentinaDatos (respaldo)',
      });
      console.log('✅ Inflación interanual obtenida de respaldo:', inflacionIA.value);
    } else {
      indicators.push(createEmptyIndicator('bcra-28', 'Inflación Interanual', 'Inflación i.a.', 'inflacion', '%', now));
    }

    // Intentar obtener tasas de interés
    const plazoFijo = await fetchTasaPlazoFijo();
      if (plazoFijo) {
        indicators.push({
          ...plazoFijo,
          id: 'bcra-6',
        });
      }

    const badlar = await fetchTasaDepositos30Dias();
    if (badlar) {
      indicators.push({
        ...badlar,
        id: 'bcra-7',
      });
    }

      const riesgoPais = await fetchRiesgoPais();
    if (riesgoPais) {
      indicators.push({
        ...riesgoPais,
        id: 'riesgo-pais',
        source: 'ArgentinaDatos (respaldo)',
      });
      console.log('✅ Riesgo país obtenido de respaldo:', riesgoPais.value);
    }

  } catch (error) {
    console.error('❌ Error obteniendo datos de respaldo:', error);
  }

  // Si no hay ningún indicador, retornamos array con indicador vacío de inflación
  if (indicators.length === 0) {
    console.warn('⚠️ No hay datos disponibles de ninguna fuente, mostrando 0');
    indicators.push(createEmptyIndicator('bcra-27', 'Inflación Mensual', 'Inflación', 'inflacion', '%', now));
  }

  return indicators;
}

// Crea un indicador vacío (valor 0) cuando no hay datos reales disponibles
function createEmptyIndicator(
  id: string,
  name: string,
  shortName: string,
  category: 'inflacion' | 'actividad' | 'tasas' | 'cambios' | 'riesgo',
  unit: string,
  timestamp: string
): Indicator {
  return {
    id,
    name,
    shortName,
    category,
    value: 0,
    previousValue: 0,
    change: 0,
    changePercent: 0,
    unit,
    format: unit === '%' ? 'percent' : 'number',
    decimals: unit === '%' ? 1 : 0,
    source: 'Sin datos',
    lastUpdated: timestamp,
    frequency: 'daily',
    isFallback: true,
    noData: true,
    disclaimer: 'Sin datos disponibles. Las APIs no responden.',
  };
}

// Specific getters
export async function getReservas(): Promise<Indicator | null> {
  return fetchBCRAVariable(BCRA_VARIABLE_IDS.reservasInternacionales);
}

export async function getInflacion(): Promise<Indicator | null> {
  // Primero intentamos BCRA
  const bcraInflacion = await fetchBCRAVariable(BCRA_VARIABLE_IDS.inflacionMensual);
  
  if (bcraInflacion && !bcraInflacion.noData) {
    return bcraInflacion;
  }
  
  // Si falla, intentamos ArgentinaDatos
  console.log('🔄 BCRA falló, intentando ArgentinaDatos para inflación...');
  const backupInflacion = await fetchInflacionMensual();
  
  if (backupInflacion) {
    console.log('✅ Inflación obtenida de ArgentinaDatos:', backupInflacion.value);
    return {
      ...backupInflacion,
      id: 'bcra-27', // Mantener compatibilidad
    };
  }
  
  // Si todo falla, retornamos 0 (nunca datos falsos)
  console.warn('⚠️ No hay datos de inflación disponibles');
  return createEmptyIndicator(
    'bcra-27',
    'Inflación Mensual',
    'Inflación',
    'inflacion',
    '%',
    new Date().toISOString()
  );
}

export async function getInflacionInteranual(): Promise<Indicator | null> {
  // Primero intentamos BCRA
  const bcraInflacion = await fetchBCRAVariable(BCRA_VARIABLE_IDS.inflacionInteranual);
  
  if (bcraInflacion && !bcraInflacion.noData) {
    return bcraInflacion;
  }
  
  // Si falla, intentamos ArgentinaDatos
  const backupInflacion = await fetchInflacionInteranual();
  
  if (backupInflacion) {
    return {
      ...backupInflacion,
      id: 'bcra-28',
    };
  }
  
  return createEmptyIndicator(
    'bcra-28',
    'Inflación Interanual',
    'Inflación i.a.',
    'inflacion',
    '%',
    new Date().toISOString()
  );
}

export async function getTasaPoliticaMonetaria(): Promise<Indicator | null> {
  return fetchBCRAVariable(BCRA_VARIABLE_IDS.tasaPoliticaMonetaria);
}

export async function getUVA(): Promise<Indicator | null> {
  return fetchBCRAVariable(BCRA_VARIABLE_IDS.uva);
}

export async function getBADLAR(): Promise<Indicator | null> {
  return fetchBCRAVariable(BCRA_VARIABLE_IDS.badlarPrivados);
}

