// ============================================
// Indicator & Financial Data Types
// ============================================

export type IndicatorCategory = 
  | 'cambios'
  | 'inflacion'
  | 'tasas'
  | 'actividad'
  | 'mercados'
  | 'agro'
  | 'cripto'
  | 'energia';

export type IndicatorSource = 
  | 'bcra'
  | 'indec'
  | 'ambito'
  | 'rava'
  | 'binance'
  | 'yahoo'
  | 'manual'
  | 'fallback'
  | 'ArgentinaDatos'
  | 'ArgentinaDatos (INDEC)'
  | 'ArgentinaDatos (JP Morgan)'
  | 'ArgentinaDatos (respaldo)'
  | 'Sin datos'
  | string; // Para fuentes adicionales

export interface Indicator {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  unit: string;
  format: 'currency' | 'number' | 'percent';
  decimals: number;
  source: IndicatorSource;
  sourceUrl?: string;
  lastUpdated: string;
  frequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  sparklineData?: number[];
  isFallback?: boolean;
  noData?: boolean; // Indica que no hay datos disponibles (mostrar 0)
  disclaimer?: string;
  metadata?: Record<string, unknown>;
}

export interface IndicatorGroup {
  id: string;
  name: string;
  category: IndicatorCategory;
  description?: string;
  indicators: Indicator[];
}

// ============================================
// Dollar/Exchange specific types
// ============================================

export type DollarType = 
  | 'oficial'
  | 'blue'
  | 'mep'
  | 'ccl'
  | 'cripto'
  | 'mayorista'
  | 'turista';

export interface DollarQuote {
  type: DollarType;
  name: string;
  buy: number;
  sell: number;
  spread: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  source: IndicatorSource;
}

// ============================================
// Foreign Currency Types
// ============================================

export type CurrencyCode = 'EUR' | 'BRL' | 'UYU' | 'CLP' | 'GBP';

export interface CurrencyQuote {
  code: CurrencyCode;
  name: string;
  buy: number;
  sell: number;
  previousSell?: number;
  changePercent: number;
  lastUpdated: string;
  source: IndicatorSource;
  flag: string; // Emoji flag
}

// ============================================
// News & Content Types
// ============================================

export type NewsCategory = 
  | 'economia'
  | 'mercados'
  | 'politica'
  | 'agro'
  | 'finanzas-personales'
  | 'empresas'
  | 'internacional'
  | 'opinion';

export type NewsStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: NewsCategory;
  tags: string[];
  author: Author;
  featuredImage?: string;
  gallery?: string[];
  status: NewsStatus;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  seo: SEOMeta;
}

export interface Author {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  bio?: string;
}

export interface SEOMeta {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  keywords?: string[];
  canonicalUrl?: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: {
    lastUpdated: string;
    source: string;
    cached: boolean;
    ttl?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// UI Component Types
// ============================================

export type Trend = 'up' | 'down' | 'neutral';

export interface SparklineData {
  values: number[];
  trend: Trend;
  min: number;
  max: number;
}

export interface TickerItem {
  id: string;
  label: string;
  value: string;
  change?: string;
  trend: Trend;
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  sticky?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// ============================================
// User & Auth Types
// ============================================

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Session {
  user: User;
  expires: string;
}

// ============================================
// Config & Settings Types
// ============================================

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface IndicatorConfig {
  refreshInterval: number;
  cacheTime: number;
  maxRetries: number;
  sources: {
    id: IndicatorSource;
    name: string;
    baseUrl: string;
    enabled: boolean;
    priority: number;
  }[];
}
