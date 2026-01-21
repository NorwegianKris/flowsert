import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';
import { cn } from '@/lib/utils';

interface PersonnelFiltersProps {
  roleFilters: string[];
  onRoleFiltersChange: (values: string[]) => void;
  locationFilters: string[];
  onLocationFiltersChange: (values: string[]) => void;
  categoryFilters: string[];
  onCategoryFiltersChange: (values: string[]) => void;
  locations: string[];
}

export function PersonnelFilters({
  roleFilters,
  onRoleFiltersChange,
  locationFilters,
  onLocationFiltersChange,
  categoryFilters,
  onCategoryFiltersChange,
  locations,
}: PersonnelFiltersProps) {
  const { categories: workerCategories } = useWorkerCategories();
  const [roleOpen, setRoleOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const hasActiveFilters = roleFilters.length > 0 || locationFilters.length > 0 || categoryFilters.length > 0;

  const clearAllFilters = () => {
    onRoleFiltersChange([]);
    onLocationFiltersChange([]);
    onCategoryFiltersChange([]);
  };

  const toggleFilter = (
    value: string,
    currentFilters: string[],
    setFilters: (values: string[]) => void
  ) => {
    if (currentFilters.includes(value)) {
      setFilters(currentFilters.filter((f) => f !== value));
    } else {
      setFilters([...currentFilters, value]);
    }
  };

  const employmentTypes = [
    { value: 'fixed_employee', label: 'Fixed Employee' },
    { value: 'freelancer', label: 'Freelancer' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by:</span>
      </div>

      {/* Job Role Filter */}
      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[160px]">
            <span className="truncate">
              {roleFilters.length === 0
                ? 'Job Role'
                : roleFilters.length === 1
                ? roleFilters[0]
                : `${roleFilters.length} roles`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2 bg-popover border shadow-md z-50" align="start">
          <div className="space-y-1">
            {workerCategories.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={roleFilters.includes(category.name)}
                  onCheckedChange={() =>
                    toggleFilter(category.name, roleFilters, onRoleFiltersChange)
                  }
                />
                <span className="text-sm">{category.name}</span>
              </label>
            ))}
            {workerCategories.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-1">No roles defined</p>
            )}
          </div>
          {roleFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => onRoleFiltersChange([])}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Location Filter */}
      <Popover open={locationOpen} onOpenChange={setLocationOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[180px]">
            <span className="truncate">
              {locationFilters.length === 0
                ? 'Location'
                : locationFilters.length === 1
                ? locationFilters[0]
                : `${locationFilters.length} locations`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2 bg-popover border shadow-md z-50 max-h-[300px] overflow-y-auto" align="start">
          <div className="space-y-1">
            {locations.map((location) => (
              <label
                key={location}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={locationFilters.includes(location)}
                  onCheckedChange={() =>
                    toggleFilter(location, locationFilters, onLocationFiltersChange)
                  }
                />
                <span className="text-sm">{location}</span>
              </label>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-1">No locations</p>
            )}
          </div>
          {locationFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => onLocationFiltersChange([])}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Employment Type Filter */}
      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[160px]">
            <span className="truncate">
              {categoryFilters.length === 0
                ? 'Employment'
                : categoryFilters.length === 1
                ? employmentTypes.find((t) => t.value === categoryFilters[0])?.label
                : `${categoryFilters.length} types`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-2 bg-popover border shadow-md z-50" align="start">
          <div className="space-y-1">
            {employmentTypes.map((type) => (
              <label
                key={type.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={categoryFilters.includes(type.value)}
                  onCheckedChange={() =>
                    toggleFilter(type.value, categoryFilters, onCategoryFiltersChange)
                  }
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
          {categoryFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => onCategoryFiltersChange([])}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear all
        </Button>
      )}

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 ml-2">
          {roleFilters.map((role) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => toggleFilter(role, roleFilters, onRoleFiltersChange)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {locationFilters.map((location) => (
            <Badge key={location} variant="secondary" className="text-xs">
              {location}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => toggleFilter(location, locationFilters, onLocationFiltersChange)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {categoryFilters.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs">
              {employmentTypes.find((t) => t.value === cat)?.label}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => toggleFilter(cat, categoryFilters, onCategoryFiltersChange)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
