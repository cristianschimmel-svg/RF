/**
 * Content Scraper
 * Fetches and extracts the full content from news article URLs
 */

interface ScrapedContent {
  content: string;
  imageUrl?: string;  // og:image or main article image
  success: boolean;
  error?: string;
}

// Site-specific selectors for content extraction
const SITE_SELECTORS: Record<string, string[]> = {
  'ambito.com': [
    'article .detail-body',
    '.article-body',
    '.nota-cuerpo',
  ],
  'lanacion.com.ar': [
    'article .cuerpo',
    '.article-body',
    '[data-pb-name="article-body"]',
  ],
  'clarin.com': [
    '.body-nota',
    '.article-body',
    '[data-tipo="nota"]',
  ],
  'cronista.com': [
    '.article-body',
    '.nota-body',
    '.content-body',
  ],
  'iprofesional.com': [
    '.body-nota',
    '.article-content',
  ],
  'infocampo.com.ar': [
    '.entry-content',
    '.post-content',
    'article .content',
  ],
  'bichosdecampo.com': [
    '.entry-content',
    '.post-content',
  ],
  'valorsoja.com': [
    '.entry-content',
    '.post-content',
  ],
  'bloomberglinea.com': [
    'article .body',
    '.article-content',
    '[data-component="article-body"]',
  ],
};

/**
 * Extract text content from HTML using regex patterns
 * (Simpler than using a full DOM parser in serverless)
 */
function extractTextFromHTML(html: string, patterns: string[]): string {
  let content = '';

  // Try common article selectors using regex
  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:article|body|content|nota|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
  ];

  for (const pattern of articlePatterns) {
    const matches = Array.from(html.matchAll(pattern));
    for (const match of matches) {
      content += match[1] + ' ';
    }
    if (content.length > 1000) break;
  }

  // Also extract all paragraph content
  const paragraphPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs = Array.from(html.matchAll(paragraphPattern));
  for (const p of paragraphs) {
    content += p[1] + ' ';
  }

  // Clean HTML
  content = content
    // Remove script and style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return content;
}

/**
 * Decode HTML entities in URLs
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Extract og:image or main article image from HTML
 */
function extractOgImage(html: string): string | undefined {
  // Try og:image:secure_url first
  const secureMatch = html.match(/<meta[^>]*property="og:image:secure_url"[^>]*content="([^"]+)"[^>]*>/i)
    || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image:secure_url"[^>]*>/i);
  if (secureMatch?.[1]) return decodeHtmlEntities(secureMatch[1]);

  // Try og:image (most reliable)
  const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i)
    || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"[^>]*>/i);
  if (ogImageMatch?.[1]) return decodeHtmlEntities(ogImageMatch[1]);

  // Try twitter:image
  const twitterMatch = html.match(/<meta[^>]*name="twitter:image"[^>]*content="([^"]+)"[^>]*>/i)
    || html.match(/<meta[^>]*content="([^"]+)"[^>]*name="twitter:image"[^>]*>/i);
  if (twitterMatch?.[1]) return decodeHtmlEntities(twitterMatch[1]);

  // Special case for data-src or lazy loaded images (common in Ambito)
  const dataSrcMatch = html.match(/<img[^>]*data-src="(https?:\/\/[^"]+(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"[^>]*>/i);
  if (dataSrcMatch?.[1]) return decodeHtmlEntities(dataSrcMatch[1]);

  // Try first large image in article
  const imgMatch = html.match(/<img[^>]*src="(https?:\/\/[^"]+(?:\.jpg|\.jpeg|\.png|\.webp)[^"]*)"[^>]*>/i);
  if (imgMatch?.[1] && !imgMatch[1].includes('avatar') && !imgMatch[1].includes('icon') && !imgMatch[1].includes('logo')) {
    return decodeHtmlEntities(imgMatch[1]);
  }

  return undefined;
}

/**
 * Scrape full content from a news article URL
 */
export async function scrapeArticleContent(url: string): Promise<ScrapedContent> {
  try {
    console.log(`[ContentScraper] Fetching: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        content: '',
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    
    // Get domain-specific selectors
    const domain = new URL(url).hostname.replace('www.', '');
    const selectors = SITE_SELECTORS[domain] || [];
    
    // Extract content and image
    const content = extractTextFromHTML(html, selectors);
    const imageUrl = extractOgImage(html);

    if (content.length < 100) {
      return {
        content: '',
        imageUrl,
        success: false,
        error: 'Content too short or not found',
      };
    }

    // Limit to ~5000 characters for AI processing (enough for a full article)
    const limitedContent = content.slice(0, 5000);

    console.log(`[ContentScraper] Extracted ${limitedContent.length} chars from ${domain}${imageUrl ? ' + image' : ''}`);

    return {
      content: limitedContent,
      imageUrl,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[ContentScraper] Error for ${url}:`, errorMessage);
    
    return {
      content: '',
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Batch scrape multiple articles
 */
export async function scrapeMultipleArticles(
  urls: string[]
): Promise<Map<string, ScrapedContent>> {
  const results = new Map<string, ScrapedContent>();
  
  // Process in batches of 3 to avoid overwhelming servers
  const batchSize = 3;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const content = await scrapeArticleContent(url);
        return { url, content };
      })
    );
    
    for (const { url, content } of batchResults) {
      results.set(url, content);
    }
    
    // Small delay between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
