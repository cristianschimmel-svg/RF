import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  slug: string;
  category: string;
  isExternal?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { articles, query } = body as { articles: ArticleInput[]; query: string };

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: 'No articles provided' }, { status: 400 });
    }

    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Limit to 20 articles to avoid token overflow
    const limitedArticles = articles.slice(0, 20);

    const articlesList = limitedArticles
      .map(
        (a, i) => {
          const link = a.isExternal ? a.slug : `/noticias/${a.slug}`;
          return `${i + 1}. [${a.title}] — Fuente: ${a.source} — Categoría: ${a.category}\n   Resumen: ${a.excerpt}\n   Link: ${link}`;
        }
      )
      .join('\n\n');

    const prompt = `Eres un analista financiero de "Rosario Finanzas", el portal financiero líder de Argentina.

El usuario buscó: "${query}"

Se encontraron ${limitedArticles.length} noticias relacionadas. Generá un briefing ejecutivo en español argentino.

## NOTICIAS ENCONTRADAS:
${articlesList}

## INSTRUCCIONES:
1. Escribí un resumen ejecutivo de 2-3 párrafos que sintetice la temática general y los puntos más relevantes.
2. Identificá las tendencias o patrones comunes entre las noticias.
3. Destacá los datos más importantes para un inversor o empresario.
4. Al mencionar cada noticia, incluí el link EXACTO proporcionado en formato markdown: [título corto](link). NO modifiques los links.
5. Agregá una sección "📌 Puntos clave" con 3-5 bullets.
6. Cerrá con una breve perspectiva o conclusión.

## FORMATO DE RESPUESTA (Markdown):
Usá encabezados ##, bullets, **negritas** y links markdown. Sé conciso pero informativo.`;

    const response = await fetch(
      `${GEMINI_API_URL}/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[AI Summary] Gemini API error:', response.status);
      return NextResponse.json(
        { error: 'AI service temporarily unavailable' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: 'No summary generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary: text, articleCount: limitedArticles.length });
  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
