'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { HeroBanner, MiniBannerRow, AfipBadge } from '@/components/ads';
import { GlobalTicker } from '@/components/layout/global-ticker';
import { WeatherDateTime } from '@/components/layout/weather-datetime';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize dark mode - DEFAULT to dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      const isDark = savedMode === 'true';
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      // Default to dark mode
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('darkMode', String(newMode));
  };

  return (
    <header className="bg-surface-elevated dark:bg-black border-b border-border dark:border-slate-800">
      {/* Top Banner - Hero Position - Solo en desktop */}
      <div className="hidden lg:block border-b border-border-muted dark:border-slate-800">
        <HeroBanner />
      </div>
      
      <div className="max-w-7xl mx-auto px-4">
        {/* Main Header Row — Logo prominente + utilidades */}
        <div className="flex items-center justify-between py-1.5 md:py-2">
          {/* Left: Dark mode toggle (mobile) / Weather (desktop) */}
          <div className="flex items-center gap-2 w-32 md:w-48">
            <div className="hidden lg:block">
              <WeatherDateTime />
            </div>
            <Button variant="ghost" size="sm" onClick={toggleDarkMode} className="lg:hidden text-text-secondary dark:text-slate-400">
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>

          {/* Center: Logo — protagonista */}
          <Link href="/" className="flex flex-col items-center group">
            <div className="relative h-14 w-60 md:h-16 md:w-96 lg:h-20 lg:w-[440px]">
              <Image
                src="/banners/Rosario%20Finanzas%20Logo.png"
                alt="Rosario Finanzas"
                fill
                className="object-contain dark:brightness-110"
                priority
              />
            </div>
          </Link>

          {/* Right: Dark mode toggle (desktop) */}
          <div className="flex items-center justify-end gap-2 w-32 md:w-48">
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
              <div className="relative h-12 w-52 dark:brightness-110">
                <Image
                  src="/banners/Rosario%20Finanzas%20Logo.png"
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
      </div>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

