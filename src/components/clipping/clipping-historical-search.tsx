'use client';

import { useState, useCallback, useRef } from 'react';
import { CalendarSearch, X, CheckCircle2, AlertCircle, Loader2, Calendar } from 'lucide-react';

interface HistoricalSummary {
  totalFound: number;
  newArticles: number;
  duplicatesSkipped: number;
  errors: number;
  durationMs: number;
  queryResults: { query: string; found: number }[];
  dateFrom: string;
  dateTo: string;
}

interface HistoricalEvent {
  phase: string;
  message: string;
  progress: number;
  summary?: HistoricalSummary;
}

interface ClippingHistoricalSearchProps {
  onComplete: () => void;
}

const PRESETS = [
  { label: 'Último mes', getDates: () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    return { from, to };
  }},
  { label: 'Últimos 3 meses', getDates: () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 3);
    return { from, to };
  }},
  { label: 'Últimos 6 meses', getDates: () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 6);
    return { from, to };
  }},
  { label: 'Este año', getDates: () => {
    const to = new Date();
    const from = new Date(to.getFullYear(), 0, 1);
    return { from, to };
  }},
];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function ClippingHistoricalSearch({ onComplete }: ClippingHistoricalSearchProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [searching, setSearching] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [logs, setLogs] = useState<{ message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [summary, setSummary] = useState<HistoricalSummary | null>(null);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    const { from, to } = preset.getDates();
    setDateFrom(formatDate(from));
    setDateTo(formatDate(to));
  };

  const startSearch = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    setSearching(true);
    setProgress(0);
    setCurrentMessage('Iniciando búsqueda histórica...');
    setLogs([{ message: `Buscando en Google News: ${dateFrom} → ${dateTo}`, type: 'info' }]);
    setSummary(null);
    setError(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/clipping/scan/historical', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateFrom, dateTo }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(res.status === 401 ? 'Sesión expirada' : errData.error || `Error ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Sin respuesta del servidor');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: HistoricalEvent = JSON.parse(line.slice(6));
            setProgress(event.progress);
            setCurrentMessage(event.message);

            const logType = event.phase === 'error' ? 'error'
              : event.phase === 'complete' ? 'success'
              : 'info';
            setLogs(prev => [...prev, { message: event.message, type: logType }]);

            if (event.phase === 'complete') {
              setSummary(event.summary || null);
              onComplete();
            }
            if (event.phase === 'error') {
              setError(true);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLogs(prev => [...prev, { message: 'Búsqueda cancelada', type: 'error' }]);
      } else {
        setCurrentMessage(err.message || 'Error de conexión');
        setLogs(prev => [...prev, { message: err.message || 'Error de conexión', type: 'error' }]);
        setError(true);
      }
      setProgress(100);
    } finally {
      setSearching(false);
      abortRef.current = null;
    }
  }, [dateFrom, dateTo, onComplete]);

  const closePanel = () => {
    if (searching && abortRef.current) {
      abortRef.current.abort();
    }
    setShowPanel(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPanel(true)}
        disabled={searching}
        className={`p-2 rounded-lg transition-colors ${
          searching
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 cursor-wait'
            : 'text-text-muted dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/10'
        }`}
        title="Búsqueda histórica Google News"
      >
        <CalendarSearch className={`w-4 h-4 ${searching ? 'animate-pulse' : ''}`} />
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none">
          <div className="w-full max-w-lg mx-4 mt-16 pointer-events-auto">
            <div className="bg-surface-elevated dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  {searching ? (
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                  ) : error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : summary ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <CalendarSearch className="w-4 h-4 text-amber-500" />
                  )}
                  <span className="text-sm font-semibold text-text-primary dark:text-white">
                    {searching ? 'Buscando...' : error ? 'Error' : summary ? 'Búsqueda completada' : 'Búsqueda Histórica'}
                  </span>
                  <span className="text-2xs text-text-muted dark:text-slate-500">
                    Institucional + Sector
                  </span>
                </div>
                <button
                  onClick={closePanel}
                  className="p-1 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date picker — only show when not searching and no summary */}
              {!searching && !summary && (
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-text-muted dark:text-slate-400">
                    Buscá noticias de Google News para keywords de <span className="text-blue-500 font-medium">Institucional</span> y <span className="text-violet-500 font-medium">Sector</span> en un rango de fechas personalizado.
                  </p>

                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className="px-2.5 py-1 rounded-lg text-2xs font-medium bg-[var(--bg-secondary)] text-text-muted dark:text-slate-400 border border-[var(--border)] hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/30 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs text-text-muted dark:text-slate-500 mb-1">Desde</label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled dark:text-slate-600" />
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          max={dateTo || formatDate(new Date())}
                          title="Fecha desde"
                          className="w-full pl-8 pr-2 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-text-primary dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-2xs text-text-muted dark:text-slate-500 mb-1">Hasta</label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled dark:text-slate-600" />
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          min={dateFrom}
                          max={formatDate(new Date())}
                          title="Fecha hasta"
                          className="w-full pl-8 pr-2 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-text-primary dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Search button */}
                  <button
                    onClick={startSearch}
                    disabled={!dateFrom || !dateTo}
                    className="w-full py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-sm"
                  >
                    Buscar en Google News
                  </button>
                </div>
              )}

              {/* Progress bar — show when searching or completed */}
              {(searching || summary || error) && (
                <div className="px-4 pt-3">
                  <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        error ? 'bg-red-500' : progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted dark:text-slate-400 mt-1.5 mb-2">
                    {currentMessage}
                  </p>
                </div>
              )}

              {/* Log */}
              {(searching || summary || error) && logs.length > 0 && (
                <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <p key={i} className={`text-2xs font-mono ${
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-emerald-500' :
                        'text-text-muted dark:text-slate-500'
                      }`}>
                        {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : '›'} {log.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {summary && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-text-primary dark:text-white">{summary.totalFound}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Encontrados</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.newArticles}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Nuevos</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-text-primary dark:text-white">{summary.duplicatesSkipped}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Duplicados</p>
                    </div>
                  </div>

                  {/* Per-query results */}
                  {summary.queryResults.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <p className="text-2xs font-medium text-text-muted dark:text-slate-400">Resultados por keyword:</p>
                      {summary.queryResults.map((qr, i) => (
                        <div key={i} className="flex items-center justify-between text-2xs">
                          <span className="text-text-muted dark:text-slate-500 truncate mr-2">{qr.query}</span>
                          <span className={`font-mono ${qr.found > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-text-disabled dark:text-slate-600'}`}>
                            {qr.found}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New search button */}
                  <button
                    onClick={() => { setSummary(null); setLogs([]); setProgress(0); setCurrentMessage(''); setError(false); }}
                    className="w-full py-1.5 rounded-lg text-2xs font-medium bg-[var(--bg-secondary)] text-text-muted dark:text-slate-400 border border-[var(--border)] hover:text-text-primary dark:hover:text-white transition-colors"
                  >
                    Nueva búsqueda
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
