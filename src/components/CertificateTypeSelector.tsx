import { useState, useMemo } from "react";
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
import { Check, ChevronsUpDown, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCertificateTypes, CertificateType } from "@/hooks/useCertificateTypes";

interface CertificateTypeSelectorProps {
  value: string | null;
  onChange: (typeId: string | null, typeName?: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoMatched?: boolean;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => void;
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
}: CertificateTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: types = [], isLoading } = useCertificateTypes();

  const selectedType = useMemo(() => {
    return types.find((t) => t.id === value);
  }, [types, value]);

  // Group types by category
  const groupedTypes = useMemo(() => {
    const grouped: Record<string, CertificateType[]> = {
      Uncategorized: [],
    };

    types.forEach((type) => {
      const category = type.category_name || "Uncategorized";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(type);
    });

    // Sort categories alphabetically, but keep Uncategorized at the end
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
  }, [types]);

  // Check if search value matches any existing type
  const searchMatchesExisting = useMemo(() => {
    if (!searchValue.trim()) return true;
    const normalizedSearch = searchValue.toLowerCase().trim();
    return types.some((t) => t.name.toLowerCase().includes(normalizedSearch));
  }, [searchValue, types]);

  const handleSelect = (typeId: string) => {
    const type = types.find((t) => t.id === typeId);
    onChange(typeId, type?.name);
    setOpen(false);
    setSearchValue("");
  };

  const handleClear = () => {
    onChange(null);
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
                    Auto-matched
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
                    <div className="flex flex-col">
                      <span>{type.name}</span>
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

            {/* Create new option at the bottom if allowed */}
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
      </PopoverContent>
    </Popover>
  );
}
