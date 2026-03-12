'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Save,
  Loader2,
  Tag,
  Radio,
  AlertCircle,
  Check,
  Link2,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  RotateCcw,
} from 'lucide-react';

interface CustomSource {
  name: string;
  feedUrl: string;
}

interface Preferences {
  customKeywords: string[];
  enabledSources: string[];
  availableSources: string[];
  customSources: CustomSource[];
  defaultKeywords: Record<string, string[]>;
}

interface ClippingSettingsPanelProps {
  onClose: () => void;
  onSave: () => void;
}

type Category = 'institucional' | 'sector' | 'producto' | 'ecosistema';

const CATEGORY_LABELS: Record<string, string> = {
  institucional: 'Institucional',
  producto: 'Producto',
  sector: 'Sector',
  ecosistema: 'Ecosistema',
};

const CATEGORY_COLORS: Record<string, string> = {
  institucional: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  producto: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  sector: 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/20',
  ecosistema: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
};

// Explicit render order — institucional first
const CATEGORY_ORDER: Category[] = ['institucional', 'sector', 'producto', 'ecosistema'];

const CATEGORY_DROP_HIGHLIGHT: Record<string, string> = {
  institucional: 'ring-2 ring-indigo-500/50 bg-indigo-500/5',
  producto: 'ring-2 ring-emerald-500/50 bg-emerald-500/5',
  sector: 'ring-2 ring-violet-500/50 bg-violet-500/5',
  ecosistema: 'ring-2 ring-amber-500/50 bg-amber-500/5',
};

