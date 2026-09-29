// ============================================================================
// RealOnes BI - Query Cache
// ============================================================================

import { normalizeQuestion } from '@/lib/utils';

interface CacheEntry {
  result: unknown;
  timestamp: number;
  metricVersion: number;
}

// In-memory cache for demo; use Redis in production
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '300') * 1000;

export function buildCacheKey(
  question: string,
  roles: string[],
  regionIds: string[],
  metricVersion: number = 1
): string {
  const normalized = normalizeQuestion(question);
  const roleKey = roles.sort().join(',');
  const regionKey = regionIds.sort().join(',');
  return `${normalized}|${roleKey}|${regionKey}|v${metricVersion}`;
}

export function getCached(key: string): unknown | null {
  if (process.env.CACHE_ENABLED !== 'true') return null;

  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

export function setCache(key: string, result: unknown, metricVersion: number = 1): void {
  if (process.env.CACHE_ENABLED !== 'true') return;

  cache.set(key, {
    result,
    timestamp: Date.now(),
    metricVersion,
  });

  // Evict old entries if cache is too large
  if (cache.size > 1000) {
    const oldest = [...cache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 100);
    for (const [k] of oldest) {
      cache.delete(k);
    }
  }
}

export function invalidateCache(): void {
  cache.clear();
}

export function getCacheStats(): { size: number; hitRate: string } {
  return {
    size: cache.size,
    hitRate: 'N/A (in-memory)',
  };
}
