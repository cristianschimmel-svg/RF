/**
 * Types for the News Processor Service
 * Defines the structure for processed news with AI summaries
 */

export interface ProcessedNews {
  id: string;
  // Original content
  title: string;
  header: string;        // Original excerpt/bajada
  originalContent: string; // Scraped full content
  // AI-generated content
  aiSummary: string;     // 3+ paragraphs summary by AI
  aiKeyPoints: string[]; // Key points extracted
  aiSentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  aiRelevance?: string;  // Why this news matters
  aiImageUrl?: string;   // Fallback image (category-based from Unsplash)
  // Source image
  sourceImageUrl?: string; // Original image from RSS/og:image
  // Source info
  sourceUrl: string;
  sourceName: string;
  sourceId: string;
  // Metadata
  category: string;
  priority: number;
  publishedAt: string;   // ISO date string
  processedAt: string;   // ISO date string
  // Status
  isProcessed: boolean;
  processingError?: string;
  // Clipping (A3 Mercados)
  isClipping?: boolean;
  clippingCategory?: string;
  clippingScore?: number | null;
  clippingReason?: string | null;
  clippingMatchContext?: string | null;
}

export interface NewsStore {
  version: number;
  lastUpdated: string;
  articles: ProcessedNews[];
}

export interface ProcessingResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: string[];
  duration: number;
}

export const STORE_CONFIG = {
  maxArticles: 30,        // Keep only 30 most recent
  updateInterval: 30,     // Minutes between updates
  storePath: 'data/processed-news.json',
};