export function ClippingSettingsPanel({ onClose, onSave }: ClippingSettingsPanelProps) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [enabledSources, setEnabledSources] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    institucional: true,
    sector: true,
    producto: true,
    ecosistema: true,
  });

  // ─── System keywords state (editable) ───
  const [systemKeywords, setSystemKeywords] = useState<Record<string, string[]>>({});
  const [systemKeywordsDirty, setSystemKeywordsDirty] = useState(false);
  const [newCategoryKeyword, setNewCategoryKeyword] = useState<Record<string, string>>({});

  // ─── Drag state ───
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null);
  const [dragSourceCategory, setDragSourceCategory] = useState<string | null>(null);
  const [dropTargetCategory, setDropTargetCategory] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clipping/preferences');
      if (!res.ok) throw new Error('Error al cargar preferencias');
      const data: Preferences = await res.json();
      setPrefs(data);
      setKeywords(data.customKeywords || []);
      setEnabledSources(data.enabledSources || []);
      setCustomSources(data.customSources || []);
      setSystemKeywords(data.defaultKeywords || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Drag and Drop handlers ───

  const handleDragStart = useCallback((keyword: string, category: string) => {
    setDraggedKeyword(keyword);
    setDragSourceCategory(category);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedKeyword(null);
    setDragSourceCategory(null);
    setDropTargetCategory(null);
    dragCounterRef.current = {};
  }, []);

  const handleDragEnterCategory = useCallback((category: string) => {
    dragCounterRef.current[category] = (dragCounterRef.current[category] || 0) + 1;
    setDropTargetCategory(category);
  }, []);

  const handleDragLeaveCategory = useCallback((category: string) => {
    dragCounterRef.current[category] = (dragCounterRef.current[category] || 0) - 1;
    if (dragCounterRef.current[category] <= 0) {
      dragCounterRef.current[category] = 0;
      setDropTargetCategory(prev => prev === category ? null : prev);
    }
  }, []);

  const handleDragOverCategory = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnCategory = useCallback((targetCategory: string) => {
    if (!draggedKeyword || !dragSourceCategory || dragSourceCategory === targetCategory) {
      handleDragEnd();
      return;
    }

    // Check if keyword already exists in target
    if (systemKeywords[targetCategory]?.includes(draggedKeyword)) {
      handleDragEnd();
      return;
    }

    setSystemKeywords(prev => {
      const updated = { ...prev };
      // Remove from source
      updated[dragSourceCategory!] = prev[dragSourceCategory!].filter(k => k !== draggedKeyword);
      // Add to target
      updated[targetCategory] = [...(prev[targetCategory] || []), draggedKeyword!];
      return updated;
    });
    setSystemKeywordsDirty(true);
    handleDragEnd();
  }, [draggedKeyword, dragSourceCategory, systemKeywords, handleDragEnd]);

  // ─── System keyword CRUD ───

  const removeSystemKeyword = (category: string, keyword: string) => {
    setSystemKeywords(prev => ({
      ...prev,
      [category]: prev[category].filter(k => k !== keyword),
    }));
    setSystemKeywordsDirty(true);
  };

  const addSystemKeyword = (category: string) => {
    const kw = (newCategoryKeyword[category] || '').trim().toLowerCase();
    if (!kw) return;

    // Check if keyword exists in any category
    const existsIn = Object.entries(systemKeywords).find(([, kws]) => kws.includes(kw));
    if (existsIn) {
      setError(`"${kw}" ya existe en ${CATEGORY_LABELS[existsIn[0]] || existsIn[0]}`);
      return;
    }

    setSystemKeywords(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), kw],
    }));
    setNewCategoryKeyword(prev => ({ ...prev, [category]: '' }));
    setSystemKeywordsDirty(true);
    setError('');
  };

  const saveSystemKeywords = async () => {
    setSavingKeywords(true);
    setError('');
    try {
      const res = await fetch('/api/clipping/keywords', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: systemKeywords }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar keywords del sistema');
      }
      setSystemKeywordsDirty(false);
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingKeywords(false);
    }
  };

  const resetSystemKeywords = async () => {
    try {
      const res = await fetch('/api/clipping/preferences');
      if (!res.ok) throw new Error('Error al recargar');
      const data = await res.json();
      setSystemKeywords(data.defaultKeywords || {});
      setSystemKeywordsDirty(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Custom keywords ───

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw || keywords.includes(kw)) return;
    setKeywords([...keywords, kw]);
    setNewKeyword('');
    setSaved(false);
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
    setSaved(false);
  };

  const addCustomSource = () => {
    const name = newSourceName.trim();
    const feedUrl = newSourceUrl.trim();
    if (!name || !feedUrl) return;
    try { new URL(feedUrl); } catch { setError('URL inválida'); return; }
    if (customSources.some(s => s.name === name)) { setError('Ya existe una fuente con ese nombre'); return; }
    setCustomSources([...customSources, { name, feedUrl }]);
    setNewSourceName('');
    setNewSourceUrl('');
    setError('');
    setSaved(false);
  };

  const removeCustomSource = (name: string) => {
    setCustomSources(customSources.filter(s => s.name !== name));
    setEnabledSources(enabledSources.filter(s => s !== name));
    setSaved(false);
  };

  const toggleSource = (source: string) => {
    setEnabledSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
    setSaved(false);
  };

  const allSourceNames = [...(prefs?.availableSources || []), ...customSources.map(s => s.name)];

  const selectAllSources = () => {
    setEnabledSources([...allSourceNames]);
    setSaved(false);
  };

  const clearAllSources = () => {
    setEnabledSources([]);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/clipping/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customKeywords: keywords, enabledSources, customSources }),
      });
      if (!res.ok) throw new Error('Error al guardar preferencias');
      setSaved(true);
      onSave();
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSourceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSource();
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated dark:bg-[#111] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-sm font-bold text-text-primary dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Configuración del Clipping
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-[var(--interactive-hover)] transition-colors"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* ─── Editable A3 Keywords by Category (drag & drop) ─── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Keywords del Sistema (A3 Mercados)
            </h3>
            {systemKeywordsDirty && (
              <div className="flex items-center gap-2">
                <button
                  onClick={resetSystemKeywords}
                  className="text-2xs text-text-muted dark:text-slate-500 hover:text-text-primary dark:hover:text-white flex items-center gap-1 transition-colors"
                  title="Descartar cambios"
                >
                  <RotateCcw className="w-3 h-3" />
                  Descartar
                </button>
                <button
                  onClick={saveSystemKeywords}
                  disabled={savingKeywords}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-2xs font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {savingKeywords ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Guardar Keywords
                </button>
              </div>
            )}
          </div>
          <p className="text-2xs text-text-muted dark:text-slate-500 mb-3">
            Arrastra keywords entre categorías, agrega nuevas o elimina las que no necesites. Los cambios aplican inmediatamente al servicio del cron.
          </p>

          <div className="space-y-2">
            {CATEGORY_ORDER
              .filter(cat => systemKeywords[cat] != null)
              .map((cat) => {
              const kws = systemKeywords[cat] || [];
              const isInstitucional = cat === 'institucional';
              const isDropTarget = dropTargetCategory === cat && dragSourceCategory !== cat;
              return (
                <div
                  key={cat}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isInstitucional
                      ? 'border-blue-500/40 bg-blue-500/[0.03]'
                      : 'border-[var(--border)]'
                  } ${
                    isDropTarget ? CATEGORY_DROP_HIGHLIGHT[cat] || 'ring-2 ring-blue-500/50' : ''
                  }`}
                  onDragEnter={() => handleDragEnterCategory(cat)}
                  onDragLeave={() => handleDragLeaveCategory(cat)}
                  onDragOver={handleDragOverCategory}
                  onDrop={() => handleDropOnCategory(cat)}
                >
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-text-primary dark:text-white hover:bg-[var(--interactive-hover)] transition-colors ${
                      isInstitucional ? 'py-2.5' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {expandedCategories[cat] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      {CATEGORY_LABELS[cat] || cat}
                      {isInstitucional && (
                        <span className="text-2xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 dark:text-blue-300 font-semibold uppercase tracking-wider">
                          Prioritaria
                        </span>
                      )}
                    </span>
                    <span className="text-2xs text-text-muted dark:text-slate-500">{kws.length} keywords</span>
                  </button>

                  {expandedCategories[cat] && (
                    <div className="px-3 pb-3">
                      {/* Keywords list (draggable) */}
                      <div className="flex flex-wrap gap-1 mb-2 min-h-[28px]">
                        {kws.length === 0 && (
                          <span className="text-2xs text-text-disabled italic py-1">
                            {isDropTarget ? 'Suelta aquí para mover...' : 'Sin keywords — arrastra o agrega desde abajo'}
                          </span>
                        )}
                        {kws.map((kw: string) => (
                          <span
                            key={kw}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', kw);
                              handleDragStart(kw, cat);
                            }}
                            onDragEnd={handleDragEnd}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-medium border cursor-grab active:cursor-grabbing select-none transition-opacity ${
                              CATEGORY_COLORS[cat] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                            } ${draggedKeyword === kw ? 'opacity-40' : 'opacity-100'}`}
                          >
                            <GripVertical className="w-2.5 h-2.5 opacity-40" />
                            {kw}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSystemKeyword(cat, kw);
                              }}
                              className="ml-0.5 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              title={`Eliminar "${kw}"`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add keyword to this category */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCategoryKeyword[cat] || ''}
                          onChange={(e) => setNewCategoryKeyword(prev => ({ ...prev, [cat]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSystemKeyword(cat);
                            }
                          }}
                          placeholder={`Agregar a ${CATEGORY_LABELS[cat]}...`}
                          className="flex-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-2xs text-text-primary dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                        />
                        <button
                          onClick={() => addSystemKeyword(cat)}
                          disabled={!(newCategoryKeyword[cat] || '').trim()}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-2xs rounded transition-colors disabled:opacity-40 flex items-center gap-0.5"
                          title={`Agregar keyword a ${CATEGORY_LABELS[cat]}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Custom Keywords ─── */}
        <div>
          <h3 className="text-xs font-semibold text-text-primary dark:text-white mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Keywords Personalizadas
          </h3>
          <p className="text-2xs text-text-muted dark:text-slate-500 mb-3">
            Agrega keywords adicionales para filtrar noticias. Si no hay keywords personalizadas, se muestran todas las noticias del clipping.
          </p>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar keyword..."
              className="flex-1 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-text-primary dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              onClick={addKeyword}
              disabled={!newKeyword.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {keywords.length === 0 && (
              <span className="text-2xs text-text-disabled dark:text-slate-600 italic">
                Sin keywords personalizadas — se muestran todas las noticias clasificadas
              </span>
            )}
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 rounded-md text-2xs font-medium"
              >
                {kw}
                <button
                  onClick={() => removeKeyword(kw)}
                  className="hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title={`Eliminar "${kw}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ─── Media Sources (built-in) ─── */}
        <div>
          <h3 className="text-xs font-semibold text-text-primary dark:text-white mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            Fuentes de Medios
          </h3>
          <p className="text-2xs text-text-muted dark:text-slate-500 mb-2">
            Selecciona las fuentes que quieres monitorear. Si ninguna está seleccionada, se incluyen todas.
          </p>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={selectAllSources}
              className="text-2xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Seleccionar todas
            </button>
            <span className="text-text-disabled">·</span>
            <button
              onClick={clearAllSources}
              className="text-2xs text-text-muted dark:text-slate-500 hover:underline"
            >
              Limpiar selección
            </button>
            <span className="ml-auto text-2xs text-text-muted dark:text-slate-500">
              {enabledSources.length}/{allSourceNames.length} seleccionadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {allSourceNames.map((source) => {
              const isEnabled = enabledSources.includes(source);
              const isCustom = customSources.some(s => s.name === source);
              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all border ${
                    isEnabled
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
                      : 'bg-[var(--bg-secondary)] text-text-muted dark:text-slate-400 border-[var(--border)] hover:border-indigo-500/20'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isEnabled
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {isEnabled && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{source}</span>
                  {isCustom && (
                    <span className="ml-auto text-2xs text-amber-500 dark:text-amber-400 flex-shrink-0">RSS</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Add Custom Source ─── */}
        <div>
          <h3 className="text-xs font-semibold text-text-primary dark:text-white mb-1 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Agregar Fuente Personalizada
          </h3>
          <p className="text-2xs text-text-muted dark:text-slate-500 mb-3">
            Agrega fuentes RSS personalizadas. El servicio las incluirá en el monitoreo automático.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Nombre de la fuente..."
              className="flex-1 sm:max-w-[200px] px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-text-primary dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            <input
              type="url"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              onKeyDown={handleSourceKeyDown}
              placeholder="URL del feed RSS..."
              className="flex-[2] px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-xs text-text-primary dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              onClick={addCustomSource}
              disabled={!newSourceName.trim() || !newSourceUrl.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Feed
            </button>
          </div>

          {/* List of custom sources */}
          {customSources.length > 0 && (
            <div className="space-y-1.5">
              {customSources.map((src) => (
                <div
                  key={src.name}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg"
                >
                  <Link2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-text-primary dark:text-white">{src.name}</span>
                    <span className="text-2xs text-text-muted dark:text-slate-500 block truncate">{src.feedUrl}</span>
                  </div>
                  <button
                    onClick={() => removeCustomSource(src.name)}
                    className="p-1 text-text-muted hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                    title={`Eliminar "${src.name}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border)]">
          {saved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Guardado
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  );
}
