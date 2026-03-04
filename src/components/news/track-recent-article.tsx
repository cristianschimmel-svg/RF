'use client';

import { useEffect } from 'react';
import { addRecentArticle } from '@/lib/cookies';

export function TrackRecentArticle({
  slug,
  title,
  imageUrl
}: {
  slug: string;
  title: string;
  imageUrl?: string | null;
}) {
  useEffect(() => {
    addRecentArticle({ slug, title, imageUrl });
  }, [slug, title, imageUrl]);

  return null;
}
