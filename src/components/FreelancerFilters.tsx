import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Briefcase } from 'lucide-react';

interface FreelancerFiltersProps {
  includeFreelancers: boolean;
  onIncludeFreelancersChange: (value: boolean) => void;
  showFreelancersOnly: boolean;
  onShowFreelancersOnlyChange: (value: boolean) => void;
}

export function FreelancerFilters({
  includeFreelancers,
  onIncludeFreelancersChange,
  showFreelancersOnly,
  onShowFreelancersOnlyChange,
}: FreelancerFiltersProps) {
  const handleIncludeChange = (checked: boolean) => {
    onIncludeFreelancersChange(checked);
    // If disabling include, also disable show only
    if (!checked && showFreelancersOnly) {
      onShowFreelancersOnlyChange(false);
    }
  };

  const handleShowOnlyChange = (checked: boolean) => {
    onShowFreelancersOnlyChange(checked);
    // If enabling show only, automatically enable include
    if (checked && !includeFreelancers) {
      onIncludeFreelancersChange(true);
    }
  };

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Briefcase className="h-4 w-4" />
        <span className="text-sm font-medium">Freelancers:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="include-freelancers"
          checked={includeFreelancers}
          onCheckedChange={handleIncludeChange}
        />
        <Label htmlFor="include-freelancers" className="text-sm cursor-pointer">
          Include freelancers
        </Label>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="show-freelancers-only"
          checked={showFreelancersOnly}
          onCheckedChange={handleShowOnlyChange}
        />
        <Label htmlFor="show-freelancers-only" className="text-sm cursor-pointer">
          Show freelancers only
        </Label>
      </div>
    </div>
  );
}