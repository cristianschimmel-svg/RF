'use client';

import { useState, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

const MagicBrainIcon = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
  <Image
    src="/Fijos/Magic_Brain_Transparent.png"
    alt="Magic Brain"
    width={size}
    height={size}
    className={className}
  />
);

interface SmartSearchProps {
  defaultQuery: string | null;
  activeCategory: string | null;
}

export function SmartSearch({ defaultQuery, activeCategory }: SmartSearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAISummary = useCallback(async () => {
    const query = inputRef.current?.value?.trim();
    if (!query) return;

    setIsLoading(true);
    setError(null);
    setSummary(null);
    setShowModal(true);

    try {
      // First, submit the search form to filter results on server
      // Then fetch the AI summary
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      if (activeCategory) searchParams.set('categoria', activeCategory);

      // Fetch filtered articles data
      const newsRes = await fetch(`/api/news/processed?limit=50`);
      const newsData = await newsRes.json();

      if (!newsData.articles || newsData.articles.length === 0) {
        setError('No se encontraron noticias para analizar.');
        setIsLoading(false);
        return;
      }

      // Normalize for heuristic matching on client
      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .trim();

      const normalizedQuery = normalizeText(query);
      const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 1);

      // Filter articles matching the query
      const matchedArticles = newsData.articles.filter((a: any) => {
        const searchable = normalizeText(
          `${a.title || ''} ${a.header || a.excerpt || ''} ${a.category || ''} ${a.sourceName || a.source || ''}`
        );
        return queryTokens.some(token => searchable.includes(token));
      });

      if (matchedArticles.length === 0) {
        setError(`No se encontraron noticias relacionadas con "${query}".`);
        setIsLoading(false);
        return;
      }

      // Prepare articles for AI
      const articlesForAI = matchedArticles.slice(0, 20).map((a: any) => ({
        title: a.title || '',
        excerpt: a.header || a.excerpt || '',
        source: a.sourceName || a.source || '',
        slug: a.id || a.slug || '',
        category: a.category || '',
      }));

      // Call AI summary endpoint
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
  }, [activeCategory]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSummary(null);
    setError(null);
  }, []);

  return (
    <>
      <form
        ref={formRef}
        action="/noticias"
        method="GET"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          // Submit the form for filtering AND trigger AI briefing simultaneously
          const query = inputRef.current?.value?.trim();
          if (query) {
            // Navigate to filtered results
            const params = new URLSearchParams();
            params.set('q', query);
            if (activeCategory) params.set('categoria', activeCategory);
            window.history.replaceState(null, '', `/noticias?${params.toString()}`);
            // Also trigger the AI briefing
            handleAISummary();
            // Submit form natively for SSR filter
            formRef.current?.submit();
          }
        }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={defaultQuery || ''}
          placeholder="Buscar noticias..."
          className="pl-10 pr-12"
        />
        <button
          type="button"
          onClick={handleAISummary}
          disabled={isLoading}
          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-wait"
          title="Magic Brain — Analiza noticias y genera un briefing ejecutivo"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
          ) : (
            <MagicBrainIcon size={24} />
          )}
        </button>
        {activeCategory && <input type="hidden" name="categoria" value={activeCategory} />}
      </form>

      {/* AI Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-accent/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/10 to-purple-100 dark:from-accent/20 dark:to-purple-900/30 flex items-center justify-center">
                  <MagicBrainIcon size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary dark:text-white">
                    Resumen Inteligente
                  </h2>
                  {articleCount > 0 && (
                    <p className="text-xs text-text-muted">
                      Basado en {articleCount} noticias analizadas
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                title="Cerrar"
                className="w-8 h-8 rounded-lg hover:bg-surface-secondary flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 dark:from-accent/20 dark:to-purple-900/30 flex items-center justify-center animate-pulse">
                    <MagicBrainIcon size={32} />
                  </div>
                  <p className="text-sm text-text-muted text-center">
                    Analizando noticias con inteligencia artificial...
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
                  <p className="text-sm text-text-secondary text-center">{error}</p>
                </div>
              )}

              {summary && (
                <div className="prose prose-sm dark:prose-invert max-w-none ai-summary-content">
                  <MarkdownRenderer content={summary} />
                </div>
              )}
            </div>

            {/* Footer */}
            {summary && (
              <div className="px-6 py-3 border-t border-border bg-gray-100/80 dark:bg-gray-800/50 flex items-center justify-between">
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <MagicBrainIcon size={16} />
                  Generado por Magic Brain - AI Responsive
                </p>
                <button
                  onClick={closeModal}
                  className="px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
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
 * Simple markdown to HTML renderer for AI summary content
 * Handles: headers, bold, links, bullets, paragraphs
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
            <li key={i} className="flex gap-2 text-sm text-text-secondary">
              <span className="text-accent mt-0.5">•</span>
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
      const bulletText = trimmed.replace(/^[-*•]\s+/, '');
      listBuffer.push(bulletText);
    } else if (trimmed.match(/^\d+\.\s/)) {
      const bulletText = trimmed.replace(/^\d+\.\s+/, '');
      listBuffer.push(bulletText);
    } else {
      flushList();
      elements.push(
        <p
          key={key++}
          className="text-sm text-text-secondary leading-relaxed my-2"
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
 * Links are sanitized to only allow relative paths.
 */
function inlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary dark:text-white font-semibold">$1</strong>')
    // Markdown links — only allow relative links starting with /
    .replace(
      /\[([^\]]+)\]\((\/[^)]+)\)/g,
      '<a href="$2" class="text-accent hover:underline font-medium">$1</a>'
    )
    // Remove any remaining markdown links with external URLs (safety)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
