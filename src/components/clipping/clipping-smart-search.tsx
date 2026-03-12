'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

const MagicBrainIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <Image
    src="/Fijos/Magic_Brain_Transparent.png"
    alt="Magic Brain"
    width={size}
    height={size}
    className={className}
  />
);

export function ClippingSmartSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAISummary = useCallback(async () => {
    const query = inputRef.current?.value?.trim();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setSummary(null);
    setShowModal(true);

    try {
      // Fetch clipping articles from the clipping API (JWT via cookie)
      const params = new URLSearchParams();
      params.set('q', query);
      params.set('limit', '50');
      // Smart search always searches across ALL categories (don't filter by active tab)

      const newsRes = await fetch(`/api/clipping/news?${params.toString()}`);
      if (newsRes.status === 401) {
        setError('Sesión expirada. Volvé a iniciar sesión.');
        setIsLoading(false);
        return;
      }
      const newsData = await newsRes.json();

      if (!newsData.data || newsData.data.length === 0) {
        setError(`No se encontraron noticias de clipping relacionadas con "${query}".`);
        setIsLoading(false);
        return;
      }

      // Trust the API results — it already does proper phrase matching via Prisma `contains`
      const matchedArticles = newsData.data;

      // Prepare articles for AI (use sourceUrl for links since clipping articles are external)
      const articlesForAI = matchedArticles.slice(0, 20).map((a: any) => ({
        title: a.title || '',
        excerpt: a.header || a.aiSummary || '',
        source: a.sourceName || '',
        slug: a.sourceUrl || a.id || '',
        category: a.clippingCategory || a.category || '',
        isExternal: !!a.sourceUrl,
      }));

      // Call AI summary endpoint (same Gemini endpoint as portal)
      const aiRes = await fetch('/api/news/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: articlesForAI, query }),
      });

      const aiData = await aiRes.json();

      if (!aiRes.ok) {
        setError(aiData.error || 'Error al generar el resumen inteligente.');
        setIsLoading(false);
        return;
      }

      setSummary(aiData.summary);
      setArticleCount(aiData.articleCount);
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSummary(null);
    setError(null);
  }, []);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-slate-500" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Buscar en noticias del clipping..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleAISummary(); }}
            className="w-full pl-10 pr-12 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-text-primary dark:text-white placeholder:text-text-disabled dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={handleAISummary}
            disabled={isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-wait"
            title="Magic Brain — Analiza noticias del clipping y genera un briefing ejecutivo"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            ) : (
              <MagicBrainIcon size={24} />
            )}
          </button>
        </div>
      </div>

      {/* AI Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-surface-elevated dark:bg-[#111] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-100 dark:from-indigo-500/20 dark:to-purple-900/30 flex items-center justify-center">
                  <MagicBrainIcon size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary dark:text-white">
                    Resumen Inteligente — Clipping
                  </h2>
                  {articleCount > 0 && (
                    <p className="text-xs text-text-muted dark:text-slate-500">
                      Basado en {articleCount} noticias de clipping analizadas
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                title="Cerrar"
                className="w-8 h-8 rounded-lg hover:bg-[var(--interactive-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-text-muted dark:text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-100 dark:from-indigo-500/20 dark:to-purple-900/30 flex items-center justify-center animate-pulse">
                    <MagicBrainIcon size={32} />
                  </div>
                  <p className="text-sm text-text-muted dark:text-slate-400 text-center">
                    Analizando noticias del clipping con inteligencia artificial...
                    <br />
                    <span className="text-xs">Esto puede tomar unos segundos</span>
                  </p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-sm text-text-secondary dark:text-slate-400 text-center">{error}</p>
                </div>
              )}

              {summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownRenderer content={summary} />
                </div>
              )}
            </div>

            {/* Footer */}
            {summary && (
              <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-between">
                <p className="text-xs text-text-muted dark:text-slate-500 flex items-center gap-1.5">
                  <MagicBrainIcon size={16} />
                  Generado por Magic Brain — A3 Clipping
                </p>
                <button
                  onClick={closeModal}
                  className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Simple markdown → HTML renderer for AI summary content.
 * Handles: headers, bold, links, bullets, paragraphs.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1.5 my-3">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-text-secondary dark:text-slate-300">
              <span className="text-indigo-500 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(item) }} />
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-bold text-text-primary dark:text-white mt-4 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-text-primary dark:text-white mt-3 mb-1.5">
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.match(/^[-*•]\s/)) {
      listBuffer.push(trimmed.replace(/^[-*•]\s+/, ''));
    } else if (trimmed.match(/^\d+\.\s/)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s+/, ''));
    } else {
      flushList();
      elements.push(
        <p
          key={key++}
          className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed my-2"
          dangerouslySetInnerHTML={{ __html: inlineMarkdown(trimmed) }}
        />
      );
    }
  }

  flushList();
  return <>{elements}</>;
}

/**
 * Render inline markdown (bold, links) to HTML strings.
 * Links allow both relative paths and https URLs (for external clipping sources).
 */
function inlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary dark:text-white font-semibold">$1</strong>')
    // Markdown links — allow relative links starting with / AND https URLs
    .replace(
      /\[([^\]]+)\]\(((?:\/|https:\/\/)[^)]+)\)/g,
      (_, label, url) => {
        const isExternal = url.startsWith('https://');
        return `<a href="${url}" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
      }
    )
    // Remove any remaining markdown links with other URLs (safety)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
