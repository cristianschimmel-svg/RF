'use client';

import { cn, formatNumber, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge, VariationBadge } from '@/components/ui/badge';
import { Sparkline } from './sparkline';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { Indicator, Trend } from '@/types';
import { Info, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface IndicatorCardProps {
  indicator: Indicator;
  size?: 'sm' | 'md' | 'lg' | 'xs';
  showSparkline?: boolean;
  showSource?: boolean;
  className?: string;
  colorize?: boolean; // Add color based on trend
}

export function IndicatorCard({
  indicator,
  size = 'md',
  showSparkline = true,
  showSource = true,
  className,
  colorize = false,
}: IndicatorCardProps) {
  const trend: Trend =
    indicator.changePercent > 0
      ? 'up'
      : indicator.changePercent < 0
      ? 'down'
      : 'neutral';

  // Color classes based on trend
  const trendBgColors = {
    up: 'bg-emerald-50 border-emerald-200',
    down: 'bg-rose-50 border-rose-200',
    neutral: 'bg-surface border-border-muted',
  };

  const trendTextColors = {
    up: 'text-emerald-700',
    down: 'text-rose-700',
    neutral: 'text-text-primary',
  };

  const formatValue = (value: number) => {
    switch (indicator.format) {
      case 'currency':
        return formatNumber(value, {
          style: 'currency',
          currency: indicator.unit || 'ARS',
          decimals: indicator.decimals,
        });
      case 'percent':
        return `${value.toFixed(indicator.decimals)}%`;
      default:
        return formatNumber(value, { decimals: indicator.decimals });
    }
  };

  const sizes = {
    xs: {
      card: 'p-2',
      name: 'text-2xs',
      value: 'text-sm font-semibold',
      meta: 'text-2xs',
    },
    sm: {
      card: 'p-3',
      name: 'text-xs',
      value: 'text-lg font-semibold',
      meta: 'text-2xs',
    },
    md: {
      card: 'p-4',
      name: 'text-sm',
      value: 'text-xl font-semibold',
      meta: 'text-xs',
    },
    lg: {
      card: 'p-5',
      name: 'text-base',
      value: 'text-2xl font-bold',
      meta: 'text-sm',
    },
  };

  const s = sizes[size];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        s.card,
        colorize ? trendBgColors[trend] : '',
        className
      )}
      hoverable
    >
      {/* Fallback/Warning indicator */}
      {indicator.isFallback && (
        <SimpleTooltip content={indicator.disclaimer || 'Datos de fuente alternativa'}>
          <div className="absolute top-2 right-2 text-amber-500">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </SimpleTooltip>
      )}

      {/* Header: Name + Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('text-text-secondary truncate', s.name)}>
            {indicator.shortName || indicator.name}
          </span>
          {indicator.disclaimer && !indicator.isFallback && (
            <SimpleTooltip content={indicator.disclaimer}>
              <Info className="w-3 h-3 text-text-muted flex-shrink-0" />
            </SimpleTooltip>
          )}
        </div>
        {!indicator.noData && (
          <VariationBadge
            value={indicator.changePercent}
            size={size === 'lg' ? 'md' : 'sm'}
          />
        )}
      </div>

      {/* Main Value */}
      <div className={cn('text-text-primary text-data', s.value, indicator.noData && 'text-sm text-text-muted')}>
        {indicator.noData ? 'No disp.' : formatValue(indicator.value)}
      </div>

      {/* Sparkline */}
      {showSparkline && indicator.sparklineData && indicator.sparklineData.length > 1 && (
        <div className="mt-2">
          <Sparkline
            data={indicator.sparklineData}
            trend={trend}
            width={size === 'sm' ? 60 : 80}
            height={size === 'sm' ? 20 : 24}
          />
        </div>
      )}

      {/* Footer: Source + Last Updated */}
      {showSource && (
        <div className={cn('mt-2 flex items-center justify-between text-text-muted', s.meta)}>
          <span className="uppercase tracking-wide">
            {indicator.source}
          </span>
          <span>
            {new Date(indicator.lastUpdated).toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}
    </Card>
  );
}

// Compact version for grids
export function IndicatorCardCompact({
  indicator,
  className,
}: {
  indicator: Indicator;
  className?: string;
}) {
  const trend: Trend =
    indicator.changePercent > 0
      ? 'up'
      : indicator.changePercent < 0
      ? 'down'
      : 'neutral';

  const trendColors = {
    up: 'text-positive',
    down: 'text-negative',
    neutral: 'text-text-secondary',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-lg',
        'bg-surface border border-border-muted',
        'hover:bg-interactive-hover transition-colors cursor-pointer',
        className
      )}
    >
      <div className="min-w-0">
        <div className="text-xs text-text-muted truncate">
          {indicator.shortName || indicator.name}
        </div>
        <div className="text-sm font-semibold text-data text-text-primary">
          {formatNumber(indicator.value, { decimals: indicator.decimals })}
        </div>
      </div>
      <div className={cn('text-sm font-medium text-data', trendColors[trend])}>
        {formatPercent(indicator.changePercent)}
      </div>
    </div>
  );
}

// Dollar-specific card with buy/sell
export interface DollarCardProps {
  name: string;
  buy: number;
  sell: number;
  change: number;
  changePercent: number;
  source: string;
  lastUpdated: string;
  className?: string;
}

export function DollarCard({
  name,
  buy,
  sell,
  change,
  changePercent,
  source,
  lastUpdated,
  className,
}: DollarCardProps) {
  const trend: Trend =
    changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral';

  return (
    <Card className={cn('p-4', className)} hoverable>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-text-secondary">{name}</span>
        <VariationBadge value={changePercent} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xs text-text-muted uppercase tracking-wide mb-0.5">
            Compra
          </div>
          <div className="text-lg font-semibold text-data text-text-primary">
            ${formatNumber(buy, { decimals: 0 })}
          </div>
        </div>
        <div>
          <div className="text-2xs text-text-muted uppercase tracking-wide mb-0.5">
            Venta
          </div>
          <div className="text-lg font-semibold text-data text-text-primary">
            ${formatNumber(sell, { decimals: 0 })}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-border-muted flex items-center justify-between text-2xs text-text-muted">
        <span className="uppercase">{source}</span>
        <span>
          {new Date(lastUpdated).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </Card>
  );
}
