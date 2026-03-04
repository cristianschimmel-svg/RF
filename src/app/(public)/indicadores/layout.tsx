import { MainLayout } from '@/components/layout';
import Link from 'next/link';
import {
  DollarSign,
  Percent,
  Activity,
  BarChart3,
  Wheat,
  Bitcoin,
  LayoutDashboard,
} from 'lucide-react';

const indicadorLinks = [
  { href: '/indicadores', label: 'General', icon: LayoutDashboard },
  { href: '/indicadores/dolar', label: 'Dólar', icon: DollarSign },
  { href: '/indicadores/inflacion', label: 'Inflación, Riesgo & Tasas', icon: Percent },
  { href: '/indicadores/mercados', label: 'Acciones', icon: BarChart3 },
  { href: '/indicadores/agro', label: 'Agro', icon: Wheat },
  { href: '/indicadores/cripto', label: 'Cripto', icon: Bitcoin },
];

export default function IndicadoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Navigation Tabs */}
        <nav className="mb-4 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max border-b border-border dark:border-slate-800 pb-2">
            {indicadorLinks.map((link) => (
              <NavTab
                key={link.href}
                href={link.href}
                icon={<link.icon className="w-3.5 h-3.5" />}
                label={link.label}
                isDefault={link.href === '/indicadores/dolar'}
              />
            ))}
          </div>
        </nav>

        {children}
      </div>
    </MainLayout>
  );
}

function NavTab({
  href,
  icon,
  label,
  isDefault,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isDefault?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:bg-interactive-hover dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
    >
      {icon}
      {label}
    </Link>
  );
}
