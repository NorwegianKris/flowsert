import { useState, useEffect, useRef } from 'react';

export interface GeoStructuredResult {
  label: string;
  city: string;
  country: string;
}

interface GeoResult {
  label: string;
  city: string;
  country: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

function formatResult(props: PhotonFeature['properties']): GeoStructuredResult | null {
  const city = props.city || props.name || props.county || props.state || '';
  const country = props.country || '';
  if (!city) return null;
  const label = country ? `${city}, ${country}` : city;
  return { label, city, country };
}

// Module-level cache for geo results (persists across re-renders)
const geoCache = new Map<string, GeoStructuredResult[]>();
const MAX_CACHE_SIZE = 50;

function cacheSet(key: string, value: GeoStructuredResult[]) {
  if (geoCache.size >= MAX_CACHE_SIZE) {
    const firstKey = geoCache.keys().next().value;
    if (firstKey) geoCache.delete(firstKey);
  }
  geoCache.set(key, value);
}

export function useGeoSearch(query: string, enabled = true) {
  const [structuredResults, setStructuredResults] = useState<GeoStructuredResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Backward-compatible string[] results
  const results = structuredResults.map(r => r.label);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setStructuredResults([]);
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = trimmed.toLowerCase();
    if (geoCache.has(cacheKey)) {
      setStructuredResults(geoCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    // Prefix cache matching
    for (const [cachedKey, cachedResults] of geoCache) {
      if (cacheKey.startsWith(cachedKey) && cachedResults.length > 0) {
        const filtered = cachedResults.filter(r =>
          r.label.toLowerCase().includes(cacheKey)
        );
        if (filtered.length > 0) {
          setStructuredResults(filtered);
        } else {
          setStructuredResults(cachedResults);
        }
        break;
      }
    }

    setLoading(true);

    timeoutRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6&lang=en&lat=60.47&lon=8.47`;
        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) throw new Error('Photon API error');
        
        const data = await response.json();
        const features: PhotonFeature[] = data.features || [];

        const formatted = features
          .map(f => formatResult(f.properties))
          .filter((r): r is GeoStructuredResult => r !== null);

        // Deduplicate by label
        const seen = new Set<string>();
        const unique: GeoStructuredResult[] = [];
        for (const r of formatted) {
          if (!seen.has(r.label)) {
            seen.add(r.label);
            unique.push(r);
          }
          if (unique.length >= 5) break;
        }

        cacheSet(cacheKey, unique);
        setStructuredResults(unique);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Geo search error:', err);
          setStructuredResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 80);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, enabled]);

  return { results, structuredResults, loading };
}
