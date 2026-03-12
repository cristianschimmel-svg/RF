'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Treemap,
} from 'recharts';
import {
  Search,
  Cloud,
  BarChart3,
  TrendingUp,
  LayoutGrid,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  ExternalLink,
  Newspaper,
} from 'lucide-react';

// ─── Types ───
interface WordItem {
  word: string;
  count: number;
}

interface TrendPoint {
  date: string;
  total: number;
  institucional: number;
  producto: number;
  sector: number;
  ecosistema: number;
}

interface CategoryItem {
  name: string;
  count: number;
}

interface AnalyticsData {
  success: boolean;
  query: string;
  articlesAnalyzed: number;
  wordcloud?: WordItem[];
  trends?: TrendPoint[];
  categories?: CategoryItem[];
}

// ─── Category colors ───
const CAT_COLORS: Record<string, string> = {
  institucional: '#6366f1',
  producto: '#10b981',
  sector: '#8b5cf6',
  ecosistema: '#f59e0b',
};

const TREEMAP_COLORS: Record<string, string> = {
  institucional: '#4f46e5',
  producto: '#059669',
  sector: '#7c3aed',
  ecosistema: '#d97706',
  'sin categoría': '#64748b',
};

// ─── Tab definitions ───
const TABS = [
  { key: 'wordcloud', label: 'Nube de Palabras', icon: Cloud },
  { key: 'bars', label: 'Top Keywords', icon: BarChart3 },
  { key: 'trends', label: 'Tendencias', icon: TrendingUp },
  { key: 'treemap', label: 'Categorías', icon: LayoutGrid },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Word Cloud (pure CSS, inline hex colors for both light/dark) ───
const WORD_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#22c55e', '#f59e0b', '#f97316', '#8b5cf6',
  '#f43f5e', '#ec4899', '#0ea5e9', '#14b8a6',
];

function WordCloudView({ words, onWordClick }: { words: WordItem[]; onWordClick?: (word: string) => void }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !words.length) return;

    let chart: any = null;
    let disposed = false;

    (async () => {
      const echarts = await import('echarts');
      await import('echarts-wordcloud');

      if (disposed || !chartRef.current) return;

      chart = echarts.init(chartRef.current);

      const data = words.map((w, i) => ({
        name: w.word,
        value: w.count,
        textStyle: {
          color: WORD_COLORS[i % WORD_COLORS.length],
        },
      }));

      chart.setOption({
        tooltip: {
          show: true,
          formatter: (params: any) => {
            const p = Array.isArray(params) ? params[0] : params;
            return `<strong>${p.name}</strong>: ${p.value} menciones — click para ver noticias`;
          },
        },
        series: [
          {
            type: 'wordCloud',
            shape: 'circle',
            gridSize: 8,
            sizeRange: [14, 56],
            rotationRange: [-45, 45],
            rotationStep: 15,
            drawOutOfBound: false,
            layoutAnimation: true,
            textStyle: {
              fontFamily: 'Inter, sans-serif',
              fontWeight: 'bold',
              cursor: 'pointer',
            },
            emphasis: {
              textStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0,0,0,0.3)',
              },
            },
            data,
          },
        ],
      });

      chart.on('click', (params: any) => {
        if (params.name && onWordClick) {
          onWordClick(params.name);
        }
      });
    })();

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      chart?.dispose();
    };
  }, [words, onWordClick]);

  if (!words.length) return <EmptyViz message="No hay palabras para visualizar" />;

  return (
    <>
      <div ref={chartRef} className="w-full min-h-[300px] h-[420px]" />
      <p className="text-center text-2xs text-text-muted dark:text-slate-500 -mt-2">Hacé click en una palabra para ver las noticias que la contienen</p>
    </>
  );
}

