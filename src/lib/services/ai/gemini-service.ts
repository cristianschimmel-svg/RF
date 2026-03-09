/**
 * Google AI (Gemini) Service
 * Provides AI-powered news synthesis and image generation
 */

import { cache } from '../cache';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Cache TTL for AI-generated content (1 hour)
const AI_CACHE_TTL = 60 * 60;

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface NewsSummary {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: string;
}

/**
 * Generate a professional summary of a news article
 */
export async function generateNewsSummary(
  title: string,
  content: string,
  source: string
): Promise<NewsSummary | null> {
  const cacheKey = `ai:summary:${hashString(title)}`;
  const cached = cache.get<NewsSummary>(cacheKey);
  
  if (cached) {
    console.log('[AI] Returning cached summary');
    return cached;
  }

  if (!GOOGLE_AI_API_KEY) {
    console.error('[AI] Google AI API key not configured');
    return null;
  }

  try {
    const prompt = `Eres un analista financiero senior de "Rosario Finanzas", el portal líder de información financiera, bursátil y agroindustrial de Argentina.

## TU AUDIENCIA:
- Inversores de bolsa (MERVAL, CEDEARs, bonos)
- Productores y empresarios agroindustriales
- Traders y operadores financieros
- Empresarios PyME buscando información de mercado
- Profesionales de finanzas corporativas

## LA NOTICIA A ANALIZAR:
TÍTULO: ${title}
FUENTE: ${source}
CONTENIDO: ${content || 'No disponible - analizar basándose en el título'}

## TU TAREA:
Genera un análisis profesional y completo que incluya:
1. RESUMEN EJECUTIVO: Síntesis clara de 150-200 palabras explicando qué pasó, por qué importa y cuáles son las implicancias
2. PUNTOS CLAVE: 4-5 puntos destacados con datos concretos
3. ANÁLISIS DE IMPACTO: Cómo afecta a inversores, al agro, al dólar o a los mercados
4. SENTIMIENTO: Si la noticia es positiva, negativa o neutral para los mercados argentinos
5. DATO CLAVE OBLIGATORIO: Si la noticia gira en torno a un dato numérico concreto (cotización, precio, porcentaje de inflación, índice, tasa), ese dato exacto DEBE aparecer en el "summary" y como primer item de "keyPoints" con la cifra, unidad y referencia temporal

## CONTEXTO ARGENTINO IMPORTANTE:
- Considera el impacto en el dólar (oficial, blue, MEP, CCL)
- Relaciona con commodities agrícolas si aplica (soja, maíz, trigo)
- Menciona efectos en el MERVAL o bonos si es relevante
- Usa terminología que los inversores argentinos entienden
- NUNCA omitas la cifra central cuando la noticia es sobre un valor/precio específico (ej: cotización del dólar, precio de commodities, porcentaje de inflación). El dato numérico exacto es la información más valiosa para el lector.

Responde EXACTAMENTE en este formato JSON (sin markdown, solo JSON puro):
{
  "summary": "[Resumen ejecutivo de 150-200 palabras. Incluir contexto, causas, consecuencias y perspectiva. Usar datos concretos cuando estén disponibles. Tono profesional pero accesible para todo inversor.]",
  "keyPoints": ["[Punto 1 con dato concreto]", "[Punto 2 con impacto específico]", "[Punto 3 con contexto]", "[Punto 4 con implicancia]", "[Punto 5 opcional]"],
  "sentiment": "positive|negative|neutral",
  "relevance": "[2-3 oraciones explicando por qué esta noticia es importante para inversores, productores agrícolas o empresarios argentinos. Ser específico sobre el impacto esperado.]"
}`;

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] Gemini API error:', error);
      return null;
    }

    const data: GeminiResponse = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[AI] Empty response from Gemini');
      return null;
    }

    // Parse JSON response (handle potential markdown wrapping)
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const summary = JSON.parse(jsonStr) as NewsSummary;

    // Cache the result
    cache.set(cacheKey, summary, AI_CACHE_TTL);

    return summary;
  } catch (error) {
    console.error('[AI] Error generating summary:', error);
    return null;
  }
}

/**
 * Generate an image prompt for news illustration
 */
export async function generateImagePrompt(title: string, category: string): Promise<string> {
  const prompts: Record<string, string> = {
    economia: `Professional financial illustration for: "${title}". Style: Modern minimalist, warm tones (ivory, brown), no text, abstract data visualization elements, Argentine economic theme.`,
    mercados: `Stock market themed illustration for: "${title}". Style: Clean corporate, charts and graphs abstracted, warm color palette, professional financial aesthetic.`,
    agro: `Agricultural commodity illustration for: "${title}". Style: Fields, grains, harvest elements, warm golden tones, professional infographic style.`,
    finanzas: `Finance and banking illustration for: "${title}". Style: Modern corporate, subtle money/investment elements, warm professional palette.`,
    cripto: `Cryptocurrency themed illustration for: "${title}". Style: Digital, futuristic but professional, blockchain elements abstracted, warm tech aesthetic.`,
  };

  return prompts[category.toLowerCase()] || prompts.economia;
}

/**
 * Generate an AI image using Gemini's image generation (Imagen 3)
 */
export async function generateNewsImage(
  title: string,
  category: string
): Promise<string> {
  const cacheKey = `ai:image:${hashString(title)}`;
  const cached = cache.get<string>(cacheKey);
  
  if (cached) {
    return cached;
  }

  const { getFallbackImage } = await import('@/lib/image-fallbacks');
  const fallbackUrl = getFallbackImage(category, title);

  if (!GOOGLE_AI_API_KEY) {
    return fallbackUrl;
  }

  try {
    const prompt = await generateImagePrompt(title, category);
    // Request a simple, lower resolution generation
    const fullPrompt = `${prompt} --no-text`;

    const response = await fetch(
      `${GEMINI_API_URL}/imagen-3.0-generate-001:predict?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9"
          }
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const base64Image = data?.predictions?.[0]?.bytesBase64Encoded;
      
      if (base64Image) {
        const imageUrl = `data:image/jpeg;base64,${base64Image}`;
        
        // Cache the base64 string
        cache.set(cacheKey, imageUrl, AI_CACHE_TTL);
        return imageUrl;
      }
    } else {
      console.error('[AI] Imagen API error:', await response.text());
    }
  } catch (error) {
    console.error('[AI] Error generating image:', error);
  }

  // Fallback to Unsplash
  cache.set(cacheKey, fallbackUrl, AI_CACHE_TTL);
  return fallbackUrl;
}

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if AI service is available
 */
export function isAIAvailable(): boolean {
  return !!GOOGLE_AI_API_KEY;
}
