'use client';

import { cn, formatNumber } from '@/lib/utils';
import type { DollarQuote, CurrencyQuote, Trend } from '@/types';
import { TrendingUp, TrendingDown, Minus, DollarSign, Globe, Clock } from 'lucide-react';
import Link from 'next/link';

// ============================================
// Dollar Card (Clarin-style, large format)
// ============================================

interface DollarCardClarinProps {
  quote: DollarQuote;
  variant?: 'primary' | 'secondary';
}

function DollarCardClarin({ quote, variant = 'secondary' }: DollarCardClarinProps) {
  const trend: Trend =
    quote.changePercent > 0 ? 'up' : quote.changePercent < 0 ? 'down' : 'neutral';

  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'relative rounded-xl border transition-all duration-200 overflow-hidden group',
        isPrimary
          ? 'bg-gradient-to-br from-ivory-50 to-ivory-100 border-accent/30 dark:from-slate-800 dark:to-slate-900 dark:border-amber-700/30 shadow-soft-md'
          : 'bg-surface border-border-muted hover:border-accent/20 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-slate-700 hover:shadow-soft',
      )}
    >
      {/* Header strip */}
      <div className={cn(
        'px-4 py-2 border-b flex items-center justify-between',
        isPrimary
          ? 'bg-accent/10 border-accent/20 dark:bg-amber-900/20 dark:border-amber-800/30'
          : 'bg-bg-secondary/50 border-border-muted dark:bg-slate-800/50 dark:border-slate-700/50',
      )}>
        <span className={cn(
          'text-sm font-bold',
          isPrimary ? 'text-accent dark:text-amber-400' : 'text-text-primary dark:text-white'
        )}>
          {quote.name}
        </span>
        {quote.changePercent !== 0 && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            trend === 'up'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
              : trend === 'down'
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
          )}>
            {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Buy */}
          <div className="text-center flex-1">
            <span className="block text-2xs uppercase tracking-wider text-text-muted dark:text-slate-500 mb-1 font-medium">
              Compra
            </span>
            <span className="block text-base font-bold tabular-nums text-text-primary dark:text-white">
              ${formatNumber(quote.buy, { decimals: quote.buy >= 100 ? 0 : 2 })}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-border-muted dark:bg-slate-700" />

          {/* Sell */}
          <div className="text-center flex-1">
            <span className="block text-2xs uppercase tracking-wider text-text-muted dark:text-slate-500 mb-1 font-medium">
              Venta
            </span>
            <span className={cn(
              'block text-lg font-bold tabular-nums',
              isPrimary ? 'text-accent dark:text-amber-400' : 'text-text-primary dark:text-white'
            )}>
              ${formatNumber(quote.sell, { decimals: quote.sell >= 100 ? 0 : 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Foreign Currency Row (Clarin-style table row)
// ============================================

interface CurrencyRowProps {
  currency: CurrencyQuote;
}

function CurrencyRow({ currency }: CurrencyRowProps) {
  const trend: Trend =
    currency.changePercent > 0 ? 'up' : currency.changePercent < 0 ? 'down' : 'neutral';

  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-500 dark:text-slate-400';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border-muted/60 dark:border-slate-800/60 last:border-b-0 hover:bg-bg-secondary/50 dark:hover:bg-slate-800/30 transition-colors">
      {/* Left: Flag + Name */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xl flex-shrink-0" role="img" aria-label={currency.name}>
          {currency.flag}
        </span>
        <div className="min-w-0">
          <span className="block text-sm font-semibold text-text-primary dark:text-white truncate">
            {currency.name}
          </span>
          <span className="block text-2xs text-text-muted dark:text-slate-500 font-mono">
            {currency.code}/ARS
          </span>
        </div>
      </div>

      {/* Center: Buy/Sell */}
      <div className="flex items-center gap-6 text-right">
        <div>
          <span className="block text-2xs uppercase tracking-wider text-text-muted dark:text-slate-500 font-medium">
            Compra
          </span>
          <span className="block text-sm font-bold tabular-nums text-text-primary dark:text-white">
            ${formatNumber(currency.buy, { decimals: currency.buy >= 100 ? 2 : 4 })}
          </span>
        </div>
        <div>
          <span className="block text-2xs uppercase tracking-wider text-text-muted dark:text-slate-500 font-medium">
            Venta
          </span>
          <span className="block text-sm font-bold tabular-nums text-text-primary dark:text-white">
            ${formatNumber(currency.sell, { decimals: currency.sell >= 100 ? 2 : 4 })}
          </span>
        </div>
      </div>

      {/* Right: Variation */}
      <div className={cn('flex items-center gap-1 ml-4 min-w-[65px] justify-end', trendColor)}>
        <TrendIcon className="w-3.5 h-3.5" />
        <span className="text-sm font-semibold tabular-nums">
          {currency.changePercent >= 0 ? '+' : ''}{currency.changePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// Main Widget: Cotizaciones (Clarin-inspired)
// ============================================

export interface CotizacionesWidgetProps {
  dollarQuotes: DollarQuote[];
  currencyQuotes: CurrencyQuote[];
  brechaBlue?: number | null;
  lastUpdated: string;
  className?: string;
}

export function CotizacionesWidget({
  dollarQuotes,
  currencyQuotes,
  brechaBlue,
  lastUpdated,
  className,
}: CotizacionesWidgetProps) {
  // Order dollars for display
  const dollarOrder: string[] = ['blue', 'oficial', 'mep', 'ccl', 'mayorista', 'cripto', 'turista'];
  const sortedDollars = [...dollarQuotes].sort((a, b) => {
    const ia = dollarOrder.indexOf(a.type);
    const ib = dollarOrder.indexOf(b.type);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // Order currencies
  const currencyOrder: string[] = ['EUR', 'BRL', 'UYU', 'CLP', 'GBP'];
  const sortedCurrencies = [...currencyQuotes].sort((a, b) => {
    const ia = currencyOrder.indexOf(a.code);
    const ib = currencyOrder.indexOf(b.code);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const blue = sortedDollars.find(d => d.type === 'blue');
  const oficial = sortedDollars.find(d => d.type === 'oficial');
  const otherDollars = sortedDollars.filter(d => d.type !== 'blue' && d.type !== 'oficial');

  return (
    <div className={cn('space-y-4', className)}>
      {/* ===== Section: Dólar ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-amber-900/30 flex items-center justify-center">
              <DollarSign className="w-4.5 h-4.5 text-accent dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                Cotización del Dólar
              </h2>
              <p className="text-2xs text-text-muted dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Actualizado en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {brechaBlue != null && brechaBlue !== 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent dark:bg-amber-900/30 dark:text-amber-400 border border-accent/20 dark:border-amber-700/30">
                Brecha {brechaBlue.toFixed(1)}%
              </span>
            )}
            <Link
              href="/indicadores/dolar"
              className="text-xs font-medium text-accent hover:text-accent-dark dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
            >
              Ver más →
            </Link>
          </div>
        </div>

        {/* Featured: Blue + Oficial side by side */}
        {sortedDollars.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {blue && <DollarCardClarin quote={blue} variant="primary" />}
              {oficial && <DollarCardClarin quote={oficial} variant="primary" />}
            </div>

            {/* Other dollar types in compact grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {otherDollars.map((quote) => (
                <DollarCardClarin key={quote.type} quote={quote} variant="secondary" />
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-text-muted dark:text-gray-400 text-center py-6 border border-dashed border-border-light dark:border-slate-700 rounded-lg">
            Sin datos de cotizaciones disponibles
          </div>
        )}
      </section>

      {/* ===== Section: Otras Divisas ===== */}
      {sortedCurrencies.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary dark:text-white">
                Otras Divisas
              </h2>
              <p className="text-2xs text-text-muted dark:text-slate-500">
                Cotización oficial en pesos argentinos
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border-muted bg-surface dark:bg-slate-900/50 dark:border-slate-800 overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-bg-secondary/60 dark:bg-slate-800/60 border-b border-border-muted dark:border-slate-700/60 text-2xs uppercase tracking-wider text-text-muted dark:text-slate-500 font-medium">
              <span className="flex-1">Moneda</span>
              <div className="flex items-center gap-6 text-right">
                <span className="w-16">Compra</span>
                <span className="w-16">Venta</span>
              </div>
              <span className="ml-4 min-w-[65px] text-right">Var.</span>
            </div>

            {/* Currency Rows */}
            {sortedCurrencies.map((currency) => (
              <CurrencyRow key={currency.code} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
