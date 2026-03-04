import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with locale and options
 */
export function formatNumber(
  value: number,
  options?: {
    style?: 'decimal' | 'currency' | 'percent';
    currency?: string;
    decimals?: number;
    compact?: boolean;
  }
): string {
  const { style = 'decimal', currency = 'ARS', decimals = 2, compact = false } = options || {};

  const formatOptions: Intl.NumberFormatOptions = {
    style,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };

  if (style === 'currency') {
    formatOptions.currency = currency;
  }

  if (compact) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  return new Intl.NumberFormat('es-AR', formatOptions).format(value);
}

/**
 * Format percentage with sign
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency = 'ARS'): string {
  return formatNumber(value, { style: 'currency', currency, decimals: 2 });
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompact(value: number): string {
  return formatNumber(value, { compact: true, decimals: 1 });
}

/**
 * Get variation class based on value
 */
export function getVariationClass(value: number): string {
  if (value > 0) return 'value-positive';
  if (value < 0) return 'value-negative';
  return 'value-neutral';
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format date with locale
 */
export function formatDate(
  date: Date | string,
  options?: {
    format?: 'short' | 'medium' | 'long' | 'time' | 'datetime';
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { format = 'medium' } = options || {};

  const formats: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat('es-AR', formats[format]).format(d);
}

/**
 * Format relative time (hace X minutos)
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return formatDate(d, { format: 'short' });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate sparkline data points for visualization
 */
export function generateSparklinePoints(
  data: number[],
  width: number,
  height: number,
  padding = 2
): string {
  if (data.length < 2) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return points.join(' ');
}

/**
 * Slugify string for URLs
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Check if value is valid (not null, undefined, or NaN)
 */
export function isValidValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number' && isNaN(value)) return false;
  return true;
}

/**
 * Convert simple Markdown to HTML for rendering editorial articles.
 * Handles: headings, bold, italic, images, links, blockquotes, 
 * code, lists, horizontal rules, and paragraphs.
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';

  // If content already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(md) && (md.includes('<p>') || md.includes('<div>') || md.includes('<h'))) {
    return md;
  }

  let html = md
    // Escape HTML entities (but preserve existing image/link markdown)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings (process before paragraphs)
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold mt-6 mb-2 text-text-primary">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-6 mb-2 text-text-primary">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-text-primary">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-3 text-text-primary">$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-6 border-border" />')
    // Images (before links to avoid conflict)
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<figure class="my-6"><img src="$2" alt="$1" class="rounded-lg w-full" loading="lazy" /><figcaption class="text-center text-xs text-text-muted mt-2">$1</figcaption></figure>'
    )
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold & Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-4 my-4 italic text-text-secondary">$1</blockquote>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-surface-secondary px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Unordered lists (consecutive lines starting with -)
    .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-text-secondary">$1</li>')
    // Ordered lists (consecutive lines starting with number.)
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal text-text-secondary">$1</li>');

  // Wrap consecutive <li> elements in <ul> or <ol>
  html = html.replace(
    /(<li class="ml-6 list-disc[^"]*">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ul class="my-4 space-y-1">${match}</ul>`
  );
  html = html.replace(
    /(<li class="ml-6 list-decimal[^"]*">[\s\S]*?<\/li>(\n)?)+/g,
    (match) => `<ol class="my-4 space-y-1">${match}</ol>`
  );

  // Wrap remaining text in paragraphs (split by double newlines)
  const blocks = html.split(/\n\n+/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Don't wrap if already a block element
      if (/^<(h[1-6]|hr|blockquote|figure|ul|ol|div|p)[\s/>]/i.test(trimmed)) {
        return trimmed;
      }
      // Replace single newlines with <br> within paragraphs
      return `<p class="text-text-secondary leading-relaxed mb-4">${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

/**
 * Wraps an external image URL in the proxy to bypass CORS and Hotlink protection
 */
export function getProxyImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // If it's already a proxy URL or a local path, return as is
  if (url.startsWith('/') || url.startsWith('/api/image-proxy')) {
    return url;
  }

  // Allowed domains that don't need proxying
  if (url.includes('rosariofinanzas.com.ar') || url.includes('unsplash.com')) {
    return url;
  }

  // Only proxy external URLs
  if (url.startsWith('http')) {
    // Optionally encode the URL if it's not already proxied
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return url;
}

