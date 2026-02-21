import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

interface FreelancerFiltersProps {
  includeEmployees: boolean;
  onIncludeEmployeesChange: (value: boolean) => void;
  includeFreelancers: boolean;
  onIncludeFreelancersChange: (value: boolean) => void;
  showFreelancersOnly: boolean;
  onShowFreelancersOnlyChange: (value: boolean) => void;
}

export function FreelancerFilters({
  includeEmployees,
  onIncludeEmployeesChange,
  includeFreelancers,
  onIncludeFreelancersChange,
  showFreelancersOnly,
  onShowFreelancersOnlyChange,
}: FreelancerFiltersProps) {
  const handleIncludeEmployeesChange = (checked: boolean) => {
    if (!checked && !includeFreelancers) {
      onIncludeFreelancersChange(true);
    }
    onIncludeEmployeesChange(checked);
    if (checked && showFreelancersOnly) {
      onShowFreelancersOnlyChange(false);
    }
  };

  const handleIncludeFreelancersChange = (checked: boolean) => {
    if (!checked && !includeEmployees) {
      onIncludeEmployeesChange(true);
    }
    onIncludeFreelancersChange(checked);
    if (!checked && showFreelancersOnly) {
      onShowFreelancersOnlyChange(false);
    }
  };

  const handleShowOnlyChange = (checked: boolean) => {
    onShowFreelancersOnlyChange(checked);
    if (checked) {
      // Automatically enable include freelancers and disable employees
      if (!includeFreelancers) onIncludeFreelancersChange(true);
      if (includeEmployees) onIncludeEmployeesChange(false);
    }
  };

  return (
    <div className="flex items-center gap-6 py-3 px-4 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Personnel view:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch
          id="include-employees"
          checked={includeEmployees}
          onCheckedChange={handleIncludeEmployeesChange}
        />
        <Label htmlFor="include-employees" className="text-sm cursor-pointer">
          Include Employees
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="include-freelancers"
          checked={includeFreelancers}
          onCheckedChange={handleIncludeFreelancersChange}
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
