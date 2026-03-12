'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import {
  BarChart3,
  Plus,
  Clock,
  Database,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  Search,
} from 'lucide-react';

interface Indicator {
  id: string;
  code: string;
  name: string;
  shortName: string;
  category: string;
  value: number;
  previousValue: number | null;
  unit: string | null;
  source: string;
  sourceUrl: string | null;
  disclaimer: string | null;
  updatedAt: string;
  createdAt: string;
}

type FormData = {
  code: string;
  name: string;
  shortName: string;
  category: string;
  value: string;
  previousValue: string;
  unit: string;
  source: string;
  sourceUrl: string;
  disclaimer: string;
};

const CATEGORIES = [
  { value: 'cambios', label: 'Tipo de Cambio' },
  { value: 'tasas', label: 'Tasas de Interés' },
  { value: 'inflacion', label: 'Inflación' },
  { value: 'actividad', label: 'Actividad Económica' },
  { value: 'mercados', label: 'Mercados' },
  { value: 'agro', label: 'Agro / Commodities' },
  { value: 'cripto', label: 'Criptomonedas' },
  { value: 'energia', label: 'Energía' },
] as const;

const categoryLabels: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

const emptyForm: FormData = {
  code: '',
  name: '',
  shortName: '',
  category: 'agro',
  value: '',
  previousValue: '',
  unit: '',
  source: '',
  sourceUrl: '',
  disclaimer: '',
};

