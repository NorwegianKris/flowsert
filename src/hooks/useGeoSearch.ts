import { useState, useEffect, useRef } from 'react';

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

function formatResult(props: PhotonFeature['properties']): string {
  const city = props.city || props.name || props.county || props.state || '';
  const country = props.country || '';
  if (!city) return '';
  if (!country) return city;
  return `${city}, ${country}`;
}

export function useGeoSearch(query: string, enabled = true) {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Debounce 150ms
    timeoutRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Bias toward Norway/Europe
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6&lang=en&lat=60.47&lon=8.47`;
        const response = await fetch(url, { signal: controller.signal });
        
        if (!response.ok) throw new Error('Photon API error');
        
        const data = await response.json();
        const features: PhotonFeature[] = data.features || [];

        // Format and deduplicate
        const formatted = features
          .map(f => formatResult(f.properties))
          .filter(Boolean);

        const unique = [...new Set(formatted)].slice(0, 5);
        setResults(unique);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Geo search error:', err);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, enabled]);

  return { results, loading };
}
