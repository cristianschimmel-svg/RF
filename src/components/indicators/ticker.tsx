'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatNumber, formatPercent } from '@/lib/utils';
import { MiniSparkline } from './sparkline';
import type { TickerItem as TickerItemType, Trend } from '@/types';
import { Pause, Play } from 'lucide-react';

export interface TickerProps {
  items: TickerItemType[];
  speed?: number; // seconds for full cycle
  pauseOnHover?: boolean;
  className?: string;
}

export function Ticker({
  items,
  speed = 45,
  pauseOnHover = true,
  className,
}: TickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Double items for seamless loop
  const doubledItems = [...items, ...items];

  return (
    <div
      className={cn(
        'relative h-9 bg-slate-900 border-b border-slate-700 overflow-hidden',
        className
      )}
    >
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

      {/* Pause button */}
      <button
        onClick={() => setIsPaused(!isPaused)}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded hover:bg-slate-800 text-slate-400"
        aria-label={isPaused ? 'Resume ticker' : 'Pause ticker'}
      >
        {isPaused ? (
          <Play className="w-3 h-3" />
        ) : (
          <Pause className="w-3 h-3" />
        )}
      </button>

      {/* Ticker content */}
      <div
        ref={containerRef}
        className={cn(
          'flex items-center h-full whitespace-nowrap',
          !isPaused && 'animate-ticker'
        )}
        style={{
          animationDuration: `${speed}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
        onMouseEnter={() => pauseOnHover && setIsPaused(true)}
        onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      >
        {doubledItems.map((item, index) => (
          <TickerItem key={`${item.id}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

interface TickerItemProps {
  item: TickerItemType;
}

function TickerItem({ item }: TickerItemProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className="flex items-center gap-2 px-4 border-r border-slate-700 last:border-r-0">
      <span className="text-xs text-slate-400 font-medium">{item.label}</span>
      <span className="text-sm font-semibold text-data text-white">
        {item.value}
      </span>
      {item.change && (
        <span className={cn('text-xs font-medium text-data', trendColors[item.trend])}>
          {item.change}
        </span>
      )}
    </div>
  );
}

// Static ticker for SSR/initial render
export function TickerStatic({
  items,
  className,
}: {
  items: TickerItemType[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center h-9 bg-slate-900 border-b border-slate-700 overflow-x-auto scrollbar-none',
        className
      )}
    >
      {items.map((item) => (
        <TickerItem key={item.id} item={item} />
      ))}
    </div>
  );
}

// Enhanced ticker with sparklines
export interface EnhancedTickerItem extends TickerItemType {
  sparklineData?: number[];
}

export function EnhancedTicker({
  items,
  speed = 60,
  className,
}: {
  items: EnhancedTickerItem[];
  speed?: number;
  className?: string;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const doubledItems = [...items, ...items];

  return (
    <div
      className={cn(
        'relative h-8 bg-slate-900 border-b border-slate-700 overflow-hidden',
        className
      )}
    >
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />

      <div
        className={cn(
          'flex items-center h-full whitespace-nowrap',
          !isPaused && 'animate-ticker'
        )}
        style={{
          animationDuration: `${speed}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {doubledItems.map((item, index) => (
          <EnhancedTickerItemComponent key={`${item.id}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function EnhancedTickerItemComponent({ item }: { item: EnhancedTickerItem }) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className="flex items-center gap-1.5 px-3 border-r border-slate-700">
      <span className="text-[11px] text-slate-400 font-medium">{item.label}</span>
      {item.sparklineData && item.sparklineData.length > 1 && (
        <MiniSparkline data={item.sparklineData} trend={item.trend} />
      )}
      <span className="text-xs font-semibold text-data text-white">
        {item.value}
      </span>
      {item.change && (
        <span className={cn('text-[11px] font-medium text-data', trendColors[item.trend])}>
          {item.change}
        </span>
      )}
    </div>
  );
}