export function IndicadoresClient() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIndicators = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/indicators');
      if (res.ok) {
        const data = await res.json();
        setIndicators(data);
      }
    } catch {
      showToast('error', 'Error al cargar indicadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndicators();
  }, [fetchIndicators]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
  }

  function openCreateForm() {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  }

  function openEditForm(indicator: Indicator) {
    setForm({
      code: indicator.code,
      name: indicator.name,
      shortName: indicator.shortName,
      category: indicator.category,
      value: String(indicator.value),
      previousValue: indicator.previousValue != null ? String(indicator.previousValue) : '',
      unit: indicator.unit || '',
      source: indicator.source,
      sourceUrl: indicator.sourceUrl || '',
      disclaimer: indicator.disclaimer || '',
    });
    setEditingId(indicator.id);
    setErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      shortName: form.shortName.trim(),
      category: form.category,
      value: parseFloat(form.value),
      previousValue: form.previousValue ? parseFloat(form.previousValue) : null,
      unit: form.unit.trim() || null,
      source: form.source.trim(),
      sourceUrl: form.sourceUrl.trim() || null,
      disclaimer: form.disclaimer.trim() || null,
    };

    if (isNaN(payload.value)) {
      setErrors({ value: 'El valor debe ser un número válido' });
      setSaving(false);
      return;
    }

    try {
      const url = editingId
        ? `/api/admin/indicators/${editingId}`
        : '/api/admin/indicators';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          showToast('error', data.error || 'Error al guardar');
        }
        return;
      }

      showToast('success', editingId ? 'Indicador actualizado' : 'Indicador creado');
      closeForm();
      fetchIndicators();
    } catch {
      showToast('error', 'Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/indicators/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Indicador eliminado');
        setDeleteConfirm(null);
        fetchIndicators();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Error al eliminar');
      }
    } catch {
      showToast('error', 'Error de conexión');
    }
  }

  // Filter and group
  const filtered = searchQuery
    ? indicators.filter(
        (ind) =>
          ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ind.source.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : indicators;

  const grouped = filtered.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = [];
    acc[ind.category].push(ind);
    return acc;
  }, {} as Record<string, Indicator[]>);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white">Indicadores Manuales</h1>
          <p className="text-sm text-text-muted mt-1">
            Indicadores cargados manualmente que complementan los datos de APIs
          </p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateForm}>
          Nuevo Indicador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary dark:text-white">{indicators.length}</p>
            <p className="text-xs text-text-muted">Indicadores manuales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-text-primary dark:text-white">
              {Object.keys(
                indicators.reduce((acc, i) => ({ ...acc, [i.category]: true }), {} as Record<string, boolean>)
              ).length}
            </p>
            <p className="text-xs text-text-muted">Categorías</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-500">
              <Database className="w-5 h-5" />
            </div>
            <p className="text-xs text-text-muted mt-1">6 APIs automáticas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500">
              <RefreshCw className="w-5 h-5" />
            </div>
            <p className="text-xs text-text-muted mt-1">Auto-actualización</p>
          </CardContent>
        </Card>
      </div>

      {/* API info */}
      <Card variant="outlined" className="bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary dark:text-white mb-1">
                Indicadores automáticos
              </h3>
              <p className="text-xs text-text-muted mb-2">
                La mayoría de indicadores se obtienen automáticamente de APIs externas:
              </p>
              <div className="flex flex-wrap gap-2">
                {['BCRA (tasas, inflación, UVA)', 'DolarAPI (cotizaciones)', 'CoinGecko (cripto)', 'Yahoo Finance (MERVAL)', 'ArgentinaDatos (backup)', 'Ámbito (soja Rosario)'].map((src) => (
                  <Badge key={src} variant="default" size="sm">{src}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={closeForm}>
          <div
            className="bg-surface dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary dark:text-white">
                {editingId ? 'Editar Indicador' : 'Nuevo Indicador'}
              </h2>
              <button onClick={closeForm} title="Cerrar" className="text-text-muted hover:text-text-primary dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nombre *"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ej: Soja Disponible Rosario"
                  error={errors.name}
                />
                <Input
                  label="Nombre corto *"
                  value={form.shortName}
                  onChange={(e) => updateField('shortName', e.target.value)}
                  placeholder="Ej: Soja Disp."
                  error={errors.shortName}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código *"
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="Ej: SOJA_ROSARIO_DISPONIBLE"
                  hint="Solo mayúsculas, números y guiones bajos"
                  error={errors.code}
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Categoría *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    aria-label="Categoría"
                    className="w-full h-10 px-3 rounded-md bg-surface border border-border text-sm text-text-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Valor actual *"
                  type="number"
                  step="any"
                  value={form.value}
                  onChange={(e) => updateField('value', e.target.value)}
                  placeholder="Ej: 385000"
                  error={errors.value}
                />
                <Input
                  label="Valor anterior"
                  type="number"
                  step="any"
                  value={form.previousValue}
                  onChange={(e) => updateField('previousValue', e.target.value)}
                  placeholder="Opcional"
                  error={errors.previousValue}
                />
                <Input
                  label="Unidad"
                  value={form.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  placeholder="Ej: ARS/tn, USD, %"
                  error={errors.unit}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Fuente *"
                  value={form.source}
                  onChange={(e) => updateField('source', e.target.value)}
                  placeholder="Ej: Bolsa de Comercio de Rosario"
                  error={errors.source}
                />
                <Input
                  label="URL de la fuente"
                  value={form.sourceUrl}
                  onChange={(e) => updateField('sourceUrl', e.target.value)}
                  placeholder="https://..."
                  error={errors.sourceUrl}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Disclaimer
                </label>
                <textarea
                  value={form.disclaimer}
                  onChange={(e) => updateField('disclaimer', e.target.value)}
                  placeholder="Nota o aclaración opcional sobre este indicador"
                  rows={2}
                  className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm text-text-primary dark:bg-slate-800 dark:border-slate-700 dark:text-white placeholder:text-text-disabled focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={closeForm}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={saving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Indicador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div
            className="bg-surface dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary dark:text-white mb-2">
              ¿Eliminar indicador?
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Esta acción no se puede deshacer. El indicador será eliminado permanentemente.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {indicators.length > 0 && (
        <Input
          placeholder="Buscar por nombre, código o fuente..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      )}

      {/* Indicators Table */}
      {loading ? (
        <Card className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-text-muted mx-auto mb-3 animate-spin" />
          <p className="text-sm text-text-muted">Cargando indicadores...</p>
        </Card>
      ) : indicators.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-2">No hay indicadores manuales cargados.</p>
          <p className="text-xs text-text-muted mb-4">
            Los indicadores manuales permiten cargar datos que no están disponibles vía API.
          </p>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateForm}>
            Crear primer indicador
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No se encontraron resultados para &quot;{searchQuery}&quot;</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <Card key={category} padding="none">
            <div className="p-4 pb-0">
              <CardHeader
                title={categoryLabels[category] || category}
                description={`${items.length} indicador${items.length > 1 ? 'es' : ''}`}
              />
            </div>
            <CardContent className="p-0 mt-0">
              <div className="divide-y divide-border">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-text-muted uppercase bg-surface-secondary dark:bg-slate-800/50">
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-2">Código</div>
                  <div className="col-span-2 text-right">Valor</div>
                  <div className="col-span-2">Fuente</div>
                  <div className="col-span-2">Actualización</div>
                  <div className="col-span-1 text-right">Acciones</div>
                </div>
                {items.map((ind) => (
                  <div key={ind.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-surface-secondary/50 dark:hover:bg-slate-800/30">
                    <div className="col-span-3">
                      <span className="text-sm font-medium text-text-primary dark:text-white">{ind.name}</span>
                      <span className="text-xs text-text-muted block">{ind.shortName}</span>
                    </div>
                    <div className="col-span-2">
                      <code className="text-xs bg-surface-secondary dark:bg-slate-800 px-1.5 py-0.5 rounded">{ind.code}</code>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-mono font-semibold text-text-primary dark:text-white">
                        {formatNumber(ind.value, { decimals: 2 })}
                      </span>
                      {ind.unit && <span className="text-xs text-text-muted ml-1">{ind.unit}</span>}
                      {ind.previousValue != null && ind.previousValue !== ind.value && (
                        <span className={`text-xs block ${ind.value > ind.previousValue ? 'text-emerald-500' : 'text-red-500'}`}>
                          {ind.value > ind.previousValue ? '▲' : '▼'} {formatNumber(Math.abs(ind.value - ind.previousValue), { decimals: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-text-muted">{ind.source}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{new Date(ind.updatedAt).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditForm(ind)}
                        className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ind.id)}
                        className="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
