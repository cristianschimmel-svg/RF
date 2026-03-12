'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, ExternalLink, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface ClippingArticle {
  id: string;
  title: string;
  header: string;
  aiSummary: string;
  aiKeyPoints: string[];
  aiSentiment?: string;
  aiRelevance?: string;
  sourceUrl: string;
  sourceName: string;
  sourceImageUrl?: string;
  category: string;
  clippingCategory?: string;
  clippingScore?: number | null;
  clippingReason?: string | null;
  clippingMatchContext?: string | null;
  priority: number;
  publishedAt: string;
  processedAt: string;
}

// Category config
const CLIPPING_CATEGORIES: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  institucional: {
    label: 'Institucional',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  producto: {
    label: 'Producto',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  sector: {
    label: 'Sector',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
  },
  ecosistema: {
    label: 'Ecosistema',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
};

// Sentiment config
const SENTIMENT_CONFIG: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; label: string }> = {
  very_positive: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Muy positivo' },
  positive: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Positivo' },
  neutral: { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-500/10', label: 'Neutro' },
  negative: { icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Negativo' },
  very_negative: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Muy negativo' },
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export function ClippingNewsCard({ article, isNew, featured }: { article: ClippingArticle; isNew?: boolean; featured?: boolean }) {
  const catConfig = CLIPPING_CATEGORIES[article.clippingCategory || ''] || CLIPPING_CATEGORIES.ecosistema;
  const sentiment = SENTIMENT_CONFIG[article.aiSentiment || 'neutral'] || SENTIMENT_CONFIG.neutral;
  const SentimentIcon = sentiment.icon;
  const previewLen = featured ? 500 : 300;
  const preview = article.aiSummary ? stripHtml(article.aiSummary).slice(0, previewLen) : stripHtml(article.header).slice(0, previewLen);

  return (
    <div className={`bg-surface-elevated dark:bg-[#111] border rounded-xl ${featured ? 'p-5' : 'p-4'} hover:border-indigo-500/30 transition-all group ${
      featured ? 'border-blue-500/40 ring-1 ring-blue-500/20' :
      isNew ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-[var(--border)]'
    }`}>
      <div className="flex items-start gap-4">
        {/* Left: sentiment indicator */}
        <div className={`flex-shrink-0 ${featured ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg ${sentiment.bg} flex items-center justify-center`}>
          <SentimentIcon className={`${featured ? 'w-6 h-6' : 'w-5 h-5'} ${sentiment.color}`} />
        </div>

        {/* Center: content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isNew && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 border border-indigo-500/30 animate-pulse">
                NUEVA
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider ${catConfig.bgColor} ${catConfig.color} border ${catConfig.borderColor}`}>
              {catConfig.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium ${sentiment.bg} ${sentiment.color}`}>
              {sentiment.label}
            </span>
            <span className="text-2xs text-text-muted dark:text-slate-500">
              {article.sourceName}
            </span>
            <span className="text-2xs text-text-disabled dark:text-slate-600">·</span>
            <span className="text-2xs text-text-muted dark:text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(new Date(article.publishedAt))}
            </span>
          </div>

          {/* Title */}
          <h3 className={`${featured ? 'text-base' : 'text-sm'} font-semibold text-text-primary dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2 mb-1.5`}>
            {article.title}
          </h3>

          {/* Preview */}
          <p className={`${featured ? 'text-sm line-clamp-3' : 'text-xs line-clamp-2'} text-text-muted dark:text-slate-400 mb-2`}>
            {preview}
          </p>

          {/* Relevance score + reason */}
          {article.clippingScore != null && (
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold ${
                article.clippingScore >= 8 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                article.clippingScore >= 5 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {article.clippingScore}/10
              </span>
              {article.clippingReason && (
                <span className="text-2xs text-text-muted dark:text-slate-500 italic line-clamp-1">
                  {article.clippingReason}
                </span>
              )}
            </div>
          )}

          {/* AI Relevance */}
          {article.aiRelevance && (
            <p className="text-2xs text-indigo-500/70 dark:text-indigo-300/70 italic mb-2 line-clamp-1">
              💡 {article.aiRelevance}
            </p>
          )}

          {/* Keyword context paragraph */}
          {article.clippingMatchContext && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-3 py-2 mb-2">
              <p className="text-xs text-text-secondary dark:text-slate-300 leading-relaxed line-clamp-4">
                “{article.clippingMatchContext}”
              </p>
            </div>
          )}

          {/* Key points (collapsed) */}
          {article.aiKeyPoints && article.aiKeyPoints.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {article.aiKeyPoints.slice(0, 3).map((point, i) => (
                <span key={i} className="text-2xs bg-[var(--bg-secondary)] text-text-muted dark:text-slate-400 px-2 py-0.5 rounded-full line-clamp-1 max-w-[200px]">
                  {point}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Ir a la nota
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CLIPPING_CATEGORIES, SENTIMENT_CONFIG };
export type { ClippingArticle };
