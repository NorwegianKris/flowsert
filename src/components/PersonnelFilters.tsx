import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, X, CalendarIcon, Award, Building2, ArrowUpDown, FolderOpen, Tag } from 'lucide-react';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';
import { useDepartments } from '@/hooks/useDepartments';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type PersonnelSortOption = 'recent' | 'alphabetical';
export type CertificateFilterMode = 'types' | 'categories';

interface PersonnelFiltersProps {
  roleFilters: string[];
  onRoleFiltersChange: (values: string[]) => void;
  locationFilters: string[];
  onLocationFiltersChange: (values: string[]) => void;
  certificateFilters: string[];
  onCertificateFiltersChange: (values: string[]) => void;
  departmentFilters: string[];
  onDepartmentFiltersChange: (values: string[]) => void;
  locations: string[];
  certificates: string[];
  certificateCategories?: string[];
  availabilityDateRange: DateRange | undefined;
  onAvailabilityDateRangeChange: (range: DateRange | undefined) => void;
  sortOption: PersonnelSortOption;
  onSortOptionChange: (option: PersonnelSortOption) => void;
  certificateFilterMode?: CertificateFilterMode;
  onCertificateFilterModeChange?: (mode: CertificateFilterMode) => void;
  resultCount?: number;
}

export function PersonnelFilters({
  roleFilters,
  onRoleFiltersChange,
  locationFilters,
  onLocationFiltersChange,
  certificateFilters,
  onCertificateFiltersChange,
  departmentFilters,
  onDepartmentFiltersChange,
  locations,
  certificates,
  certificateCategories = [],
  availabilityDateRange,
  onAvailabilityDateRangeChange,
  sortOption,
  onSortOptionChange,
  certificateFilterMode = 'types',
  onCertificateFilterModeChange,
  resultCount,
}: PersonnelFiltersProps) {
  const { categories: workerCategories } = useWorkerCategories();
  const { departments } = useDepartments();
  const [roleOpen, setRoleOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Determine which list to show based on mode
  const certificateListItems = certificateFilterMode === 'categories' ? certificateCategories : certificates;

  const sortOptions = [
    { value: 'recent' as PersonnelSortOption, label: 'Most Recent' },
    { value: 'alphabetical' as PersonnelSortOption, label: 'Alphabetical' },
  ];

  const hasActiveFilters = 
    roleFilters.length > 0 || 
    locationFilters.length > 0 || 
    certificateFilters.length > 0 ||
    departmentFilters.length > 0 ||
    availabilityDateRange?.from !== undefined;

  const clearAllFilters = () => {
    onRoleFiltersChange([]);
    onLocationFiltersChange([]);
    onCertificateFiltersChange([]);
    onDepartmentFiltersChange([]);
    onAvailabilityDateRangeChange(undefined);
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


  const formatDateRange = () => {
    if (!availabilityDateRange?.from) return 'Availability';
    if (!availabilityDateRange.to) {
      return format(availabilityDateRange.from, 'MMM d, yyyy');
    }
    return `${format(availabilityDateRange.from, 'MMM d')} - ${format(availabilityDateRange.to, 'MMM d, yyyy')}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by:</span>
      </div>

      {/* Availability Date Range Filter */}
      <Popover open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[160px]">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{formatDateRange()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-popover border shadow-md z-50" align="start">
          <div className="p-3 border-b">
            <p className="text-sm font-medium">Select dates to find available workers</p>
            <p className="text-xs text-muted-foreground mt-1">
              Workers marked as unavailable on these dates will be hidden
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={availabilityDateRange?.from}
            selected={availabilityDateRange}
            onSelect={onAvailabilityDateRangeChange}
            numberOfMonths={2}
          />
          <div className="p-3 border-t flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAvailabilityDateRangeChange(undefined)}
              disabled={!availabilityDateRange?.from}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setAvailabilityOpen(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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

      {/* Certificate Filter */}
      <Popover open={certificateOpen} onOpenChange={setCertificateOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[160px]">
            <Award className="mr-2 h-4 w-4" />
            <span className="truncate">
              {certificateFilters.length === 0
                ? 'Certificates'
                : certificateFilters.length === 1
                ? certificateFilters[0]
                : `${certificateFilters.length} certs`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 bg-popover border shadow-md z-50" align="start">
          {/* Toggle between Categories and Types */}
          {onCertificateFilterModeChange && certificateCategories.length > 0 && (
            <div className="p-2 border-b">
              <ToggleGroup
                type="single"
                value={certificateFilterMode}
                onValueChange={(value) => {
                  if (value) {
                    // Clear filters when switching modes
                    onCertificateFiltersChange([]);
                    onCertificateFilterModeChange(value as CertificateFilterMode);
                  }
                }}
                className="w-full"
              >
                <ToggleGroupItem
                  value="types"
                  className="flex-1 gap-1.5 text-xs"
                  aria-label="Filter by types"
                >
                  <Tag className="h-3.5 w-3.5" />
                  Types
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="categories"
                  className="flex-1 gap-1.5 text-xs"
                  aria-label="Filter by categories"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Categories
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
          <div className="p-2 max-h-[250px] overflow-y-auto">
            <div className="space-y-1">
              {certificateListItems.map((cert) => (
                <label
                  key={cert}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={certificateFilters.includes(cert)}
                    onCheckedChange={() =>
                      toggleFilter(cert, certificateFilters, onCertificateFiltersChange)
                    }
                  />
                  <span className="text-sm truncate">{cert}</span>
                </label>
              ))}
              {certificateListItems.length === 0 && (
                <p className="text-sm text-muted-foreground px-2 py-1">
                  No {certificateFilterMode === 'categories' ? 'categories' : 'certificates'}
                </p>
              )}
            </div>
          </div>
          {certificateFilters.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onCertificateFiltersChange([])}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Department Filter */}
      <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[160px]">
            <Building2 className="mr-2 h-4 w-4" />
            <span className="truncate">
              {departmentFilters.length === 0
                ? 'Department'
                : departmentFilters.length === 1
                ? departmentFilters[0]
                : `${departmentFilters.length} depts`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2 bg-popover border shadow-md z-50 max-h-[300px] overflow-y-auto" align="start">
          <div className="space-y-1">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={departmentFilters.includes(dept.name)}
                  onCheckedChange={() =>
                    toggleFilter(dept.name, departmentFilters, onDepartmentFiltersChange)
                  }
                />
                <span className="text-sm">{dept.name}</span>
              </label>
            ))}
            {departments.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-1">No departments defined</p>
            )}
          </div>
          {departmentFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => onDepartmentFiltersChange([])}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>

      {/* Sort Option */}
      <Popover open={sortOpen} onOpenChange={setSortOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-between min-w-[140px]">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            <span className="truncate">
              {sortOptions.find(o => o.value === sortOption)?.label || 'Sort'}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[160px] p-2 bg-popover border shadow-md z-50" align="start">
          <div className="space-y-1">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm text-left ${
                  sortOption === option.value ? 'bg-muted font-medium' : ''
                }`}
                onClick={() => {
                  onSortOptionChange(option.value);
                  setSortOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
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
          {availabilityDateRange?.from && (
            <Badge variant="secondary" className="text-xs">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {formatDateRange()}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => onAvailabilityDateRangeChange(undefined)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
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
          {certificateFilters.map((cert) => (
            <Badge key={cert} variant="secondary" className="text-xs">
              <Award className="h-3 w-3 mr-1" />
              {cert}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => toggleFilter(cert, certificateFilters, onCertificateFiltersChange)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {departmentFilters.map((dept) => (
            <Badge key={dept} variant="secondary" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {dept}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => toggleFilter(dept, departmentFilters, onDepartmentFiltersChange)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results count */}
      {hasActiveFilters && resultCount !== undefined && (
        <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>
      )}
    </div>
  );
}
