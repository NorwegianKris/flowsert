import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { ChevronDown, X, CalendarIcon, Award, Building2, ArrowUpDown, FolderOpen, Tag, Globe, ShieldCheck } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type PersonnelSortOption = 'recent' | 'last_updated' | 'alphabetical';
export type CertificateFilterMode = 'types' | 'categories' | 'issuers';
export type ComplianceStatusFilter = 'all' | 'valid' | 'expiring' | 'expired';

interface PersonnelFiltersProps {
  locationFilters: string[];
  onLocationFiltersChange: (values: string[]) => void;
  certificateFilters: string[];
  onCertificateFiltersChange: (values: string[]) => void;
  departmentFilters: string[];
  onDepartmentFiltersChange: (values: string[]) => void;
  locations: string[];
  certificates: string[];
  certificateCategories?: string[];
  certificateIssuers?: string[];
  availabilityDateRange: DateRange | undefined;
  onAvailabilityDateRangeChange: (range: DateRange | undefined) => void;
  sortOption: PersonnelSortOption;
  onSortOptionChange: (option: PersonnelSortOption) => void;
  certificateFilterMode?: CertificateFilterMode;
  onCertificateFilterModeChange?: (mode: CertificateFilterMode) => void;
  complianceStatusFilter?: ComplianceStatusFilter;
  onComplianceStatusFilterChange?: (value: ComplianceStatusFilter) => void;
  resultCount?: number;
}

export function PersonnelFilters({
  locationFilters,
  onLocationFiltersChange,
  certificateFilters,
  onCertificateFiltersChange,
  departmentFilters,
  onDepartmentFiltersChange,
  locations,
  certificates,
  certificateCategories = [],
  certificateIssuers = [],
  availabilityDateRange,
  onAvailabilityDateRangeChange,
  sortOption,
  onSortOptionChange,
  certificateFilterMode = 'types',
  onCertificateFilterModeChange,
  complianceStatusFilter = 'all',
  onComplianceStatusFilterChange,
  resultCount,
}: PersonnelFiltersProps) {
  const { departments } = useDepartments();
  const [locationOpen, setLocationOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);

  // Determine which list to show based on mode
  const certificateListItems = certificateFilterMode === 'categories' ? certificateCategories : certificateFilterMode === 'issuers' ? certificateIssuers : certificates;

  const sortOptions = [
    { value: 'recent' as PersonnelSortOption, label: 'Recently Added' },
    { value: 'last_updated' as PersonnelSortOption, label: 'Last Updated' },
    { value: 'alphabetical' as PersonnelSortOption, label: 'Alphabetical' },
  ];

  const complianceOptions: { value: ComplianceStatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'valid', label: 'Valid' },
    { value: 'expiring', label: 'Expiring Soon' },
    { value: 'expired', label: 'Expired' },
  ];

  const hasActiveFilters = 
    locationFilters.length > 0 || 
    certificateFilters.length > 0 ||
    departmentFilters.length > 0 ||
    availabilityDateRange?.from !== undefined ||
    complianceStatusFilter !== 'all';

  const clearAllFilters = () => {
    onLocationFiltersChange([]);
    onCertificateFiltersChange([]);
    onDepartmentFiltersChange([]);
    onAvailabilityDateRangeChange(undefined);
    onComplianceStatusFilterChange?.('all');
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
    <div className={hasActiveFilters ? 'mb-4' : ''}>
      <div className={`flex flex-nowrap items-center gap-3 ${hasActiveFilters ? 'mb-2' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter by:</span>
        </div>

        {/* Availability Date Range Filter */}
        <Popover open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between bg-white dark:bg-card">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>{formatDateRange()}</span>
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

        {/* Location Filter */}
        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between bg-white dark:bg-card">
              <Globe className="mr-2 h-4 w-4" />
              <span>
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
            <Button variant="outline" className="h-9 justify-between bg-white dark:bg-card">
              <Award className="mr-2 h-4 w-4" />
              <span>
                {certificateFilters.length === 0
                  ? 'Certificates'
                  : certificateFilters.length === 1
                  ? certificateFilters[0]
                  : `${certificateFilters.length} certs`}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0 bg-popover border shadow-md z-50" align="start">
            {onCertificateFilterModeChange && (certificateCategories.length > 0 || certificateIssuers.length > 0) && (
              <div className="p-2 border-b">
                <ToggleGroup
                  type="single"
                  value={certificateFilterMode}
                  onValueChange={(value) => {
                    if (value) {
                      onCertificateFiltersChange([]);
                      onCertificateFilterModeChange(value as CertificateFilterMode);
                    }
                  }}
                  className="w-full bg-primary p-1 rounded-md"
                >
                  <ToggleGroupItem
                    value="categories"
                    className="flex-1 gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
                    aria-label="Filter by categories"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Categories
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="types"
                    className="flex-1 gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
                    aria-label="Filter by types"
                  >
                    <Tag className="h-3.5 w-3.5" />
                    Types
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="issuers"
                    className="flex-1 gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/20 data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
                    aria-label="Filter by issuers"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Issuers
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
                    No {certificateFilterMode === 'categories' ? 'categories' : certificateFilterMode === 'issuers' ? 'issuers' : 'certificates'}
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
            <Button variant="outline" className="h-9 justify-between bg-white dark:bg-card">
              <Building2 className="mr-2 h-4 w-4" />
              <span>
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

        {/* Compliance Status Filter */}
        {onComplianceStatusFilterChange && (
          <Popover open={complianceOpen} onOpenChange={setComplianceOpen}>
            <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 justify-between bg-white dark:bg-card">
                <ShieldCheck className="mr-2 h-4 w-4" />
                <span>
                  {complianceStatusFilter === 'all'
                    ? 'Compliance'
                    : complianceOptions.find(o => o.value === complianceStatusFilter)?.label || 'Compliance'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[180px] p-2 bg-popover border shadow-md z-50" align="start">
              <div className="space-y-1">
                {complianceOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm text-left ${
                      complianceStatusFilter === option.value ? 'bg-muted font-medium' : ''
                    }`}
                    onClick={() => {
                      onComplianceStatusFilterChange(option.value);
                      setComplianceOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <Button className="ml-auto h-9 justify-between text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <span>
                {sortOptions.find(o => o.value === sortOption)?.label || 'Sort'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-2 bg-popover border shadow-md z-50" align="end">
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
      </div>

      {/* Active filters row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
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
          {complianceStatusFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" />
              {complianceOptions.find(o => o.value === complianceStatusFilter)?.label}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => onComplianceStatusFilterChange?.('all')}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {resultCount !== undefined && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {resultCount} {resultCount === 1 ? 'result' : 'results'}
              </span>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="ml-auto h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
