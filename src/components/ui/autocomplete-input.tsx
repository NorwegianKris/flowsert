import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { findSimilarMatches, normalizeText, hasExactMatch, getBestMatch } from '@/lib/stringUtils';
import { Check, AlertCircle } from 'lucide-react';

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  normalizeOnBlur?: boolean;
  showSimilarityWarning?: boolean;
  similarityThreshold?: number;
}

export function AutocompleteInput({
  options,
  value,
  onChange,
  onBlur,
  normalizeOnBlur = true,
  showSimilarityWarning = true,
  similarityThreshold = 0.7,
  className,
  placeholder,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ value: string; similarity: number }[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [similarMatch, setSimilarMatch] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update suggestions when value changes
  useEffect(() => {
    if (value.trim().length > 0) {
      const matches = findSimilarMatches(value, options, 0.3);
      // Also include options that start with or contain the input
      const startsWithMatches = options
        .filter(opt => opt.toLowerCase().startsWith(value.toLowerCase().trim()))
        .filter(opt => !matches.some(m => m.value === opt))
        .map(opt => ({ value: opt, similarity: 0.5 }));
      
      const containsMatches = options
        .filter(opt => opt.toLowerCase().includes(value.toLowerCase().trim()))
        .filter(opt => !matches.some(m => m.value === opt) && !startsWithMatches.some(s => s.value === opt))
        .map(opt => ({ value: opt, similarity: 0.4 }));
      
      setSuggestions([...startsWithMatches, ...matches, ...containsMatches].slice(0, 8));
    } else {
      setSuggestions(options.slice(0, 8).map(opt => ({ value: opt, similarity: 0 })));
    }
  }, [value, options]);

  // Check for similar matches when input changes
  useEffect(() => {
    if (showSimilarityWarning && value.trim().length > 2) {
      const exactMatch = hasExactMatch(value, options);
      if (!exactMatch) {
        const bestMatch = getBestMatch(value, options, similarityThreshold);
        setSimilarMatch(bestMatch);
      } else {
        setSimilarMatch(null);
      }
    } else {
      setSimilarMatch(null);
    }
  }, [value, options, showSimilarityWarning, similarityThreshold]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSelectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSimilarMatch(null);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Normalize the value on blur if enabled
    if (normalizeOnBlur && value.trim()) {
      const normalized = normalizeText(value);
      if (normalized !== value) {
        onChange(normalized);
      }
    }
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelectOption(suggestions[highlightedIndex].value);
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

  const handleUseSuggestion = () => {
    if (similarMatch) {
      onChange(similarMatch);
      setSimilarMatch(null);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          similarMatch && 'border-amber-500 focus-visible:ring-amber-500',
          className
        )}
        placeholder={placeholder}
        autoComplete="off"
        {...props}
      />
      
      {/* Similarity warning */}
      {similarMatch && (
        <div className="mt-1 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-3 w-3" />
          <span>Did you mean "{similarMatch}"?</span>
          <button
            type="button"
            onClick={handleUseSuggestion}
            className="underline hover:no-underline font-medium"
          >
            Use this
          </button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md"
        >
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion, index) => {
              const isExactMatch = suggestion.value.toLowerCase() === value.toLowerCase().trim();
              return (
                <li
                  key={suggestion.value}
                  onClick={() => handleSelectOption(suggestion.value)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                    highlightedIndex === index && 'bg-accent',
                    isExactMatch && 'font-medium'
                  )}
                >
                  <span>{suggestion.value}</span>
                  {isExactMatch && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
