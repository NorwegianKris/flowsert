import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Briefcase } from 'lucide-react';

interface JobSeekerFiltersProps {
  includeJobSeekers: boolean;
  onIncludeJobSeekersChange: (value: boolean) => void;
  showJobSeekersOnly: boolean;
  onShowJobSeekersOnlyChange: (value: boolean) => void;
}

export function JobSeekerFilters({
  includeJobSeekers,
  onIncludeJobSeekersChange,
  showJobSeekersOnly,
  onShowJobSeekersOnlyChange,
}: JobSeekerFiltersProps) {
  const handleIncludeChange = (checked: boolean) => {
    onIncludeJobSeekersChange(checked);
    // If disabling include, also disable show only
    if (!checked && showJobSeekersOnly) {
      onShowJobSeekersOnlyChange(false);
    }
  };

  const handleShowOnlyChange = (checked: boolean) => {
    onShowJobSeekersOnlyChange(checked);
    // If enabling show only, automatically enable include
    if (checked && !includeJobSeekers) {
      onIncludeJobSeekersChange(true);
    }
  };

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-bar text-bar-foreground rounded-lg border border-bar/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Briefcase className="h-4 w-4" />
        <span className="text-sm font-medium">Job Seekers:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="include-job-seekers"
          checked={includeJobSeekers}
          onCheckedChange={handleIncludeChange}
        />
        <Label htmlFor="include-job-seekers" className="text-sm cursor-pointer">
          Include job seekers
        </Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="show-job-seekers-only"
          checked={showJobSeekersOnly}
          onCheckedChange={handleShowOnlyChange}
        />
        <Label htmlFor="show-job-seekers-only" className="text-sm cursor-pointer">
          Show job seekers only
        </Label>
      </div>
    </div>
  );
}
