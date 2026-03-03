'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/admin/admin-layout';
import {
  Save,
  Eye,
  ArrowLeft,
  Image as ImageIcon,
  Calendar,
  Tag,
  Loader2,
  Upload,
  X,
  Trash2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Minus,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';

interface ArticleEditorProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    avatar?: string | null;
  };
  article?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    coverImage: string | null;
    status: string;
    publishedAt: Date | null;
    categoryId: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    ogImage: string | null;
    keywords: string | null;
    canonicalUrl: string | null;
    tags: { tag: { id: string; name: string; slug: string } }[];
  };
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
}

export function ArticleEditor({
  user,
  article,
  categories,
  tags,
}: ArticleEditorProps) {
  const router = useRouter();
  const isNew = !article;
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    content: article?.content || '',
    coverImage: article?.coverImage || '',
    categoryId: article?.categoryId || '',
    status: article?.status || 'DRAFT',
    publishedAt: article?.publishedAt
      ? new Date(article.publishedAt).toISOString().slice(0, 16)
      : '',
    tagIds: article?.tags.map((t) => t.tag.id) || [],
    metaTitle: article?.metaTitle || '',
    metaDescription: article?.metaDescription || '',
    ogImage: article?.ogImage || '',
    keywords: article?.keywords || '',
    canonicalUrl: article?.canonicalUrl || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isNew
        ? title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
        : prev.slug,
    }));
  };

  // Upload a file to the server
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        setUploadError(error.error || 'Error al subir imagen');
        return null;
      }

      const result = await response.json();
      setUploadError('');
      return result.url;
    } catch {
      setUploadError('Error de conexión al subir imagen');
      return null;
    }
  }, []);

  // Handle cover image upload
  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    const url = await uploadFile(file);
    if (url) {
      setFormData((prev) => ({ ...prev, coverImage: url }));
    }
    setIsUploadingCover(false);
  };

  // Handle content image upload (inserts markdown image)
  const handleContentImageUpload = async (file: File) => {
    setIsUploading(true);
    const url = await uploadFile(file);
    if (url) {
      insertAtCursor(`\n![${file.name}](${url})\n`);
    }
    setIsUploading(false);
  };

  // Drag & Drop handlers for content area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith('image/'));
    if (imageFile) {
      await handleContentImageUpload(imageFile);
    }
  };

  // Insert text at cursor position in textarea
  const insertAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = formData.content.substring(0, start);
    const after = formData.content.substring(end);

    setFormData((prev) => ({
      ...prev,
      content: before + text + after,
    }));

    // Restore cursor position after insert
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + text.length;
      textarea.selectionEnd = start + text.length;
    }, 0);
  };

  // Wrap selected text with markdown syntax
  const wrapSelection = (before: string, after: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.content.substring(start, end);
    const textBefore = formData.content.substring(0, start);
    const textAfter = formData.content.substring(end);

    const newContent = textBefore + before + selected + after + textAfter;
    setFormData((prev) => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  };

  // Markdown toolbar actions
  const toolbarActions = [
    { icon: Bold, label: 'Negrita', action: () => wrapSelection('**', '**') },
    { icon: Italic, label: 'Cursiva', action: () => wrapSelection('*', '*') },
    { icon: Heading1, label: 'Título 1', action: () => insertAtCursor('\n## ') },
    { icon: Heading2, label: 'Título 2', action: () => insertAtCursor('\n### ') },
    { icon: List, label: 'Lista', action: () => insertAtCursor('\n- ') },
    { icon: ListOrdered, label: 'Lista numerada', action: () => insertAtCursor('\n1. ') },
    { icon: Link2, label: 'Enlace', action: () => wrapSelection('[', '](url)') },
    { icon: Quote, label: 'Cita', action: () => insertAtCursor('\n> ') },
    { icon: Code, label: 'Código', action: () => wrapSelection('`', '`') },
    { icon: Minus, label: 'Separador', action: () => insertAtCursor('\n---\n') },
  ];

  // Simple markdown to HTML for preview
  const renderMarkdownPreview = (text: string) => {
    if (!text) return '<p class="text-text-muted italic">Sin contenido</p>';
    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Bold & Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="my-3 rounded-lg max-w-full" />')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent underline">$1</a>')
      // Blockquotes
      .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-4 italic my-2 text-text-secondary">$1</blockquote>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="bg-surface-secondary px-1 py-0.5 rounded text-sm">$1</code>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr class="my-4 border-border" />')
      // Lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal">$1</li>')
      .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc">$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br />');
    return `<p class="my-2">${html}</p>`;
  };

  const handleSubmit = async (status?: string) => {
    setIsSaving(true);
    setErrors({});

    const data = {
      ...formData,
      status: status || formData.status,
      publishedAt:
        (status || formData.status) === 'PUBLISHED' && !formData.publishedAt
          ? new Date().toISOString()
          : formData.publishedAt || null,
    };

    try {
      const response = await fetch(
        `/api/admin/articles${isNew ? '' : `/${article.id}`}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setErrors(error.errors || { general: 'Error al guardar' });
        setIsSaving(false);
        return;
      }

      router.push('/admin/articulos');
      router.refresh();
    } catch {
      setErrors({ general: 'Error de conexión' });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors({ general: error.error || 'Error al eliminar' });
        setIsDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }

      router.push('/admin/articulos');
      router.refresh();
    } catch {
      setErrors({ general: 'Error de conexión al eliminar' });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <AdminLayout user={user}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/articulos"
              className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-muted" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {isNew ? 'Nuevo Artículo' : 'Editar Artículo'}
              </h1>
              {!isNew && (
                <p className="text-text-muted text-sm">ID: {article.id}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && (
              <Link
                href={`/noticias/${article.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver
              </Link>
            )}
            <Button
              onClick={() => handleSubmit('DRAFT')}
              variant="outline"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Borrador
            </Button>
            <Button
              onClick={() => handleSubmit('PUBLISHED')}
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Publicar
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="mb-4 p-4 bg-down-subtle text-down rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Upload Error */}
        {uploadError && (
          <div className="mb-4 p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} title="Cerrar" aria-label="Cerrar error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Slug */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Título *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Título del artículo"
                    className="text-lg font-medium"
                  />
                  {errors.title && (
                    <p className="text-down text-sm mt-1">{errors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Slug
                  </label>
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="url-del-articulo"
                    className="font-mono text-sm"
                  />
                  {errors.slug && (
                    <p className="text-down text-sm mt-1">{errors.slug}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Excerpt */}
            <Card>
              <CardHeader title="Resumen" />
              <CardContent className="p-4 pt-0">
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                  }
                  placeholder="Breve descripción del artículo (aparece en listados y SEO)..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                />
                <p className="text-xs text-text-muted mt-1 text-right">
                  {formData.excerpt.length}/500
                </p>
              </CardContent>
            </Card>

            {/* Content with Markdown Toolbar */}
            <Card>
              <CardHeader title="Contenido" />
              <CardContent className="p-4 pt-0">
                {/* Markdown Toolbar */}
                <div className="flex items-center gap-1 mb-2 p-1 border border-border rounded-lg bg-surface-secondary flex-wrap">
                  {toolbarActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.action}
                      title={action.label}
                      className="p-1.5 rounded hover:bg-white/80 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <action.icon className="w-4 h-4" />
                    </button>
                  ))}

                  <div className="w-px h-5 bg-border mx-1" />

                  {/* Insert image button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Insertar imagen"
                    className="p-1.5 rounded hover:bg-white/80 text-text-secondary hover:text-accent transition-colors"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    aria-label="Subir imagen al contenido"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleContentImageUpload(file);
                      e.target.value = '';
                    }}
                  />

                  <div className="flex-1" />

                  {/* Preview toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      showPreview
                        ? 'bg-accent text-white'
                        : 'bg-white/80 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    {showPreview ? 'Editor' : 'Vista previa'}
                  </button>
                </div>

                {/* Content Area with Drag & Drop */}
                {showPreview ? (
                  <div
                    className="w-full min-h-[400px] px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary overflow-auto prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownPreview(formData.content),
                    }}
                  />
                ) : (
                  <div
                    className={`relative ${isDragOver ? 'ring-2 ring-accent ring-offset-2 rounded-lg' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <textarea
                      ref={contentRef}
                      value={formData.content}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      placeholder="Escribe el contenido del artículo aquí... (Markdown soportado)&#10;&#10;Puedes arrastrar y soltar imágenes directamente aquí."
                      rows={20}
                      className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-y font-mono text-sm min-h-[400px]"
                    />
                    {isDragOver && (
                      <div className="absolute inset-0 bg-accent/10 rounded-lg flex items-center justify-center pointer-events-none">
                        <div className="bg-white rounded-lg shadow-lg px-6 py-4 text-center">
                          <Upload className="w-8 h-8 text-accent mx-auto mb-2" />
                          <p className="text-sm font-medium text-text-primary">
                            Soltar imagen aquí
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-text-muted">
                    Markdown soportado. Arrastra imágenes o usa el botón 📷 de la barra.
                  </p>
                  {isUploading && (
                    <p className="text-xs text-accent flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Subiendo imagen...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SEO Section (Collapsible) */}
            <Card>
              <button
                type="button"
                onClick={() => setShowSeo(!showSeo)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-accent" />
                  <span className="font-medium text-text-primary">SEO y Metadatos</span>
                  {(formData.metaTitle || formData.metaDescription) && (
                    <Badge size="sm" variant="positive">Configurado</Badge>
                  )}
                </div>
                {showSeo ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>
              {showSeo && (
                <CardContent className="p-4 pt-0 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Meta Título
                    </label>
                    <Input
                      value={formData.metaTitle}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
                      }
                      placeholder="Título para buscadores (si se omite, usa el título del artículo)"
                      maxLength={70}
                    />
                    <p className="text-xs text-text-muted mt-1 text-right">
                      {formData.metaTitle.length}/70
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Meta Descripción
                    </label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))
                      }
                      placeholder="Descripción para buscadores (si se omite, usa el resumen)"
                      rows={2}
                      maxLength={160}
                      className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none text-sm"
                    />
                    <p className="text-xs text-text-muted mt-1 text-right">
                      {formData.metaDescription.length}/160
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Palabras clave
                    </label>
                    <Input
                      value={formData.keywords}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, keywords: e.target.value }))
                      }
                      placeholder="finanzas, dólar, argentina (separadas por coma)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Imagen OG (Open Graph)
                    </label>
                    <Input
                      value={formData.ogImage}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, ogImage: e.target.value }))
                      }
                      placeholder="URL de imagen para redes sociales (si se omite, usa la portada)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      URL Canónica
                    </label>
                    <Input
                      value={formData.canonicalUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, canonicalUrl: e.target.value }))
                      }
                      placeholder="https://... (solo si el contenido existe en otra URL)"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader title="Estado" />
              <CardContent className="p-4 pt-0">
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, status: e.target.value }))
                  }
                  aria-label="Estado del artículo"
                  className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="PUBLISHED">Publicado</option>
                  <option value="SCHEDULED">Programado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>

                {formData.status === 'SCHEDULED' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fecha de Publicación
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.publishedAt}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          publishedAt: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader title="Categoría" />
              <CardContent className="p-4 pt-0">
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  aria-label="Categoría del artículo"
                  className="w-full px-3 py-2 rounded-lg border border-input-border bg-input-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card>
              <CardHeader
                title="Imagen de Portada"
                icon={<ImageIcon className="w-4 h-4 text-accent" />}
              />
              <CardContent className="p-4 pt-0 space-y-3">
                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  {isUploadingCover ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">
                    {isUploadingCover ? 'Subiendo...' : 'Subir imagen'}
                  </span>
                </button>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  aria-label="Subir imagen de portada"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                    e.target.value = '';
                  }}
                />

                {/* Or paste URL */}
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <div className="flex-1 h-px bg-border" />
                  o pegar URL
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Input
                  value={formData.coverImage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      coverImage: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="text-sm"
                />

                {/* Preview */}
                {formData.coverImage && (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-secondary group">
                    <img
                      src={formData.coverImage}
                      alt="Preview de portada"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, coverImage: '' }))
                      }
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Quitar imagen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader
                title="Tags"
                icon={<Tag className="w-4 h-4 text-accent" />}
              />
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        formData.tagIds.includes(tag.id)
                          ? 'bg-accent text-white'
                          : 'bg-surface-secondary text-text-secondary hover:bg-accent/10'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  ))}
                  {tags.length === 0 && (
                    <p className="text-text-muted text-sm">
                      No hay tags disponibles
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delete (only for existing articles and ADMIN) */}
            {!isNew && user.role === 'ADMIN' && (
              <Card className="border-red-200">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-red-600 mb-2">Zona de peligro</h3>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar artículo
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-red-600">
                        ¿Estás seguro? Esta acción no se puede deshacer.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
