'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  LayoutDashboard,
  FileText,
  FolderTree,
  Tags,
  Settings,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  ExternalLink,
  Newspaper,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    avatar?: string | null;
  };
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Artículos',
    href: '/admin/articulos',
    icon: FileText,
  },
  {
    name: 'Categorías',
    href: '/admin/categorias',
    icon: FolderTree,
  },
  {
    name: 'Tags',
    href: '/admin/tags',
    icon: Tags,
  },
  {
    name: 'Indicadores',
    href: '/admin/indicadores',
    icon: BarChart3,
  },
  {
    name: 'Noticias Externas',
    href: '/admin/noticias-externas',
    icon: Newspaper,
  },
];

const adminNavigation = [
  {
    name: 'Usuarios',
    href: '/admin/usuarios',
    icon: Users,
  },
  {
    name: 'Configuración',
    href: '/admin/configuracion',
    icon: Settings,
  },
];

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-border transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-text-primary">
              RF<span className="text-accent">Admin</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 mb-2">
            Contenido
          </p>
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider px-3 mb-2">
                  Administración
                </p>
              </div>
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* View Site Link */}
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver sitio
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb (placeholder) */}
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-text-primary">
              {getPageTitle(pathname)}
            </h2>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-secondary transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-text-primary">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-text-muted">{user.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-border py-1 z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    href="/admin/perfil"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/admin/login' })}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-down hover:bg-down-subtle transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/articulos': 'Artículos',
    '/admin/articulos/nuevo': 'Nuevo Artículo',
    '/admin/categorias': 'Categorías',
    '/admin/tags': 'Tags',
    '/admin/indicadores': 'Indicadores',
    '/admin/usuarios': 'Usuarios',
    '/admin/configuracion': 'Configuración',
    '/admin/perfil': 'Mi Perfil',
  };

  // Check for dynamic routes
  if (pathname.match(/^\/admin\/articulos\/[^/]+$/)) {
    return 'Editar Artículo';
  }

  return titles[pathname] || 'Admin';
}
