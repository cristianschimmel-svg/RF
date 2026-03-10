'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BannerAdProps {
  src: string;
  alt: string;
  href: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

// Individual Banner Component
export function BannerAd({
  src,
  alt,
  href,
  width,
  height,
  className,
  priority = false,
}: BannerAdProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block overflow-hidden rounded-lg transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02]',
        'opacity-90 hover:opacity-100',
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto"
        priority={priority}
        unoptimized // For GIF animations
      />
    </Link>
  );
}

// Hero Banner - Full width top banner (Magic Brain - cropped visually)
export function HeroBanner({ className }: { className?: string }) {
  return (
    <div className={cn(
      'w-full flex justify-center py-1',
      'bg-surface-primary dark:bg-surface-primary',
      'border-b border-border-muted',
      className
    )}>
      <BannerAd
        src="/banners/Magic%20Brain.gif"
        alt="Magic Brain - Entrenamiento Mental"
        href="https://magicbrain.com.ar"
        width={1000}
        height={150}
        className="shadow-md max-h-[60px]"
        priority
      />
    </div>
  );
}

// Leaderboard Banner - Secondary full width (775x85)
export function LeaderboardBanner({ className }: { className?: string }) {
  return (
    <div className={cn('w-full flex justify-center py-3', className)}>
      <BannerAd
        src="/banners/8140121.gif"
        alt="TSA Bursátil"
        href="https://tsabursatil.com"
        width={775}
        height={85}
      />
    </div>
  );
}

// Sidebar Banner Stack - Vertical arrangement for sidebar
export function SidebarBanners({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Magic Brain - Square */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent-dark/20 rounded-xl blur-sm" />
        <BannerAd
          src="/banners/Magic%20Brain.gif"
          alt="Magic Brain - Entrenamiento Mental"
          href="https://magicbrain.com.ar"
          width={300}
          height={300}
          className="relative shadow-lg"
        />
      </div>
      
      {/* Balanz */}
      <BannerAd
        src="/banners/BALANZ-1.gif"
        alt="Balanz - Broker"
        href="https://www.balanz.com/"
        width={340}
        height={90}
        className="shadow-md"
      />
    </div>
  );
}

// Inline Banner - For content breaks
export function InlineBanner({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const banner = variant === 'primary' 
    ? { src: '/banners/9903337.gif', width: 775, height: 85 }
    : { src: '/banners/8140121.gif', width: 775, height: 85 };
    
  return (
    <div className="w-full flex justify-center py-4 my-4 border-y border-border-muted bg-gradient-to-r from-transparent via-surface-elevated/50 to-transparent">
      <BannerAd
        src={banner.src}
        alt="TSA Bursátil"
        href="https://tsabursatil.com"
        width={banner.width}
        height={banner.height}
      />
    </div>
  );
}

// Mini Banner Row - For footer or compact areas
export function MiniBannerRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 py-4', className)}>
      <BannerAd
        src="/banners/BALANZ-1.gif"
        alt="Balanz"
        href="https://www.balanz.com/"
        width={170}
        height={45}
        className="opacity-80 hover:opacity-100"
      />
    </div>
  );
}

// AFIP Badge
export function AfipBadge({ className }: { className?: string }) {
  return (
    <Link
      href="http://qr.afip.gob.ar/?qr=6FE7Hy3T53JxxfUdK-VMQQ,,"
      target="_blank"
      rel="noopener noreferrer"
      className={cn('inline-block', className)}
    >
      <Image
        src="/banners/AFIP-DATAWEB.jpg"
        alt="AFIP Data Fiscal"
        width={60}
        height={82}
        className="hover:shadow-md transition-shadow"
      />
    </Link>
  );
}
