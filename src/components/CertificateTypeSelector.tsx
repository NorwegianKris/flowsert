import { useState, useMemo, useEffect, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Sparkles, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCertificateTypes, CertificateType } from "@/hooks/useCertificateTypes";
import { stringSimilarity } from "@/lib/stringUtils";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCertificateTitle } from "@/lib/certificateNormalization";

interface OcrHint {
  extractedName: string;
  confidence: number;
}

interface CertificateTypeSelectorProps {
  value: string | null;
  onChange: (typeId: string | null, typeName?: string, categoryId?: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  autoMatched?: boolean;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => void;
  /** Filter types to a specific category_id */
  categoryFilter?: string | null;
  /** Allow free text input alongside dropdown selection (legacy side-by-side layout) */
  allowFreeText?: boolean;
  /** Current free text value when not using dropdown */
  freeTextValue?: string;
  /** Handler for free text changes */
  onFreeTextChange?: (text: string) => void;
  /** OCR hint for auto-matching */
  ocrHint?: OcrHint | null;
  /** Show fallback free text input with "Can't find your type?" toggle */
  showFallbackInput?: boolean;
  /** Business ID for alias lookup */
  businessId?: string;
}

export function CertificateTypeSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  autoMatched = false,
  placeholder = "Select certificate type...",
  className,
  allowCreate = false,
  onCreateNew,
  categoryFilter,
  allowFreeText = false,
  freeTextValue = "",
  onFreeTextChange,
  ocrHint,
  showFallbackInput = false,
  businessId,
}: CertificateTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFreeTextInput, setShowFreeTextInput] = useState(false);
  const [ocrAutoSelected, setOcrAutoSelected] = useState(false);
  const [lowConfidenceHint, setLowConfidenceHint] = useState<string | null>(null);
  const [freeTextFromOcr, setFreeTextFromOcr] = useState(false);
  const ocrAutoApplied = useRef(false);
  const { data: types = [], isLoading } = useCertificateTypes();

  // Reset toggle when categoryFilter changes
  useEffect(() => {
    setShowAllCategories(false);
  }, [categoryFilter]);

  const selectedType = useMemo(() => {
    return types.find((t) => t.id === value);
  }, [types, value]);

  // Filter types by category if needed
  const filteredTypes = useMemo(() => {
    if (categoryFilter && !showAllCategories) {
      return types.filter((t) => t.category_id === categoryFilter);
    }
    return types;
  }, [types, categoryFilter, showAllCategories]);

  // OCR auto-match logic — alias lookup first, fuzzy fallback
  useEffect(() => {
    if (!ocrHint || !ocrHint.extractedName || ocrAutoApplied.current || types.length === 0) return;
    if (value) return; // Already has a value selected

    const confidence = ocrHint.confidence;

    if (confidence < 60) {
      // Low confidence - show hint text only
      setLowConfidenceHint(ocrHint.extractedName);
      ocrAutoApplied.current = true;
      return;
    }

    // Attempt alias lookup, then fuzzy fallback
    const doLookup = async () => {
      ocrAutoApplied.current = true;

      // Step 1: Alias lookup (requires businessId)
      if (businessId) {
        const normalized = normalizeCertificateTitle(ocrHint.extractedName);
        if (normalized) {
          const { data } = await supabase
            .from('certificate_aliases')
            .select('certificate_type_id')
            .eq('business_id', businessId)
            .eq('alias_normalized', normalized)
            .maybeSingle();

          if (data?.certificate_type_id) {
            const matchedType = types.find(t => t.id === data.certificate_type_id);
            if (matchedType) {
              onChange(matchedType.id, matchedType.name, matchedType.category_id || null);
              setOcrAutoSelected(true);
              return;
            }
          }
        }
      }

      // Step 2: Fuzzy fallback
      const typesToScore = filteredTypes.length > 0 ? filteredTypes : types;
      const scores = typesToScore
        .map((t) => ({
          id: t.id,
          name: t.name,
          score: stringSimilarity(ocrHint.extractedName, t.name),
        }))
        .sort((a, b) => b.score - a.score);

      const best = scores[0];
      const second = scores[1];

      if (confidence >= 85 && best && best.score > 0.7) {
        const isClearWinner = !second || (best.score - second.score >= 0.15);
        if (isClearWinner) {
          const bestType = types.find(t => t.id === best.id);
          onChange(best.id, best.name, bestType?.category_id || null);
          setOcrAutoSelected(true);
        } else if (showFallbackInput && onFreeTextChange) {
          // Ambiguous match — pre-fill free-text with AI-extracted name
          setShowFreeTextInput(true);
          onFreeTextChange(ocrHint.extractedName);
          setFreeTextFromOcr(true);
        } else {
          setSearchValue(ocrHint.extractedName);
        }
      } else if (showFallbackInput && onFreeTextChange) {
        // No good fuzzy match — pre-fill free-text with AI-extracted name
        setShowFreeTextInput(true);
        onFreeTextChange(ocrHint.extractedName);
        setFreeTextFromOcr(true);
      } else {
        // Fallback: pre-fill search
        setSearchValue(ocrHint.extractedName);
      }
    };

    doLookup();
  }, [ocrHint, types, filteredTypes, value, onChange, businessId]);

  // Group types by category
  const groupedTypes = useMemo(() => {
    const grouped: Record<string, CertificateType[]> = {
      Uncategorized: [],
    };

    filteredTypes.forEach((type) => {
      const category = type.category_name || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(type);
    });

    const sortedKeys = Object.keys(grouped)
      .filter((k) => k !== "Uncategorized")
      .sort();

    if (grouped["Uncategorized"].length > 0) {
      sortedKeys.push("Uncategorized");
    }

    return sortedKeys.map((key) => ({
      category: key,
      types: grouped[key],
    }));
  }, [filteredTypes]);

  // Check if search value matches any existing type
  const searchMatchesExisting = useMemo(() => {
    if (!searchValue.trim()) return true;
    const normalizedSearch = searchValue.toLowerCase().trim();
    return types.some((t) => t.name.toLowerCase().includes(normalizedSearch));
  }, [searchValue, types]);

  const handleSelect = (typeId: string) => {
    const type = types.find((t) => t.id === typeId);
    onChange(typeId, type?.name, type?.category_id || null);
    setOcrAutoSelected(false);
    // Clear free text when selecting from dropdown
    if (onFreeTextChange) {
      onFreeTextChange('');
    }
    setShowFreeTextInput(false);
    setOpen(false);
    setSearchValue("");
  };

  const handleClear = () => {
    onChange(null);
    setOcrAutoSelected(false);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    if (onCreateNew && searchValue.trim()) {
      onCreateNew(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  // Shared dropdown content
  const renderDropdownContent = () => (
    <Command>
      <CommandInput
        placeholder="Search certificate types..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          {allowCreate && searchValue.trim() ? (
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create "{searchValue.trim()}"
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">No certificate types found.</span>
          )}
        </CommandEmpty>

        {!required && selectedType && (
          <CommandGroup>
            <CommandItem onSelect={handleClear} className="text-muted-foreground">
              Clear selection
            </CommandItem>
          </CommandGroup>
        )}

        {groupedTypes.map(({ category, types: categoryTypes }) => (
          <CommandGroup key={category} heading={category}>
            {categoryTypes.map((type) => (
              <CommandItem
                key={type.id}
                value={type.name}
                onSelect={() => handleSelect(type.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === type.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{type.name}</span>
                    {type.category_name && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {type.category_name}
                      </Badge>
                    )}
                  </div>
                  {type.description && (
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {categoryFilter && (
          <div
            className="flex items-center justify-center gap-1 px-2 py-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAllCategories((prev) => !prev)}
          >
            {showAllCategories ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show selected category only
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show all categories
              </>
            )}
          </div>
        )}

        {allowCreate && !searchMatchesExisting && searchValue.trim() && (
          <CommandGroup heading="Create new">
            <CommandItem onSelect={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create "{searchValue.trim()}"
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );

  // Trigger button content
  const renderTriggerContent = () => (
    <span className="flex items-center gap-2 truncate">
      {selectedType ? (
        <>
          {selectedType.name}
          {(autoMatched || ocrAutoSelected) && (
            <Badge variant="secondary" className={cn(
              "ml-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
            )}>
              <Sparkles className="h-3 w-3 mr-1" />
              {ocrAutoSelected ? "AI-suggested type" : "Auto-matched"}
            </Badge>
          )}
        </>
      ) : (
        placeholder
      )}
    </span>
  );

  // ---- showFallbackInput render path ----
  if (showFallbackInput) {
    return (
      <div className="space-y-2">
        {!showFreeTextInput ? (
          <>
            {/* Dropdown */}
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled || isLoading}
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedType && "text-muted-foreground",
                    (autoMatched || ocrAutoSelected) && selectedType && "border-primary/50 bg-primary/5",
                    className
                  )}
                >
                  {renderTriggerContent()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 z-[100]" align="start" sideOffset={4}>
                {renderDropdownContent()}
              </PopoverContent>
            </Popover>

            {/* Low confidence hint */}
            {lowConfidenceHint && !selectedType && (
              <p className="text-xs text-muted-foreground">
                AI extracted: <span className="font-medium text-foreground">{lowConfidenceHint}</span> — please select the correct type
              </p>
            )}

            {/* "Can't find" toggle */}
            {!selectedType && (
              <button
                type="button"
                className="text-xs text-primary hover:underline cursor-pointer"
                onClick={() => setShowFreeTextInput(true)}
              >
                Can't find your certificate type?
              </button>
            )}
          </>
        ) : (
          <>
            {/* Free text input */}
            {freeTextFromOcr && freeTextValue && (
              <Badge variant="secondary" className="flex items-center gap-1 w-fit bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                <Sparkles className="h-3 w-3" />
                Suggested
              </Badge>
            )}
            <Input
              value={freeTextValue}
              onChange={(e) => {
                onFreeTextChange?.(e.target.value);
                setFreeTextFromOcr(false);
              }}
              placeholder="Enter certificate name..."
              disabled={disabled}
              className={className}
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline cursor-pointer"
              onClick={() => {
                setShowFreeTextInput(false);
                // Don't clear free text here - user may want to go back
              }}
            >
              Back to dropdown
            </button>
          </>
        )}
      </div>
    );
  }

  // ---- allowFreeText render path (legacy side-by-side) ----
  if (allowFreeText) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
          <div className="flex-1">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  disabled={disabled || isLoading}
                  className={cn(
                    "w-full justify-between font-normal",
                    !selectedType && "text-muted-foreground",
                    autoMatched && selectedType && "border-primary/50 bg-primary/5",
                    className
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {selectedType ? (
                      <>
                        {selectedType.name}
                        {autoMatched && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                      </>
                    ) : (
                      placeholder
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 z-[100]" align="start" sideOffset={4}>
                {renderDropdownContent()}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-center sm:pt-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap px-1">or type if not found</span>
          </div>

          <div className="flex-1">
            <Input
              value={freeTextValue}
              onChange={(e) => onFreeTextChange?.(e.target.value)}
              placeholder="Enter custom type..."
              disabled={disabled || !!selectedType}
              className={cn(className, selectedType && "opacity-50")}
            />
          </div>
        </div>
      </div>
    );
  }

  // ---- Default dropdown-only render path ----
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !selectedType && "text-muted-foreground",
            (autoMatched || ocrAutoSelected) && selectedType && "border-primary/50 bg-primary/5",
            className
          )}
        >
          {renderTriggerContent()}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 z-[100]" align="start" sideOffset={4}>
        {renderDropdownContent()}
      </PopoverContent>
    </Popover>
  );
}
