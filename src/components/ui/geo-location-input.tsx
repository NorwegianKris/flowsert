import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGeoSearch } from '@/hooks/useGeoSearch';
import { Check, Loader2, MapPin } from 'lucide-react';

interface GeoLocationInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  existingLocations?: string[];
  onBlur?: () => void;
}

export function GeoLocationInput({
  value,
  onChange,
  existingLocations = [],
  onBlur,
  className,
  placeholder = 'Search for a city...',
  ...props
}: GeoLocationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { results: geoResults, loading: geoLoading } = useGeoSearch(value, isOpen);

  // Merge: geo results first, then matching existing DB locations
  const suggestions = React.useMemo(() => {
    const merged: { label: string; source: 'geo' | 'db' }[] = [];
    const seen = new Set<string>();

    // Add geo results first
    for (const r of geoResults) {
      const key = r.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ label: r, source: 'geo' });
      }
    }

    // Add matching existing locations
    if (value.trim().length > 0) {
      const query = value.toLowerCase().trim();
      for (const loc of existingLocations) {
        const key = loc.toLowerCase();
        if (!seen.has(key) && (key.includes(query) || key.startsWith(query))) {
          seen.add(key);
          merged.push({ label: loc, source: 'db' });
        }
      }
    }

    return merged.slice(0, 8);
  }, [geoResults, existingLocations, value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (label: string) => {
    onChange(label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') { setIsOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex].label);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          className={cn('pr-8', className)}
          placeholder={placeholder}
          autoComplete="off"
          {...props}
        />
        {geoLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md"
        >
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((s, index) => {
              const isExact = s.label.toLowerCase() === value.toLowerCase().trim();
              return (
                <li
                  key={`${s.source}-${s.label}`}
                  onClick={() => handleSelect(s.label)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                    highlightedIndex === index && 'bg-accent',
                    isExact && 'font-medium'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{s.label}</span>
                  </div>
                  {isExact && <Check className="h-4 w-4 text-primary" />}
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-1.5 border-t text-[10px] text-muted-foreground">
            Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
