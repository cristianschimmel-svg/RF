/**
 * RSS Feed Scraper
 * Scrapes news from RSS feeds (more reliable than HTML scraping)
 * Priority: Rosario/Santa Fe region, Agro, Agroindustry
 */

import { BaseScraper } from './base-scraper';
import type { NewsSource, ScrapedArticle, ScrapeResult } from './types';

interface RSSFeedConfig {
  source: NewsSource;
  feedUrl: string;
  category: string;
  priority: number; // Higher = more important (1-10)
  keywords?: string[]; // Keywords to boost priority
}

// Keywords for priority scoring
const PRIORITY_KEYWORDS = {
  rosario: ['rosario', 'rosarino', 'santa fe', 'santafesino', 'litoral', 'paraná'],
  agro: ['soja', 'maíz', 'trigo', 'girasol', 'agro', 'agroindustria', 'cosecha', 'siembra', 'campo', 'rural', 'ganadería', 'granos', 'commodities', 'oleaginosas'],
  finanzas: ['merval', 'bolsa', 'acciones', 'bonos', 'riesgo país', 'dólar', 'inflación', 'bcra', 'economia'],
};

// RSS feeds for Argentine financial news
// ONLY section-specific feeds (Economía, Finanzas, Negocios, Agro, Cripto)
// Never use general/homepage feeds to avoid irrelevant content
export const RSS_FEEDS: RSSFeedConfig[] = [
  // =====================================================
  // AGRO SPECIALIZED (already section-specific)
  // =====================================================
  {
    source: {
      id: 'infocampo',
      name: 'Infocampo',
      baseUrl: 'https://www.infocampo.com.ar',
      category: 'agro',
      enabled: true,
    },
    feedUrl: 'https://www.infocampo.com.ar/feed/',
    category: 'Agro',
    priority: 9,
    keywords: PRIORITY_KEYWORDS.agro,
  },
  {
    source: {
      id: 'bichosdecampo',
      name: 'Bichos de Campo',
      baseUrl: 'https://bichosdecampo.com',
      category: 'agro',
      enabled: true,
    },
    feedUrl: 'https://bichosdecampo.com/feed/',
    category: 'Agro',
    priority: 9,
    keywords: PRIORITY_KEYWORDS.agro,
  },
  {
    source: {
      id: 'valorsoja',
      name: 'Valor Soja',
      baseUrl: 'https://www.valorsoja.com',
      category: 'agro',
      enabled: true,
    },
    feedUrl: 'https://www.valorsoja.com/feed/',
    category: 'Agro',
    priority: 9,
    keywords: [...PRIORITY_KEYWORDS.agro, ...PRIORITY_KEYWORDS.rosario],
  },
  {
    source: {
      id: 'clarin-rural',
      name: 'Clarín Rural',
      baseUrl: 'https://www.clarin.com',
      category: 'agro',
      enabled: true,
    },
    feedUrl: 'https://www.clarin.com/rss/rural/',
    category: 'Agro',
    priority: 8,
    keywords: PRIORITY_KEYWORDS.agro,
  },

  // =====================================================
  // ÁMBITO FINANCIERO — Secciones: Economía, Finanzas, Negocios
  // =====================================================
  {
    source: {
      id: 'ambito-economia',
      name: 'Ámbito Economía',
      baseUrl: 'https://www.ambito.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.ambito.com/rss/economia.xml',
    category: 'Economía',
    priority: 8,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },
  {
    source: {
      id: 'ambito-finanzas',
      name: 'Ámbito Finanzas',
      baseUrl: 'https://www.ambito.com',
      category: 'finanzas',
      enabled: true,
    },
    feedUrl: 'https://www.ambito.com/rss/finanzas.xml',
    category: 'Finanzas',
    priority: 8,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },
  {
    source: {
      id: 'ambito-negocios',
      name: 'Ámbito Negocios',
      baseUrl: 'https://www.ambito.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.ambito.com/rss/negocios.xml',
    category: 'Economía',
    priority: 7,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },

  // =====================================================
  // LA NACIÓN — Sección: Economía
  // =====================================================
  {
    source: {
      id: 'lanacion-economia',
      name: 'La Nación Economía',
      baseUrl: 'https://www.lanacion.com.ar',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/?outputType=xml&_website=lanacion',
    category: 'Economía',
    priority: 7,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },

  // =====================================================
  // CLARÍN — Sección: Economía
  // =====================================================
  {
    source: {
      id: 'clarin-economia',
      name: 'Clarín Economía',
      baseUrl: 'https://www.clarin.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.clarin.com/rss/economia/',
    category: 'Economía',
    priority: 7,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },

  // =====================================================
  // EL CRONISTA — Secciones: Finanzas-Mercados, Economía-Política
  // =====================================================
  {
    source: {
      id: 'cronista-finanzas',
      name: 'El Cronista Finanzas',
      baseUrl: 'https://www.cronista.com',
      category: 'finanzas',
      enabled: true,
    },
    feedUrl: 'https://www.cronista.com/arc/outboundfeeds/rss/category/finanzas-mercados/?outputType=xml',
    category: 'Finanzas',
    priority: 7,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },
  {
    source: {
      id: 'cronista-economia',
      name: 'El Cronista Economía',
      baseUrl: 'https://www.cronista.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.cronista.com/arc/outboundfeeds/rss/category/economia-politica/?outputType=xml',
    category: 'Economía',
    priority: 6,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },

  // =====================================================
    // iPROFESIONAL — Removed upon blacklist request
    // =====================================================
  // =====================================================
  // BLOOMBERG LÍNEA — Secciones: Mercados, Economía, Negocios
  // =====================================================
  {
    source: {
      id: 'bloomberg-mercados',
      name: 'Bloomberg Mercados',
      baseUrl: 'https://www.bloomberglinea.com',
      category: 'finanzas',
      enabled: true,
    },
    feedUrl: 'https://www.bloomberglinea.com/arc/outboundfeeds/rss/category/mercados/?outputType=xml',
    category: 'Mercados',
    priority: 7,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },
  {
    source: {
      id: 'bloomberg-economia',
      name: 'Bloomberg Economía',
      baseUrl: 'https://www.bloomberglinea.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.bloomberglinea.com/arc/outboundfeeds/rss/category/economia/?outputType=xml',
    category: 'Economía',
    priority: 6,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },
  {
    source: {
      id: 'bloomberg-negocios',
      name: 'Bloomberg Negocios',
      baseUrl: 'https://www.bloomberglinea.com',
      category: 'economia',
      enabled: true,
    },
    feedUrl: 'https://www.bloomberglinea.com/arc/outboundfeeds/rss/category/negocios/?outputType=xml',
    category: 'Economía',
    priority: 5,
    keywords: PRIORITY_KEYWORDS.finanzas,
  },

  // =====================================================
  // CRIPTO (already specialized portals)
  // =====================================================
  // COINTELEGRAPH ES — Removed upon blacklist request
  // =====================================================
  {
    source: {
      id: 'criptonoticias',
      name: 'CriptoNoticias',
      baseUrl: 'https://www.criptonoticias.com',
      category: 'cripto',
      enabled: true,
    },
    feedUrl: 'https://www.criptonoticias.com/feed/',
    category: 'Cripto',
    priority: 7,
    keywords: ['bitcoin', 'ethereum', 'cripto', 'blockchain', 'btc', 'stablecoin'],
  },
];

export class RSSScraper extends BaseScraper {
  private feedUrl: string;
  private feedCategory: string;
  private priority: number;
  private keywords: string[];

  constructor(config: RSSFeedConfig) {
    super(config.source);
    this.feedUrl = config.feedUrl;
    this.feedCategory = config.category;
    this.priority = config.priority || 5;
    this.keywords = config.keywords || [];
  }

  async scrape(): Promise<ScrapeResult> {
    try {
      const xml = await this.fetchPage(this.feedUrl);
      const articles = this.parseRSS(xml);

      return {
        success: true,
        articles,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error scraping RSS feed ${this.feedUrl}:`, error);
      return {
        success: false,
        articles: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        scrapedAt: new Date(),
      };
    }
  }

  /**
   * Calculate priority score based on keywords in title/excerpt
   */
  private calculatePriorityScore(title: string, excerpt: string): number {
    const text = `${title} ${excerpt}`.toLowerCase();
    let score = this.priority;

    // Boost for Rosario/Santa Fe keywords (+5)
    for (const keyword of PRIORITY_KEYWORDS.rosario) {
      if (text.includes(keyword)) {
        score += 5;
        break;
      }
    }

    // Boost for agro keywords (+3)
    for (const keyword of PRIORITY_KEYWORDS.agro) {
      if (text.includes(keyword)) {
        score += 3;
        break;
      }
    }

    // Boost for finance keywords (+1)
    for (const keyword of PRIORITY_KEYWORDS.finanzas) {
      if (text.includes(keyword)) {
        score += 1;
        break;
      }
    }

    return score;
  }

  private parseRSS(xml: string): ScrapedArticle[] {
    const articles: ScrapedArticle[] = [];

    // Simple XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.match(itemRegex) || [];

    for (const item of items.slice(0, 10)) { // Limit to 10 articles per feed
      try {
        const title = this.extractTag(item, 'title');
        const link = this.extractTag(item, 'link');
        const description = this.extractTag(item, 'description');
        const pubDate = this.extractTag(item, 'pubDate');
        const enclosure = this.extractEnclosure(item);
        const mediaContent = this.extractMediaContent(item);

        if (title && link) {
          // Use RSS image if available, fallback to category image
          const rssImageUrl = enclosure || mediaContent;
          const categoryImage = this.getDefaultImage();
          const cleanTitle = this.cleanText(title);
          const rawExcerpt = this.cleanText(description || '');
          // Truncate excerpt intelligently: at end of sentence or word boundary, not mid-word
          const cleanExcerpt = this.smartTruncate(rawExcerpt, 300);
          const priorityScore = this.calculatePriorityScore(cleanTitle, cleanExcerpt);
          
          articles.push({
            id: this.generateId(link),
            title: cleanTitle,
            excerpt: cleanExcerpt,
            url: link,
            imageUrl: rssImageUrl || categoryImage,
            source: this.source,
            category: this.feedCategory,
            publishedAt: this.parseDate(pubDate || ''),
            scrapedAt: new Date(),
            priority: priorityScore,
          });
        }
      } catch (e) {
        console.error('Error parsing RSS item:', e);
      }
    }

    return articles;
  }

  private extractTag(xml: string, tag: string): string {
    // Handle CDATA
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1];

    // Regular tag
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : '';
  }

  private extractEnclosure(xml: string): string | undefined {
    const match = xml.match(/<enclosure[^>]*url="([^"]+)"[^>]*>/i);
    return match ? this.decodeHtmlEntities(match[1]) : undefined;
  }

  private extractMediaContent(xml: string): string | undefined {
    const match = xml.match(/<media:content[^>]*url="([^"]+)"[^>]*>/i);
    return match ? this.decodeHtmlEntities(match[1]) : undefined;
  }

  /**
   * Decode HTML entities in URLs (e.g., &amp; -> &)
   */
  private decodeHtmlEntities(url: string): string {
    return url
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Truncate text at the nearest sentence or word boundary
   */
  private smartTruncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // Try to find the last sentence ending within maxLength
    const trimmed = text.substring(0, maxLength);
    const lastSentence = trimmed.lastIndexOf('. ');
    if (lastSentence > maxLength * 0.5) {
      return trimmed.substring(0, lastSentence + 1);
    }
    
    // Fall back to last word boundary
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.5) {
      return trimmed.substring(0, lastSpace) + '...';
    }
    
    return trimmed + '...';
  }

  private getDefaultImage(): string {
    // Use category-specific Unsplash images for reliable loading
    const categoryImages: Record<string, string[]> = {
      'Economía': [
        'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&h=400&fit=crop',
      ],
      'Finanzas': [
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop',
      ],
      'Mercados': [
        'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop',
      ],
      'Agro': [
        'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=400&fit=crop',
      ],
      'Rosario': [
        'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=400&fit=crop',
      ],
      'Internacional': [
        'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=400&fit=crop',
      ],
      'Cripto': [
        'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&h=400&fit=crop',
        'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
      ],
    };
    const images = categoryImages[this.feedCategory] || categoryImages['Economía'];
    return images[Math.floor(Math.random() * images.length)];
  }
}
