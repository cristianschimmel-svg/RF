'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatPercent } from '@/lib/utils';
import type { DollarQuote, Indicator } from '@/types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface MarketBarData {
  dollarQuotes: DollarQuote[];
  dollarMetrics: { brechaBlue?: number | null };
  riesgoPais: Indicator | null;
  mervalIndex: { symbol: string; name: string; value: number; change: number; changePercent: number } | null;
  lastUpdated: string;
}

interface MarketBarProps {
  initialData: MarketBarData;
  refreshInterval?: number; // milliseconds, default 60000 (1 min)
}

type Trend = 'up' | 'down' | 'neutral';

function getTrend(value: number): Trend {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}

function fmt(value: number, decimals = 0): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const dollarLabels: Record<string, string> = {
  oficial: 'Oficial',
  turista: 'Tarjeta',
  blue: 'Blue',
  mep: 'MEP',
  ccl: 'CCL',
};

function BarItem({ label, value, changePercent, sub, href }: {
  label: string;
  value: string;
  changePercent: number;
  sub?: string;
  href?: string;
}) {
  const trend = getTrend(changePercent);

  const Wrapper = href ? Link : 'div';
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper {...wrapperProps as any} className={`flex items-center gap-2.5 px-3 py-1.5 bg-surface-elevated rounded border border-[var(--border-muted)] min-w-[120px]${href ? ' cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-colors' : ''}`}>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] leading-none">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm font-bold font-mono text-[var(--text-primary)] leading-tight whitespace-nowrap">
            {value}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold leading-none ${
            trend === 'up' ? 'text-positive' : trend === 'down' ? 'text-negative' : 'text-[var(--text-disabled)]'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : trend === 'down' ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {formatPercent(changePercent)}
          </span>
        </div>
        {sub && (
          <span className="text-[9px] text-[var(--text-disabled)] leading-none mt-0.5 whitespace-nowrap">{sub}</span>
        )}
      </div>
    </Wrapper>
  );
}

export function MarketBar({ initialData, refreshInterval = 60000 }: MarketBarProps) {
  const [data, setData] = useState<MarketBarData>(initialData);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/indicators/market-bar');
      if (res.ok) {
        const json = await res.json();
        if (json.dollarQuotes) {
          setData(json);
        }
      }
    } catch {
      // Keep showing last known data on error
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const { dollarQuotes, dollarMetrics, riesgoPais, mervalIndex } = data;

  const dollarTypes = ['oficial', 'turista', 'blue', 'mep', 'ccl'] as const;
  const dollars = dollarTypes
    .map(type => dollarQuotes.find(q => q.type === type))
    .filter((q): q is DollarQuote => q != null);

  if (dollars.length === 0 && !mervalIndex && !riesgoPais) return null;

  const brechaBlue = dollarMetrics?.brechaBlue;

  return (
    <div className="w-full bg-surface border-b border-[var(--border-muted)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {dollars.map(q => (
            <BarItem
              key={q.type}
              label={dollarLabels[q.type] || q.name}
              value={`$${fmt(q.sell)}`}
              changePercent={q.changePercent}
              sub={`C $${fmt(q.buy)} / V $${fmt(q.sell)}`}
              href="/indicadores/dolar"
            />
          ))}

          {mervalIndex && (
            <BarItem
              label="MERVAL"
              value={`${fmt(mervalIndex.value)} pts`}
              changePercent={mervalIndex.changePercent}
              href="/indicadores/dolar"
            />
          )}

          {riesgoPais && (
            <BarItem
              label="Riesgo País"
              value={`${fmt(riesgoPais.value)} pb`}
              changePercent={riesgoPais.changePercent}
              href="/indicadores/dolar"
            />
          )}

          {brechaBlue != null && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/10 rounded border border-amber-500/20 min-w-[120px]">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-400 leading-none">
                  Brecha Blue
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 leading-tight whitespace-nowrap">
                    {fmt(brechaBlue, 1)}%
                  </span>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
