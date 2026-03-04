/**
 * Utility to manage user preferences via cookies
 * Works both on the client and server (via next/headers)
 */

export const PREF_KEYS = {
  THEME: 'rf_theme',
  RECENT_ARTICLES: 'rf_recent_articles',
  SECTION_PREF: 'rf_section_pref',
};

// Client-side cookie setter
export function setClientCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // SameSite=Lax is good for reading right after navigation
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Client-side cookie getter
export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

// Easy helpers for specific prefs
export function setThemePref(theme: 'dark' | 'light') {
  setClientCookie(PREF_KEYS.THEME, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function getThemePref(): 'dark' | 'light' | null {
  const t = getClientCookie(PREF_KEYS.THEME);
  if (t === 'dark' || t === 'light') return t;
  return null;
}

// Saving recently visited articles (for quick rendering)
export interface RecentArticlePref {
  slug: string;
  title: string;
  imageUrl?: string | null;
}

export function addRecentArticle(article: RecentArticlePref) {
  try {
    const existingStr = getClientCookie(PREF_KEYS.RECENT_ARTICLES);
    let recent: RecentArticlePref[] = [];
    if (existingStr) {
      recent = JSON.parse(existingStr);
    }
    
    // Remove if already exists
    recent = recent.filter(a => a.slug !== article.slug);
    
    // Add to front
    recent.unshift(article);
    
    // Keep max 10
    recent = recent.slice(0, 10);
    
    setClientCookie(PREF_KEYS.RECENT_ARTICLES, JSON.stringify(recent), 30); // 30 days
  } catch (e) {
    console.error('Failed to save recent article pref', e);
  }
}

export function getRecentArticles(): RecentArticlePref[] {
  try {
    const existingStr = getClientCookie(PREF_KEYS.RECENT_ARTICLES);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    return [];
  }
}
