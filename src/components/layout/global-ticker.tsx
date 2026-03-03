'use client';

import { useEffect, useState } from 'react';
import { EnhancedTicker } from '@/components/indicators/ticker';
import type { TickerItem } from '@/types';

interface GlobalTickerProps {
  className?: string;
}

export function GlobalTicker({ className }: GlobalTickerProps) {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTickerData() {
      try {
        // Fetch from API
        const response = await fetch('/api/indicators/ticker');
        if (response.ok) {
          const data = await response.json();
          setTickerItems(data);
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickerData();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchTickerData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || tickerItems.length === 0) {
    return (
      <div className="h-8 bg-bg-secondary dark:bg-slate-950 border-b border-border-muted dark:border-slate-800 animate-pulse" />
    );
  }

  return (
    <EnhancedTicker
      items={tickerItems.map((item) => ({
        ...item,
        sparklineData: [100, 102, 101, 103, 105, 104, 106, 108],
      }))}
      speed={50}
      className={className}
    />
  );
}
