'use client';

import { cn, formatNumber, formatPercent } from '@/lib/utils';
import type { Indicator, Trend } from '@/types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Radio } from 'lucide-react';

export interface MiniIndicatorProps {
  indicator: Indicator;
  className?: string;
  showIcon?: boolean;
}

export function MiniIndicator({
  indicator,
  className,
  showIcon = true,
}: MiniIndicatorProps) {
  const trend: Trend =
    indicator.changePercent > 0
      ? 'up'
      : indicator.changePercent < 0
      ? 'down'
      : 'neutral';

  const isFallback = indicator.isFallback || indicator.source === 'fallback' || indicator.source === 'manual';

  const trendColors = {
    up: {
      bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: 'text-emerald-500 dark:text-emerald-400',
    },
    down: {
      bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50',
      border: 'border-rose-200 dark:border-rose-800/50',
      text: 'text-rose-700 dark:text-rose-400',
      icon: 'text-rose-500 dark:text-rose-400',
    },
    neutral: {
      bg: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700/50',
      text: 'text-slate-600 dark:text-slate-300',
      icon: 'text-slate-400 dark:text-slate-500',
    },
  };

  const colors = trendColors[trend];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const formatValue = (value: number) => {
    switch (indicator.format) {
      case 'currency':
        return formatNumber(value, {
          style: 'currency',
          currency: indicator.unit || 'ARS',
          decimals: indicator.decimals,
        });
      case 'percent':
        return `${value.toFixed(indicator.decimals ?? 1)}%`;
      default:
        return formatNumber(value, { decimals: indicator.decimals ?? 2 });
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border transition-colors cursor-default relative',
        colors.bg,
        colors.border,
        isFallback && 'border-dashed',
        className
      )}
      title={isFallback ? (indicator.disclaimer || 'Datos de referencia') : 'Datos en tiempo real'}
    >
      {/* Live/Reference indicator */}
      {!isFallback && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-2 min-w-0">
        {showIcon && (
          isFallback || indicator.noData ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
          ) : (
            <TrendIcon className={cn('w-4 h-4 flex-shrink-0', colors.icon)} />
          )
        )}
        <span className="text-sm font-medium text-text-secondary dark:text-slate-300 truncate">
          {indicator.shortName || indicator.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-lg font-bold tabular-nums', isFallback || indicator.noData ? 'text-text-muted' : colors.text)}>
          {indicator.noData ? 'N/D' : formatValue(indicator.value)}
        </span>
        {!indicator.noData && (
          <span className={cn('text-sm font-medium tabular-nums', isFallback ? 'text-text-muted' : colors.text)}>
            {indicator.changePercent >= 0 ? '+' : ''}
            {indicator.changePercent?.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Compact Dollar Card
export interface MiniDollarCardProps {
  name: string;
  buy: number;
  sell: number;
  change: number;
  changePercent: number;
  className?: string;
}

export function MiniDollarCard({
  name,
  buy,
  sell,
  changePercent,
  className,
}: MiniDollarCardProps) {
  const trend: Trend =
    changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral';

  const trendColors = {
    up: {
      bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      value: 'text-emerald-700 dark:text-emerald-400',
      change: 'text-emerald-600 dark:text-emerald-400',
    },
    down: {
      bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50',
      border: 'border-rose-200 dark:border-rose-800/50',
      value: 'text-rose-700 dark:text-rose-400',
      change: 'text-rose-600 dark:text-rose-400',
    },
    neutral: {
      bg: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700/50',
      value: 'text-slate-700 dark:text-slate-300',
      change: 'text-slate-500 dark:text-slate-400',
    },
  };

  const colors = trendColors[trend];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors',
        colors.bg,
        colors.border,
        className
      )}
    >
      <TrendIcon className={cn('w-4 h-4 flex-shrink-0', colors.value)} />
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-text-primary dark:text-white truncate">
          {name}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-base font-bold tabular-nums', colors.value)}>
            ${formatNumber(sell, { decimals: 0 })}
          </span>
          <span className="text-2xs text-text-muted dark:text-slate-400">
            C: ${formatNumber(buy, { decimals: 0 })}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className={cn('text-xs font-bold tabular-nums', colors.change)}>
          {changePercent >= 0 ? '+' : ''}{changePercent?.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

// Section Container with title
export interface IndicatorSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function IndicatorSection({
  title,
  icon,
  children,
  className,
  headerAction,
}: IndicatorSectionProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-muted bg-surface-secondary/30 p-4',
        'dark:bg-slate-900/30 dark:border-slate-800/50',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent dark:text-cyan-400">{icon}</span>
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">{title}</h3>
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