// ─── Bar Chart (top keywords) ───
function KeywordBarsView({ words }: { words: WordItem[] }) {
  if (!words.length) return <EmptyViz message="No hay datos para el gráfico" />;

  const top20 = words.slice(0, 20);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={top20} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="word"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          width={75}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} menciones`, 'Frecuencia']}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Trends over time ───
function TrendsView({ trends }: { trends: TrendPoint[] }) {
  if (!trends.length) return <EmptyViz message="No hay datos de tendencia" />;

  const formatDate = (d: string) => {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}`;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={trends} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
          labelFormatter={(label) => {
            const [y, m, d] = String(label).split('-');
            return `${d}/${m}/${y}`;
          }}
        />
        <Area type="monotone" dataKey="institucional" stackId="1" stroke={CAT_COLORS.institucional} fill={CAT_COLORS.institucional} fillOpacity={0.6} />
        <Area type="monotone" dataKey="producto" stackId="1" stroke={CAT_COLORS.producto} fill={CAT_COLORS.producto} fillOpacity={0.6} />
        <Area type="monotone" dataKey="sector" stackId="1" stroke={CAT_COLORS.sector} fill={CAT_COLORS.sector} fillOpacity={0.6} />
        <Area type="monotone" dataKey="ecosistema" stackId="1" stroke={CAT_COLORS.ecosistema} fill={CAT_COLORS.ecosistema} fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Treemap ───
function TreemapCell(props: any) {
  const { x, y, width, height, name, count } = props;
  if (width < 30 || height < 30) return null;

  const color = TREEMAP_COLORS[name] || '#64748b';

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="var(--bg-primary)" strokeWidth={2} rx={6} style={{ opacity: 0.85 }} />
      {width > 50 && height > 40 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">{name}</text>
          <text x={x + width / 2} y={y + height / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={11}>{count} noticias</text>
        </>
      )}
    </g>
  );
}

function TreemapView({ categories }: { categories: CategoryItem[] }) {
  if (!categories.length) return <EmptyViz message="No hay datos de categorías" />;
  const data = categories.map(c => ({ ...c, size: c.count }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap data={data} dataKey="size" nameKey="name" content={<TreemapCell />} />
    </ResponsiveContainer>
  );
}

function EmptyViz({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[300px] text-sm text-text-muted dark:text-slate-500">
      {message}
    </div>
  );
}

function TrendsLegend() {
  const items = [
    { label: 'Institucional', color: CAT_COLORS.institucional },
    { label: 'Producto', color: CAT_COLORS.producto },
    { label: 'Sector', color: CAT_COLORS.sector },
    { label: 'Ecosistema', color: CAT_COLORS.ecosistema },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2 px-2">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: i.color }} />
          <span className="text-2xs text-text-muted dark:text-slate-400">{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Date range helpers
// ═══════════════════════════════════════════
type DatePreset = 'today' | 'week' | 'month' | 'year' | 'last-year' | 'custom';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year', label: 'Este Año' },
  { key: 'last-year', label: 'Año Anterior' },
  { key: 'custom', label: 'Personalizado' },
];

function computeDateRange(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  switch (preset) {
    case 'today':
      return { dateFrom: today, dateTo: today };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay()); // start of week (Sunday)
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today };
    }
    case 'month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { dateFrom: from, dateTo: today };
    }
    case 'year':
      return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: today };
    case 'last-year': {
      const y = now.getFullYear() - 1;
      return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
    }
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

// ─── Word Articles Modal ───
interface WordArticle {
  id: string;
  title: string;
  header?: string;
  sourceUrl: string;
  sourceName: string;
  clippingCategory?: string;
  publishedAt: string;
}

