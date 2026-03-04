'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MiniBannerRow, AfipBadge } from '@/components/ads';
import { GlobalTicker } from '@/components/layout/global-ticker';
import { WeatherDateTime } from '@/components/layout/weather-datetime';
import { Moon, Sun, Newspaper, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getThemePref, setThemePref } from '@/lib/cookies';

export function Header() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize dark mode from cookies
  useEffect(() => {
    const savedMode = getThemePref();
    if (savedMode !== null) {
      const isDark = savedMode === 'dark';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      // Default to dark mode
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      setThemePref('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    setThemePref(newMode ? 'dark' : 'light');
  };

  return (
    <header className="bg-surface-elevated dark:bg-black border-b border-border dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Header Row — Logo prominente + utilidades */}
        <div className="flex items-center justify-between py-2">
          {/* Left: Dark mode toggle (mobile) / Weather (desktop) */}
          <div className="flex items-center gap-2 w-16 md:w-36">
            <div className="hidden lg:block">
              <WeatherDateTime />
            </div>
            <Button variant="ghost" size="sm" onClick={toggleDarkMode} className="lg:hidden text-text-secondary dark:text-slate-400">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>

          {/* Center: Logo — protagonista */}
          <Link href="/" className="flex flex-col items-center group">
            <div className="relative h-10 w-56 md:h-12 md:w-72 lg:h-14 lg:w-[380px]">
              <Image
                src="/banners/Rosario%20Finanzas%20Logo_nuevo.png"
                alt="Rosario Finanzas"
                fill
                className="object-contain dark:mix-blend-screen"
                priority
              />
            </div>
          </Link>

          {/* Right: Dark mode toggle (desktop) */}
          <div className="flex items-center justify-end gap-2 w-16 md:w-36">
            <Button variant="ghost" size="sm" onClick={toggleDarkMode} className="hidden lg:flex text-text-secondary dark:text-slate-400">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    indicadores: [
      { name: 'Dólar', href: '/indicadores/dolar' },
      { name: 'Inflación', href: '/indicadores/inflacion' },
      { name: 'Tasas', href: '/indicadores/tasas' },
        { name: 'Acciones', href: '/indicadores/mercados' },
      { name: 'Agro', href: '/indicadores/agro' },
      { name: 'Cripto', href: '/indicadores/cripto' },
    ],
    recursos: [
      { name: 'Noticias', href: '/noticias' },
      { name: 'Informes', href: '/informes-especiales' },
      { name: 'Mercados', href: '/herramientas' },
    ],
    legal: [
      { name: 'Términos de uso', href: '/terminos' },
      { name: 'Privacidad', href: '/privacidad' },
      { name: 'Disclaimer', href: '/disclaimer' },
    ],
  };

  return (
    <footer className="bg-bg-secondary dark:bg-black border-t border-border dark:border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="block mb-4">
              <div className="relative h-14 w-72 dark:brightness-110">
                <Image
                  src="/banners/Rosario%20Finanzas%20Logo_nuevo.png"
                  alt="Rosario Finanzas"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-xs tracking-widest uppercase text-text-muted dark:text-slate-500 mb-2">
              Economía &amp; Finanzas — Rosario y Región
            </p>
            <p className="text-sm text-text-muted dark:text-slate-400 max-w-xs">
              Indicadores económicos y noticias financieras. Datos actualizados en tiempo real.
            </p>
          </div>

          {/* Indicadores */}
          <div>
            <h3 className="font-semibold text-text-primary dark:text-white mb-3">Indicadores</h3>
            <ul className="space-y-2">
              {footerLinks.indicadores.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <h3 className="font-semibold text-text-primary mb-3">Recursos</h3>
            <ul className="space-y-2">
              {footerLinks.recursos.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-text-primary dark:text-white mb-3">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-muted hover:text-text-primary dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sponsors Banner Row */}
        <div className="mt-8 pt-6 border-t border-border-muted dark:border-slate-800">
          <p className="text-xs text-text-muted dark:text-slate-500 text-center mb-4">Nuestros Sponsors</p>
          <MiniBannerRow />
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-6 border-t border-border-muted dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <AfipBadge />
            <p className="text-xs text-text-muted dark:text-slate-500">
              © {currentYear} Rosario Finanzas. Todos los derechos reservados.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted dark:text-slate-500">
              Datos provistos por fuentes oficiales (BCRA, INDEC) y alternativas.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main layout wrapper
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary dark:bg-black">
      {/* Header + Ticker en bloque sticky */}
      <div className="sticky top-0 z-50">
        <Header />
        {/* Ticker Global */}
        <div className="bg-slate-900 border-b border-slate-700">
          <GlobalTicker />
        </div>
        {/* Acortacaminos Rápidos */}
        <div className="bg-surface border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex gap-4 text-xs font-semibold uppercase tracking-wider">
            <Link href="/noticias" className="text-text-secondary hover:text-accent dark:hover:text-amber-400 flex items-center gap-1.5 transition-colors">
              <Newspaper className="w-3.5 h-3.5" /> Noticias
            </Link>
            <div className="w-[1px] h-4 bg-border"></div>
            <Link href="/indicadores" className="text-text-secondary hover:text-accent dark:hover:text-amber-400 flex items-center gap-1.5 transition-colors">
              <Activity className="w-3.5 h-3.5" /> Indicadores
            </Link>
          </div>
        </div>
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

