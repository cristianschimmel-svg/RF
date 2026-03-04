'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getFallbackImage } from '@/lib/image-fallbacks';
import { getProxyImageUrl } from '@/lib/utils';

interface ArticleHeroImageProps {
  initialUrl?: string | null;
  title: string;
  category: string;
  isExternal?: boolean;
}

export function ArticleHeroImage({ initialUrl, title, category, isExternal }: ArticleHeroImageProps) {
  const defaultFallback = getFallbackImage(category, title);
  const startUrl = getProxyImageUrl(initialUrl) || defaultFallback;
  
  const [imgSrc, setImgSrc] = useState(startUrl);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
      <Image
        src={imgSrc}
        alt={title}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 1024px) 100vw, 66vw"
        unoptimized={imgError}
        onError={() => {
          if (!imgError) {
            setImgError(true);
            setImgSrc(defaultFallback);
          }
        }}
      />
      {isExternal && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-xs text-white/80">
            Imagen ilustrativa
          </p>
        </div>
      )}
    </div>
  );
}
