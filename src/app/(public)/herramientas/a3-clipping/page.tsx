'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  BarChart3, 
  Newspaper, 
  RefreshCw, 
  LogOut, 
  Building2, 
  Package, 
  Network,
  Globe,
  ChevronLeft,
  ChevronRight,
  Filter,
  Activity,
  Settings,
} from 'lucide-react';
import { ClippingNewsCard, CLIPPING_CATEGORIES, type ClippingArticle } from '@/components/clipping/clipping-news-card';
import { ClippingAnalyticsPanel } from '@/components/clipping/clipping-analytics';
import { ClippingSettingsPanel } from '@/components/clipping/clipping-settings';
import { ClippingSmartSearch } from '@/components/clipping/clipping-smart-search';
import { ClippingScanButton } from '@/components/clipping/clipping-scan-button';
import { ClippingHistoricalSearch } from '@/components/clipping/clipping-historical-search';

interface ClippingStats {
  total: number;
  institucional: number;
  producto: number;
  sector: number;
  ecosistema: number;
}

interface ClippingResponse {
  success: boolean;
  data: ClippingArticle[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: ClippingStats;
  user: { email: string; company: string };
}

const CATEGORY_TABS = [
  { key: '', label: 'Todas', icon: Filter },
  { key: 'institucional', label: 'Institucional', icon: Building2 },
  { key: 'producto', label: 'Producto', icon: Package },
  { key: 'sector', label: 'Sector', icon: Network },
  { key: 'ecosistema', label: 'Ecosistema', icon: Globe },
];

const STAT_CARDS = [
  { key: 'total', label: 'Total', color: 'from-indigo-500 to-indigo-600', icon: Newspaper },
  { key: 'institucional', label: 'Institucional', color: 'from-blue-500 to-blue-600', icon: Building2 },
  { key: 'producto', label: 'Producto', color: 'from-emerald-500 to-emerald-600', icon: Package },
  { key: 'sector', label: 'Sector', color: 'from-violet-500 to-violet-600', icon: Network },
  { key: 'ecosistema', label: 'Ecosistema', color: 'from-amber-500 to-amber-600', icon: Globe },
];

export default function ClippingDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<ClippingArticle[]>([]);
  const [stats, setStats] = useState<ClippingStats>({ total: 0, institucional: 0, producto: 0, sector: 0, ecosistema: 0 });
  const [user, setUser] = useState<{ email: string; company: string } | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'news' | 'analytics'>('news');
  const [showSettings, setShowSettings] = useState(false);
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());

  const activeCategory = searchParams.get('category') || '';
  const currentPage = Number(searchParams.get('page')) || 1;

  const fetchNews = useCallback(async (category: string, page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/clipping/news?${params.toString()}`);
      if (res.status === 401) {
        router.push('/herramientas/a3-clipping/login');
        return;
      }
      if (!res.ok) throw new Error('Error al cargar noticias');
      
      const data: ClippingResponse = await res.json();
      setArticles(data.data);
      setStats(data.stats);
      setUser(data.user);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchNews(activeCategory, currentPage);
  }, [activeCategory, currentPage, fetchNews]);

  const setCategory = (cat: string) => {
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    router.push(`/herramientas/a3-clipping?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    params.set('page', String(page));
    router.push(`/herramientas/a3-clipping?${params.toString()}`);
  };

  const handleLogout = async () => {
    document.cookie = 'clipping-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/herramientas/a3-clipping/login');
  };

  const handleDeleteArticle = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/clipping/news', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        const deleted = articles.find(a => a.id === id);
        setArticles(prev => prev.filter(a => a.id !== id));
        setStats(prev => {
          const cat = deleted?.clippingCategory as keyof ClippingStats | undefined;
          return {
            ...prev,
            total: prev.total - 1,
            ...(cat && cat in prev ? { [cat]: prev[cat] - 1 } : {}),
          };
        });
      }
    } catch { /* silent */ }
  }, [articles]);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-surface-elevated dark:bg-[#111] border-b border-[var(--border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-primary dark:text-white">
                A3 Mercados <span className="text-indigo-600 dark:text-indigo-400">· Clipping de Prensa</span>
              </h1>
              <p className="text-2xs text-text-muted dark:text-slate-500 capitalize">{today}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-text-muted dark:text-slate-400 hidden sm:block">
                {user.email}
              </span>
            )}
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-lg p-0.5 border border-[var(--border)]">
              <button
                onClick={() => setViewMode('news')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'news' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white'}`}
                title="Noticias"
              >
                <Newspaper className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'analytics' ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300' : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white'}`}
                title="Analytics"
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)]'}`}
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
            <ClippingScanButton
              onComplete={(ids) => {
                if (ids.length > 0) {
                  setNewArticleIds(new Set(ids));
                  fetchNews(activeCategory, currentPage);
                }
              }}
            />
            <ClippingHistoricalSearch
              onComplete={() => fetchNews(activeCategory, currentPage)}
            />
            <button
              onClick={() => fetchNews(activeCategory, currentPage)}
              className="p-2 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-muted dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-[var(--interactive-hover)] transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6">
            <ClippingSettingsPanel onClose={() => setShowSettings(false)} onSave={() => fetchNews(activeCategory, currentPage)} />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const count = stats[card.key as keyof ClippingStats] || 0;
            return (
              <div
                key={card.key}
                className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3"
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary dark:text-white">{count}</p>
                  <p className="text-2xs text-text-muted dark:text-slate-500">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Analytics Mode ═══ */}
        {viewMode === 'analytics' && (
          <ClippingAnalyticsPanel />
        )}

        {/* ═══ News Mode ═══ */}
        {viewMode === 'news' && (
          <>
        {/* Smart Search */}
        <div className="mb-6">
          <ClippingSmartSearch />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                    : 'bg-[var(--bg-secondary)] text-text-muted dark:text-slate-400 border border-[var(--border)] hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.key && (
                  <span className={`text-2xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-500/30' : 'bg-[var(--bg-secondary)]'}`}>
                    {stats[tab.key as keyof ClippingStats] || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/4" />
                    <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4" />
                    <div className="h-3 bg-[var(--bg-secondary)] rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Articles */}
        {!loading && !error && articles.length === 0 && (
          <div className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl p-12 text-center">
            <Newspaper className="w-12 h-12 text-text-disabled dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-text-muted dark:text-slate-400">No hay noticias en esta categoría</p>
            <p className="text-xs text-text-disabled dark:text-slate-500 mt-1">Las noticias se clasifican automáticamente al procesarse</p>
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div className="space-y-3">
            {[...articles]
              .sort((a, b) => {
                // Institucional articles first, then by original order
                const aInst = a.clippingCategory === 'institucional' ? 0 : 1;
                const bInst = b.clippingCategory === 'institucional' ? 0 : 1;
                return aInst - bInst;
              })
              .map((article) => (
              <ClippingNewsCard
                key={article.id}
                article={article}
                isNew={newArticleIds.has(article.id)}
                featured={article.clippingCategory === 'institucional'}
                onDelete={handleDeleteArticle}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl p-3">
            <span className="text-xs text-text-muted dark:text-slate-500">
              Mostrando {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-text-muted dark:text-slate-400 px-2">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className="p-1.5 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
