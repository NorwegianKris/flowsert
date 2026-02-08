import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Filter, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CertificateType } from '@/hooks/useCertificateTypes';
import { CertificateCategory } from '@/hooks/useCertificateCategories';

interface TimelineZoomControlsProps {
  timelineEndDays: number;
  onTimelineEndDaysChange: (days: number) => void;
  // Filter props
  certificateTypes: CertificateType[];
  certificateCategories: CertificateCategory[];
  selectedTypeId: string | null;
  selectedCategoryId: string | null;
  onTypeChange: (typeId: string | null) => void;
  onCategoryChange: (categoryId: string | null) => void;
}

const PRESETS = [
  { label: '3m', days: 90 },
  { label: '6m', days: 180 },
  { label: '1y', days: 365 },
  { label: '2y', days: 730 },
];

const DEFAULT_DAYS = 90;
const MIN_DAYS = 90;
const MAX_DAYS = 730;

function formatDaysLabel(days: number): string {
  if (days <= 90) return '90 days';
  if (days < 365) return `${Math.round(days / 30)} months`;
  if (days === 365) return '1 year';
  if (days < 730) return `${(days / 365).toFixed(1)} years`;
  return '2 years';
}

export function TimelineZoomControls({
  timelineEndDays,
  onTimelineEndDaysChange,
  certificateTypes,
  certificateCategories,
  selectedTypeId,
  selectedCategoryId,
  onTypeChange,
  onCategoryChange,
}: TimelineZoomControlsProps) {
  const isDefault = timelineEndDays === DEFAULT_DAYS;
  const hasFilters = selectedTypeId !== null || selectedCategoryId !== null;
  const activeFilterCount = (selectedTypeId ? 1 : 0) + (selectedCategoryId ? 1 : 0);

  const clearAllFilters = () => {
    onTypeChange(null);
    onCategoryChange(null);
    onTimelineEndDaysChange(DEFAULT_DAYS);
  };

  return (
    <div className="space-y-3">
      {/* Zoom controls row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Preset buttons */}
        <div className="flex items-center gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={timelineEndDays === preset.days ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => onTimelineEndDaysChange(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border hidden sm:block" />

        {/* Slider */}
        <div className="flex items-center gap-3 flex-1 min-w-[120px] max-w-[200px]">
          <Slider
            value={[timelineEndDays]}
            min={MIN_DAYS}
            max={MAX_DAYS}
            step={30}
            onValueChange={([value]) => onTimelineEndDaysChange(value)}
            className="flex-1"
          />
        </div>

        {/* Current value display */}
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDaysLabel(timelineEndDays)}
        </span>
      </div>

      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter by:</span>
        </div>

        {/* Category filter */}
        <Select
          value={selectedCategoryId ?? 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {certificateCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select
          value={selectedTypeId ?? 'all'}
          onValueChange={(value) => onTypeChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {certificateTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filters badge & clear */}
        {(hasFilters || !isDefault) && (
          <>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={clearAllFilters}
            >
              <RotateCcw className="h-3 w-3" />
              Reset all
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
