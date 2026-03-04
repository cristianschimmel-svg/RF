/**
 * Category-based fallback images for news cards
 * Used when source images fail to load (403, hotlink protection, etc.)
 * 
 * Can be imported from both client and server components.
 * Uses a title hash for deterministic but diverse selection.
 */

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  'Economía': [
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1543286386-713bdd548da4?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
  ],
  'Agro': [
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1592982537447-6f2a6a0c7c18?w=600&h=400&fit=crop',
  ],
  'Mercados': [
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1559526324-593bc073d938?w=600&h=400&fit=crop',
  ],
  'Finanzas': [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&h=400&fit=crop',
  ],
  'Cripto': [
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1644361566696-3d442b5b482a?w=600&h=400&fit=crop',
  ],
  'default': [
    'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop',
  ],
};

/**
 * Simple string hash for deterministic selection.
 * Different titles → different hash → different fallback image.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a category-appropriate fallback image based on the article title.
 * Ensures diverse images even when multiple articles in the same category
 * have broken source images.
 */
export function getFallbackImage(category: string, title: string): string {
  const images = CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS['default'];
  return images[hashString(title) % images.length];
}
