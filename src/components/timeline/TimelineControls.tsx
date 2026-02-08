import { format, subDays, addDays, differenceInDays } from 'date-fns';
import { CalendarIcon, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { TimelineRange } from './types';

interface TimelineControlsProps {
  range: TimelineRange;
  onRangeChange: (range: TimelineRange) => void;
  onReset: () => void;
}

const DEFAULT_RANGE_DAYS = 120; // -30 to +90

export function TimelineControls({ range, onRangeChange, onReset }: TimelineControlsProps) {
  const rangeSpanDays = differenceInDays(range.end, range.start);
  
  // Zoom: slider value 0-100 maps to 30-180 day range
  const zoomValue = Math.round(((rangeSpanDays - 30) / 150) * 100);
  
  const handleZoomChange = (values: number[]) => {
    const newSpan = 30 + (values[0] / 100) * 150; // 30 to 180 days
    const center = new Date((range.start.getTime() + range.end.getTime()) / 2);
    const halfSpan = newSpan / 2;
    
    onRangeChange({
      start: subDays(center, halfSpan),
      end: addDays(center, halfSpan),
    });
  };
  
  const handleStartChange = (date: Date | undefined) => {
    if (date && date < range.end) {
      onRangeChange({ ...range, start: date });
    }
  };
  
  const handleEndChange = (date: Date | undefined) => {
    if (date && date > range.start) {
      onRangeChange({ ...range, end: date });
    }
  };
  
  const handleZoomIn = () => {
    const newSpan = Math.max(30, rangeSpanDays - 15);
    const center = new Date((range.start.getTime() + range.end.getTime()) / 2);
    const halfSpan = newSpan / 2;
    onRangeChange({
      start: subDays(center, halfSpan),
      end: addDays(center, halfSpan),
    });
  };
  
  const handleZoomOut = () => {
    const newSpan = Math.min(180, rangeSpanDays + 15);
    const center = new Date((range.start.getTime() + range.end.getTime()) / 2);
    const halfSpan = newSpan / 2;
    onRangeChange({
      start: subDays(center, halfSpan),
      end: addDays(center, halfSpan),
    });
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      {/* Date Pickers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">From:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[130px] justify-start text-left font-normal",
                !range.start && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(range.start, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range.start}
              onSelect={handleStartChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        
        <span className="text-sm text-muted-foreground">To:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[130px] justify-start text-left font-normal",
                !range.end && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(range.end, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range.end}
              onSelect={handleEndChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
      
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={rangeSpanDays <= 30}
          className="h-8 w-8"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <div className="w-24">
          <Slider
            value={[zoomValue]}
            onValueChange={handleZoomChange}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={rangeSpanDays >= 180}
          className="h-8 w-8"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {rangeSpanDays} days
        </span>
      </div>
    </div>
  );
}
