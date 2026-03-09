'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils';
import {
  Newspaper,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ScrapedArticle {
  id: string;
  title: string;
  header: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
  processedAt: string;
  isProcessed: boolean;
  processingError: string | null;
  sourceImageUrl: string | null;
  aiImageUrl: string | null;
}

export function ScrapedNewsManager() {
  const router = useRouter();
  const [articles, setArticles] = useState<ScrapedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scraped-news');
      const data = await res.json();
      if (data.success) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching scraped news:', error);
      setMessage({ type: 'error', text: 'Error al cargar las noticias' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    const confirmMsg = ids.length === 1
      ? '¿Eliminar esta noticia escrapeada?'
      : `¿Eliminar ${ids.length} noticias escrapeadas?`;

    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/admin/scraped-news', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelected(new Set());
        // Refresh the list
        await fetchArticles();
        // Force Next.js to invalidate client-side router cache
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al eliminar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión al eliminar' });
    } finally {
      setDeleting(false);
    }
  };

  // Filter logic
  const categories = Array.from(new Set(articles.map(a => a.category))).sort();
  const sources = Array.from(new Set(articles.map(a => a.sourceName))).sort();

  const filtered = articles.filter(a => {
    const matchSearch = searchTerm === '' ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sourceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === 'all' || a.category === categoryFilter;
    const matchSource = sourceFilter === 'all' || a.sourceName === sourceFilter;
    return matchSearch && matchCategory && matchSource;
  });

  const errorArticles = filtered.filter(a => a.processingError);
  const processedArticles = filtered.filter(a => a.isProcessed && !a.processingError);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-accent" />
            Noticias Escrapeadas
          </h1>
          <p className="text-sm text-text-muted dark:text-slate-400 mt-1">
            Gestionar noticias externas obtenidas por RSS y scraping.
            {articles.length > 0 && ` Total: ${articles.length}`}
          </p>
        </div>
        <button
          onClick={fetchArticles}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-surface-secondary dark:hover:bg-slate-700 text-text-primary dark:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título o fuente..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-text-primary dark:text-white placeholder:text-text-muted dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">Todas las fuentes</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/5 dark:bg-amber-950/20 border border-accent/20 dark:border-amber-800/30">
          <span className="text-sm font-medium text-text-primary dark:text-white">
            {selected.size} noticia(s) seleccionada(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-slate-700 border border-border dark:border-slate-600 text-text-primary dark:text-white hover:bg-surface-secondary dark:hover:bg-slate-600 transition-colors"
            >
              Deseleccionar
            </button>
            <button
              onClick={() => handleDelete(Array.from(selected))}
              disabled={deleting}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Eliminando...' : `Eliminar (${selected.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-text-primary dark:text-white">{articles.length}</p>
          <p className="text-xs text-text-muted dark:text-slate-400">Total</p>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{processedArticles.length}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">Procesadas OK</p>
        </div>
        <div className="rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/30 p-3 text-center">
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{errorArticles.length}</p>
          <p className="text-xs text-rose-600 dark:text-rose-500">Con errores</p>
        </div>
        <div className="rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-center">
          <p className="text-2xl font-bold text-text-primary dark:text-white">{sources.length}</p>
          <p className="text-xs text-text-muted dark:text-slate-400">Fuentes</p>
        </div>
      </div>

      {/* Loading state */}
      {loading && articles.length === 0 && (
        <div className="text-center py-12 text-text-muted dark:text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" />
          <p className="text-sm">Cargando noticias escrapeadas...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && articles.length === 0 && (
        <div className="text-center py-12 text-text-muted dark:text-slate-400">
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No hay noticias escrapeadas</p>
          <p className="text-xs mt-1">Las noticias se obtienen automáticamente vía scraping RSS.</p>
        </div>
      )}

      {/* Articles table */}
      {filtered.length > 0 && (
        <div className="border border-border dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 bg-surface-secondary dark:bg-slate-900 border-b border-border dark:border-slate-700 text-xs font-semibold text-text-muted dark:text-slate-400 uppercase tracking-wide">
            <button onClick={selectAll} className="flex items-center" title="Seleccionar todo">
              {selected.size === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-accent" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <span>Título</span>
            <span className="hidden sm:block">Categoría</span>
            <span className="hidden md:block">Fuente</span>
            <span className="hidden lg:block">Fecha</span>
            <span>Acciones</span>
          </div>

          {/* Table body */}
          <div className="divide-y divide-border dark:divide-slate-700">
            {filtered.map((article) => (
              <div
                key={article.id}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 items-center hover:bg-surface-secondary/50 dark:hover:bg-slate-700/30 transition-colors ${
                  selected.has(article.id) ? 'bg-accent/5 dark:bg-amber-950/20' : ''
                }`}
              >
                {/* Checkbox */}
                <button onClick={() => toggleSelect(article.id)} className="flex items-center">
                  {selected.has(article.id) ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4 text-text-muted dark:text-slate-500" />
                  )}
                </button>

                {/* Title */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-white truncate" title={article.title}>
                    {article.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-muted dark:text-slate-500 sm:hidden">
                      {article.sourceName}
                    </span>
                    {article.processingError && (
                      <span className="text-[10px] text-rose-500 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {article.processingError.slice(0, 40)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Category */}
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-secondary dark:bg-slate-700 text-text-secondary dark:text-slate-300">
                  {article.category}
                </span>

                {/* Source */}
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] text-text-muted dark:text-slate-400">
                  {article.sourceName}
                </span>

                {/* Date */}
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-text-muted dark:text-slate-400">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(article.publishedAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-surface-secondary dark:hover:bg-slate-700 text-text-muted dark:text-slate-400 hover:text-accent transition-colors"
                      title="Ver fuente original"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete([article.id])}
                    disabled={deleting}
                    className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-text-muted dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results for filter */}
      {!loading && articles.length > 0 && filtered.length === 0 && (
        <div className="text-center py-8 text-text-muted dark:text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron noticias con los filtros aplicados</p>
          <button
            onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setSourceFilter('all'); }}
            className="mt-2 text-xs text-accent hover:text-accent-dark transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
