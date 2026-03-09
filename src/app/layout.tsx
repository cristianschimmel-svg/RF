import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'Rosario Finanzas - Indicadores Económicos en Tiempo Real',
    template: '%s | Rosario Finanzas',
  },
  description:
    'Portal de finanzas para Rosario y zona. Cotizaciones del dólar, inflación, tasas, mercados, commodities y noticias económicas actualizadas.',
  keywords: [
    'dólar',
    'cotización',
    'inflación',
    'tasas',
    'Rosario',
    'Argentina',
    'finanzas',
    'economía',
    'Merval',
    'riesgo país',
  ],
  authors: [{ name: 'Rosario Finanzas' }],
  creator: 'Rosario Finanzas',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: 'https://rosariofinanzas.ar',
    siteName: 'Rosario Finanzas',
    title: 'Rosario Finanzas - Indicadores Económicos en Tiempo Real',
    description:
      'Portal de finanzas para Rosario y zona. Cotizaciones, indicadores y noticias económicas.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rosario Finanzas',
    description: 'Indicadores económicos en tiempo real para Rosario y zona.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

import { cookies } from 'next/headers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const themeCookie = cookieStore.get('rf_theme');
  // Default to dark mode if no cookie is present, as per previous logic
  const isDark = themeCookie ? themeCookie.value === 'dark' : true;

  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${isDark ? 'dark' : ''}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg-primary font-sans antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
