/**
 * A3 Mercados — AI Relevance Validator
 *
 * Uses Gemini to determine if a candidate article is genuinely relevant
 * to A3 Mercados' business, not just a keyword coincidence.
 */

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface RelevanceResult {
  score: number;       // 0-10
  reason: string;      // one-line explanation
  category: string | null; // may refine the category
}

const A3_CONTEXT = `A3 Mercados es el resultado de la integración de dos actores clave del mercado financiero argentino: el Mercado Abierto Electrónico (MAE) y Matba Rofex.
Combina tres mercados históricos: Matba (1907), ROFEX (1909) —ambos de futuros agropecuarios— y MAE (1989, renta fija electrónica).
Hoy A3 opera futuros (agrícolas y financieros), opciones, derivados, renta fija, negociación de divisas (FX), y servicios de post-negociación y liquidación.
También tiene una unidad de negocios tecnológica con presencia en América Latina.
Su misión es proporcionar un ecosistema robusto para la operatoria de instrumentos financieros y agropecuarios, abarcando productos de contado, derivados y OTC.`;

/**
 * Validate whether a keyword-matched article is genuinely relevant to A3 Mercados.
 *
 * Only called for CANDIDATE keywords (producto, ecosistema).
 * Exempt keywords (institucional, sector) bypass this entirely.
 */
export async function validateClippingRelevance(
  title: string,
  excerpt: string,
  matchedKeyword: string,
  candidateCategory: string,
): Promise<RelevanceResult> {
  if (!GEMINI_API_KEY) {
    // If no AI key, be permissive — include the article with a medium score
    return { score: 6, reason: 'IA no disponible, incluido por precaución', category: candidateCategory };
  }

  const prompt = `Sos un analista de clipping de prensa especializado en A3 Mercados.

SOBRE A3 MERCADOS:
${A3_CONTEXT}

ARTÍCULO A EVALUAR:
- Título: ${title}
- Bajada: ${excerpt}
- Keyword detectado: "${matchedKeyword}"
- Categoría tentativa: ${candidateCategory}

TU TAREA:
Evaluar si este artículo es GENUINAMENTE relevante para el negocio de A3 Mercados o si la keyword detectada aparece de forma incidental (ej: un artículo deportivo que menciona "dólar" de pasada).

CRITERIOS DE RELEVANCIA ALTA (score 7-10):
- El artículo trata CENTRALMENTE sobre mercados de capitales, futuros, derivados, renta fija, o instrumentos que A3 negocia
- Afecta directamente la operatoria de A3 (regulación de mercados, cambios en CNV/BCRA que impactan negociación)
- Análisis de commodities agrícolas (soja, maíz, trigo) donde futuros son relevantes
- Política cambiaria/monetaria con impacto directo en instrumentos de A3

CRITERIOS DE RELEVANCIA MEDIA (score 4-6):
- El artículo menciona temas de mercados/economía pero A3 no es actor directo
- Contexto macroeconómico general (inflación, PBI) sin conexión clara a instrumentos de A3
- Noticias internacionales de mercados sin efecto directo en Argentina

CRITERIOS DE BAJA RELEVANCIA (score 0-3):
- La keyword aparece de forma incidental o tangencial
- El foco real del artículo no tiene relación con mercados de capitales ni agro-financiero
- Noticias sociales/políticas que mencionan "dólar" o "inflación" como dato de color

Responde SOLO con JSON puro (sin markdown):
{"score": <0-10>, "reason": "<explicación de 1 línea>", "category": "<institucional|producto|sector|ecosistema>"}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!response.ok) {
      console.error('[ClippingAI] Gemini API error:', response.status);
      return { score: 6, reason: 'Error de API, incluido por precaución', category: candidateCategory };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { score: 6, reason: 'Respuesta vacía de IA', category: candidateCategory };
    }

    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      score: Math.max(0, Math.min(10, Number(parsed.score) || 0)),
      reason: String(parsed.reason || '').slice(0, 300),
      category: parsed.category || candidateCategory,
    };
  } catch (error) {
    console.error('[ClippingAI] Relevance validation error:', error);
    return { score: 6, reason: 'Error en validación IA', category: candidateCategory };
  }
}
