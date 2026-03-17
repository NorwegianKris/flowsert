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
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIssuerTypes, IssuerType } from "@/hooks/useIssuerTypes";

interface IssuerTypeSelectorProps {
  value: string | null;
  onChange: (typeId: string | null, typeName?: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoMatched?: boolean;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => void;
  allowFreeText?: boolean;
  freeTextValue?: string;
  onFreeTextChange?: (text: string) => void;
}

export function IssuerTypeSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  autoMatched = false,
  placeholder = "Select issuer...",
  className,
  allowCreate = false,
  onCreateNew,
  allowFreeText = false,
  freeTextValue = "",
  onFreeTextChange,
}: IssuerTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: types = [], isLoading } = useIssuerTypes();

  const selectedType = useMemo(() => {
    return types.find((t) => t.id === value);
  }, [types, value]);

  // Check if search value matches any existing type
  const searchMatchesExisting = useMemo(() => {
    if (!searchValue.trim()) return true;
    const normalizedSearch = searchValue.toLowerCase().trim();
    return types.some((t) => t.name.toLowerCase().includes(normalizedSearch));
  }, [searchValue, types]);

  const handleSelect = (typeId: string) => {
    const type = types.find((t) => t.id === typeId);
    onChange(typeId, type?.name);
    if (onFreeTextChange) {
      onFreeTextChange('');
    }
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

  const renderDropdown = () => (
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
                  <Badge variant="secondary" className="ml-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {allowFreeText ? "Auto" : "Auto-matched"}
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
            placeholder="Search issuers..."
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
                <span className="text-muted-foreground">No issuers found.</span>
              )}
            </CommandEmpty>

            {!required && selectedType && (
              <CommandGroup>
                <CommandItem onSelect={handleClear} className="text-muted-foreground">
                  Clear selection
                </CommandItem>
              </CommandGroup>
            )}

            <CommandGroup heading="Issuers">
              {types.map((type) => (
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

  if (allowFreeText) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
          <div className="flex-1">
            {renderDropdown()}
          </div>
          <div className="flex items-center justify-center sm:pt-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap px-1">or type if not found</span>
          </div>
          <div className="flex-1">
            <Input
              value={freeTextValue}
              onChange={(e) => onFreeTextChange?.(e.target.value)}
              placeholder="Enter custom issuer..."
              disabled={disabled || !!selectedType}
              className={cn(className, selectedType && "opacity-50")}
            />
          </div>
        </div>
      </div>
    );
  }

  return renderDropdown();
}