function WordArticlesModal({
  word,
  articles,
  loading,
  onClose,
}: {
  word: string;
  articles: WordArticle[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-indigo-500" />
              Noticias con &quot;<span className="text-indigo-600 dark:text-indigo-300">{word}</span>&quot;
            </h3>
            {!loading && (
              <p className="text-2xs text-text-muted dark:text-slate-500 mt-0.5">
                {articles.length} {articles.length === 1 ? 'noticia encontrada' : 'noticias encontradas'}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary dark:text-slate-400 dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          )}

          {!loading && articles.length === 0 && (
            <div className="text-center py-12">
              <Newspaper className="w-10 h-10 text-text-disabled dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-text-muted dark:text-slate-400">No se encontraron noticias</p>
            </div>
          )}

          {!loading && articles.map((a) => (
            <a
              key={a.id}
              href={a.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-[var(--border)] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-primary dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {a.title}
                  </p>
                  {a.header && (
                    <p className="text-2xs text-text-muted dark:text-slate-400 mt-1 line-clamp-2">{a.header}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-2xs text-text-disabled dark:text-slate-500">{a.sourceName}</span>
                    {a.clippingCategory && (
                      <span className="text-2xs px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                        {a.clippingCategory}
                      </span>
                    )}
                    <span className="text-2xs text-text-disabled dark:text-slate-500">
                      {new Date(a.publishedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-text-disabled dark:text-slate-600 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Main exported component
// ═══════════════════════════════════════════
export function ClippingAnalyticsPanel() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('wordcloud');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Word click drill-down
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordArticles, setWordArticles] = useState<WordArticle[]>([]);
  const [wordLoading, setWordLoading] = useState(false);

  // Compute effective date range
  const effectiveDates = useMemo(() => {
    if (datePreset === 'custom') return { dateFrom: customFrom, dateTo: customTo };
    return computeDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const fetchAnalytics = useCallback(async (q: string, dateFrom: string, dateTo: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await fetch(`/api/clipping/analytics?${params.toString()}`);
      if (res.status === 401) return;
      if (!res.ok) throw new Error('Error al analizar');
      const json: AnalyticsData = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when dates or query change
  useEffect(() => {
    fetchAnalytics(submittedQuery, effectiveDates.dateFrom, effectiveDates.dateTo);
  }, [fetchAnalytics, submittedQuery, effectiveDates.dateFrom, effectiveDates.dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query);
  };

  const clearSearch = () => {
    setQuery('');
    setSubmittedQuery('');
  };

  const handleWordClick = useCallback(async (word: string) => {
    setSelectedWord(word);
    setWordLoading(true);
    try {
      const res = await fetch(`/api/clipping/news?q=${encodeURIComponent(word)}&limit=50`);
      if (!res.ok) throw new Error('Error al buscar');
      const json = await res.json();
      setWordArticles(json.data || []);
    } catch {
      setWordArticles([]);
    } finally {
      setWordLoading(false);
    }
  }, []);

  return (
    <div className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              Análisis de Contenido
            </h2>
            {data && (
              <p className="text-2xs text-text-muted dark:text-slate-500 mt-0.5">
                {data.articlesAnalyzed} noticias analizadas
                {submittedQuery && (
                  <> · Filtro: <span className="text-indigo-600 dark:text-indigo-300">&quot;{submittedQuery}&quot;</span></>
                )}
              </p>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted dark:text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar keyword..."
                className="pl-8 pr-8 py-1.5 w-48 sm:w-56 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-text-primary dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              />
              {submittedQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary dark:text-slate-500 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Analizar'}
            </button>
          </form>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Calendar className="w-3.5 h-3.5 text-text-muted dark:text-slate-500 flex-shrink-0" />
          {DATE_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setDatePreset(p.key)}
              className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-all ${
                datePreset === p.key
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                  : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 ml-1">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-2xs text-text-primary dark:text-white focus:outline-none focus:border-indigo-500/50"
              />
              <span className="text-2xs text-text-muted dark:text-slate-500">a</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-2xs text-text-primary dark:text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                    : 'text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[350px]">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 dark:text-indigo-400" />
          </div>
        )}

        {!loading && data && (
          <>
            {activeTab === 'wordcloud' && <WordCloudView words={data.wordcloud || []} onWordClick={handleWordClick} />}
            {activeTab === 'bars' && <KeywordBarsView words={data.wordcloud || []} />}
            {activeTab === 'trends' && (
              <>
                <TrendsView trends={data.trends || []} />
                <TrendsLegend />
              </>
            )}
            {activeTab === 'treemap' && <TreemapView categories={data.categories || []} />}
          </>
        )}
      </div>

      {/* Word drill-down modal */}
      {selectedWord && (
        <WordArticlesModal
          word={selectedWord}
          articles={wordArticles}
          loading={wordLoading}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}
