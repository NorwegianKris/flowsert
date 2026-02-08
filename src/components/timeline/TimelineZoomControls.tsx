import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

  const clearAllFilters = () => {
    onTypeChange(null);
    onCategoryChange(null);
    onTimelineEndDaysChange(DEFAULT_DAYS);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Left side: Zoom controls */}
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-3 min-w-[100px] max-w-[160px]">
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
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
          {formatDaysLabel(timelineEndDays)}
        </span>
      </div>

      {/* Right side: Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />

        {/* Category filter */}
        <Select
          value={selectedCategoryId ?? 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-7 w-[120px] text-xs">
            <SelectValue placeholder="Category" />
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
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue placeholder="Type" />
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

        {/* Reset button */}
        {(hasFilters || !isDefault) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={clearAllFilters}
            title="Reset all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
