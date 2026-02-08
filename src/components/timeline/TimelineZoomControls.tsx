import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw } from 'lucide-react';

interface TimelineZoomControlsProps {
  timelineEndDays: number;
  onTimelineEndDaysChange: (days: number) => void;
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
}: TimelineZoomControlsProps) {
  const isDefault = timelineEndDays === DEFAULT_DAYS;

  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
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
        Showing next {formatDaysLabel(timelineEndDays)}
      </span>

      {/* Reset button */}
      {!isDefault && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => onTimelineEndDaysChange(DEFAULT_DAYS)}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      )}
    </div>
  );
}
