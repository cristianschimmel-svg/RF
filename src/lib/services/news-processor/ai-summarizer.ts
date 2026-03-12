/**
 * AI Summarizer
 * Generates intelligent summaries using Gemini AI
 */

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface SummaryResult {
  cleanTitle?: string;
  cleanExcerpt?: string;
  summary: string;
  keyPoints: string[];
  sentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  relevance?: string;
  success: boolean;
  error?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

/**
 * Generate an intelligent 3-paragraph summary of a news article
 */
export async function generateAISummary(
  title: string,
  header: string,
  fullContent: string,
  category: string,
  sourceName: string
): Promise<SummaryResult> {
  if (!GEMINI_API_KEY) {
    console.error('[AISummarizer] GOOGLE_AI_API_KEY not configured');
    return {
      summary: header,
      keyPoints: [],
      success: false,
      error: 'API key not configured',
    };
  }

  // Use full content if available, otherwise fall back to header
  const contentToAnalyze = fullContent?.length > 200 ? fullContent : header;

  const prompt = `Eres un periodista financiero senior especializado en economía argentina, mercados y agronegocios. Trabajas para "Rosario Finanzas", el portal líder de información financiera de la región.

## NOTICIA A ANALIZAR:

**TÍTULO:** ${title}

**BAJADA:** ${header}

**CONTENIDO COMPLETO:**
${contentToAnalyze}

**CATEGORÍA:** ${category}
**FUENTE:** ${sourceName}

## TU TAREA:

1. Corrige el título si está cortado o mal formateado. Si el título original contiene un dato numérico (cotización, precio, porcentaje), el título corregido DEBE conservarlo.
2. Genera una "bajada" (excerpt) limpia, de 1 o 2 oraciones, que resuma la noticia sin cortarse.
3. Genera un resumen CONCISO pero completo de esta noticia. NO repitas textualmente el título ni la bajada. El lector debe entender la noticia sin necesidad de ir a la fuente original.
4. Extrae los puntos clave.
5. DATO CLAVE OBLIGATORIO: Si la noticia gira en torno a un dato numérico concreto (cotización, precio, porcentaje de inflación, índice, monto, tasa), DEBÉS extraer la cifra exacta e incluirla de forma prominente en el "summary" (resaltada con <strong>), en el "cleanExcerpt" y como primer item de "keyPoints". Ejemplos: si el título dice "a cuánto cotiza el dólar blue", el resumen DEBE incluir el valor exacto (ej: $1.250); si dice "se conoce la inflación de febrero", DEBE incluir el porcentaje (ej: 3,2%); si dice "a cuánto cotiza el girasol", DEBE incluir el precio.
6. IMPORTANTE: "cleanExcerpt" y "keyPoints" deben ser TEXTO PLANO, sin etiquetas HTML. Solo "summary" puede usar HTML (<p>, <strong>, <em>).

## FORMATO DE RESPUESTA (JSON estricto):

{
  "cleanTitle": "Título corregido y completo",
  "cleanExcerpt": "Bajada limpia y completa, sin puntos suspensivos al final. TEXTO PLANO, sin HTML.",
  "summary": "<p>Párrafo principal con los hechos clave: <strong>qué pasó</strong>, cuándo, dónde y quiénes están involucrados. Incluí cifras y datos concretos si los hay.</p><p>Párrafo opcional de contexto o implicancias (solo si es relevante y aporta valor).</p>",
  "keyPoints": [
    "Dato o cifra clave mencionada",
    "Impacto principal en mercados/agro/economía",
    "Actor o entidad involucrada",
    "Implicancia para el lector",
    "Tendencia o perspectiva"
  ],
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "relevance": "2-3 oraciones explicando por qué esta noticia importa a inversores, productores agrícolas o empresarios argentinos."
}

## REGLAS IMPORTANTES:
1. El summary debe usar HTML simple: <p>, <strong>, <em> para enriquecer el texto. cleanExcerpt y keyPoints deben ser texto plano SIN etiquetas HTML.
2. Máximo 2 párrafos (usa 1 si es suficiente para explicar la noticia)
3. Entre 60 y 120 palabras en total - sé conciso pero informativo
4. Los keyPoints deben ser concisos (máximo 12 palabras cada uno)
5. Enfócate en el contenido real, NO inventes datos
6. Si es agro: menciona commodities, precios, clima
7. Si es finanzas: menciona dólar, MERVAL, bonos, tasas
8. Tono profesional, directo y accesible
9. NUNCA omitas la cifra central de la noticia. Si el título o contenido menciona un valor numérico concreto (cotización, precio, porcentaje, tasa, índice), ese dato SIEMPRE debe aparecer en el summary resaltado con <strong> y como primer keyPoint con la cifra exacta, unidad y referencia temporal. Ejemplo: "Dólar blue: $1.250 al cierre del 8 de marzo", "Inflación febrero: 3,2% mensual".
10. SIEMPRE incluí "sentiment" y "relevance" en el JSON. El sentiment debe ser EXACTAMENTE uno de: very_positive, positive, neutral, negative, very_negative según el impacto de la noticia en los mercados argentinos.

Responde SOLO con el JSON, sin markdown ni texto adicional.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.5,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AISummarizer] API error ${response.status}:`, errorText);
      return {
        summary: header,
        keyPoints: [],
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
      console.error('[AISummarizer] Gemini error:', data.error.message);
      return {
        summary: header,
        keyPoints: [],
        success: false,
        error: data.error.message,
      };
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return {
        summary: header,
        keyPoints: [],
        success: false,
        error: 'Empty response from AI',
      };
    }

    // Parse JSON response
    try {
      // Clean markdown code blocks if present
      const cleanedJson = textResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);
      
      // Validate response structure
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('Invalid summary format');
      }

      // Ensure summary has multiple paragraphs
      let summary = parsed.summary;
      if (!summary.includes('\n\n') && summary.length > 300) {
        // If no paragraph breaks, try to add them
        const sentences = summary.split(/(?<=[.!?])\s+/);
        if (sentences.length >= 6) {
          const third = Math.floor(sentences.length / 3);
          summary = [
            sentences.slice(0, third).join(' '),
            sentences.slice(third, third * 2).join(' '),
            sentences.slice(third * 2).join(' '),
          ].join('\n\n');
        }
      }

      // Validate sentiment value
      const validSentiments = ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'] as const;
      const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : undefined;

      // Strip HTML tags from fields that must be plain text
      const stripHtml = (text: string) => text.replace(/<[^>]*>/g, '').trim();

      return {
        cleanTitle: parsed.cleanTitle ? stripHtml(parsed.cleanTitle) : undefined,
        cleanExcerpt: parsed.cleanExcerpt ? stripHtml(parsed.cleanExcerpt) : undefined,
        summary,
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map((p: string) => typeof p === 'string' ? stripHtml(p) : p) : [],
        sentiment,
        relevance: typeof parsed.relevance === 'string' ? parsed.relevance : undefined,
        success: true,
      };
    } catch (parseError) {
      console.error('[AISummarizer] Failed to parse JSON, using raw text');
      // Use raw text if JSON parsing fails
      return {
        summary: textResponse.slice(0, 1500),
        keyPoints: [],
        success: true,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AISummarizer] Request error:', errorMessage);
    return {
      summary: header,
      keyPoints: [],
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if AI service is available
 */
export function isAIAvailable(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * Check if an article is relevant using AI
 */
export async function checkArticleRelevanceWithAI(
  title: string,
  excerpt: string,
  category: string
): Promise<{ isRelevant: boolean; reason: string }> {
  if (!GEMINI_API_KEY) {
    return { isRelevant: true, reason: 'AI not available, skipping check' };
  }

  const prompt = `
Eres un editor de "Rosario Finanzas", un portal de noticias financieras y económicas de Argentina.

Tu trabajo es SIMPLE: decidir si esta noticia tiene relación con finanzas, economía, mercados, agro o negocios.

ACEPTA (TRUE) si la noticia trata sobre CUALQUIERA de estos temas:
- Dólar, cotizaciones, tipo de cambio, divisas, monedas
- Inflación, precios, costo de vida, tarifas, salarios, paritarias
- Bolsa, acciones, bonos, inversiones, Merval, Wall Street
- BCRA, tasas de interés, política monetaria, reservas
- Comercio exterior, exportaciones, importaciones, retenciones, aranceles
- Agro: soja, trigo, maíz, granos, cosecha, campo, ganadería como negocio
- Criptomonedas, Bitcoin, blockchain, exchanges
- Empresas, negocios, industria, comercio, emprendimientos
- Presupuesto, impuestos, recaudación, deuda, déficit, superávit
- Energía como sector económico (petróleo, gas, Vaca Muerta, litio)
- Finanzas personales (ahorro, créditos, plazo fijo, billeteras virtuales)
- Economía regional (Rosario, Santa Fe, puertos, agroindustria)
- Cualquier política gubernamental con IMPACTO ECONÓMICO directo

RECHAZA (FALSE) SOLO si la noticia es CLARAMENTE sobre:
- Deportes (fútbol, básquet, tenis, etc.)
- Farándula, espectáculos, TV, cine, música
- Policiales, crímenes, accidentes sin impacto económico
- Clima/meteorología sin afectación a mercados
- Salud/medicina sin impacto económico
- Astrología, horóscopos, efemérides

IMPORTANTE: En caso de DUDA, acepta la noticia (TRUE). Es preferible incluir una noticia borderline que perder una relevante.

TÍTULO: ${title}
BAJADA: ${excerpt}
CATEGORÍA ASIGNADA: ${category}

Responde SOLO con JSON: {"isRelevant": true, "reason": "justificación breve"}
`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.1,
          topP: 0.9,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      return { isRelevant: true, reason: 'API error during relevance check' };
    }

    const data: GeminiResponse = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      return { isRelevant: true, reason: 'Empty response from AI' };
    }

    const cleanedJson = textResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);
    
    return {
      isRelevant: parsed.isRelevant === true,
      reason: parsed.reason || 'No reason provided'
    };
  } catch (error) {
    console.error('[AISummarizer] Relevance check error:', error);
    return { isRelevant: true, reason: 'Error parsing AI response' };
  }
}
