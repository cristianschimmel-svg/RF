'use client';

import { useState, useCallback, useRef } from 'react';
import { Radar, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ScanSummary {
  portalProcessed: number;
  portalErrors: number;
  clippingCustom: number;
  googleNewsFound: number;
  googleNewsNew: number;
  newClippingArticles: number;
  durationMs: number;
}

interface ScanEvent {
  phase: string;
  message: string;
  progress: number;
  newArticleIds?: string[];
  summary?: ScanSummary;
  detail?: Record<string, unknown>;
}

interface ClippingScanButtonProps {
  onComplete: (newArticleIds: string[]) => void;
}

export function ClippingScanButton({ onComplete }: ClippingScanButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [logs, setLogs] = useState<{ message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async () => {
    setScanning(true);
    setShowPanel(true);
    setProgress(0);
    setCurrentMessage('Iniciando escaneo...');
    setLogs([{ message: 'Iniciando escaneo manual...', type: 'info' }]);
    setSummary(null);
    setError(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/clipping/scan', {
        method: 'POST',
        credentials: 'same-origin',
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Sesión expirada' : 'Error al iniciar escaneo');
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
            const event: ScanEvent = JSON.parse(line.slice(6));
            setProgress(event.progress);
            setCurrentMessage(event.message);

            const logType = event.phase === 'error' ? 'error'
              : event.phase === 'complete' ? 'success'
              : 'info';
            setLogs(prev => [...prev, { message: event.message, type: logType }]);

            if (event.phase === 'complete') {
              setSummary(event.summary || null);
              onComplete(event.newArticleIds || []);
            }
            if (event.phase === 'error') {
              setError(true);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setLogs(prev => [...prev, { message: 'Escaneo cancelado', type: 'error' }]);
      } else {
        setCurrentMessage(err.message || 'Error de conexión');
        setLogs(prev => [...prev, { message: err.message || 'Error de conexión', type: 'error' }]);
        setError(true);
      }
      setProgress(100);
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }, [onComplete]);

  const closePanel = () => {
    if (scanning && abortRef.current) {
      abortRef.current.abort();
    }
    setShowPanel(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={startScan}
        disabled={scanning}
        className={`p-2 rounded-lg transition-colors ${
          scanning
            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 cursor-wait'
            : 'text-text-muted dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10'
        }`}
        title="Escanear noticias ahora"
      >
        <Radar className={`w-4 h-4 ${scanning ? 'animate-pulse' : ''}`} />
      </button>

      {/* Progress Panel (overlay at top) */}
      {showPanel && (
        <div className="fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none">
          <div className="w-full max-w-lg mx-4 mt-16 pointer-events-auto">
            <div className="bg-surface-elevated dark:bg-[#1a1a1a] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  {scanning ? (
                    <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : error ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="text-sm font-semibold text-text-primary dark:text-white">
                    {scanning ? 'Escaneando...' : error ? 'Error en escaneo' : 'Escaneo completado'}
                  </span>
                </div>
                <button
                  onClick={closePanel}
                  className="p-1 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="px-4 pt-3">
                <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      error ? 'bg-red-500' : progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted dark:text-slate-400 mt-1.5 mb-2">
                  {currentMessage}
                </p>
              </div>

              {/* Log */}
              <div className="px-4 pb-3 max-h-40 overflow-y-auto">
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

              {/* Summary */}
              {summary && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-text-primary dark:text-white">{summary.portalProcessed}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Portal RSS</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-text-primary dark:text-white">{summary.clippingCustom}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Fuentes custom</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.googleNewsNew}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Google News</p>
                    </div>
                    <div className="col-span-2 bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{summary.newClippingArticles}</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Nuevas en clipping (total)</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-text-primary dark:text-white">{(summary.durationMs / 1000).toFixed(1)}s</p>
                      <p className="text-2xs text-text-muted dark:text-slate-500">Duración</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
