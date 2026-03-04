import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users } from 'lucide-react';

type PersonnelFilterValue = 'all' | 'employees' | 'freelancers';

interface FreelancerFiltersProps {
  personnelFilter: PersonnelFilterValue;
  onPersonnelFilterChange: (value: PersonnelFilterValue) => void;
}

export function FreelancerFilters({
  personnelFilter,
  onPersonnelFilterChange,
}: FreelancerFiltersProps) {
  return (
    <ToggleGroup
      type="single"
      value={personnelFilter}
      onValueChange={(value) => {
        if (value) {
          onPersonnelFilterChange(value as PersonnelFilterValue);
        }
      }}
      className="bg-primary p-1 rounded-lg shrink-0"
    >
      <ToggleGroupItem
        value="all"
        aria-label="All personnel"
        className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        <Users className="h-4 w-4 mr-1.5" />
        All
      </ToggleGroupItem>
      <ToggleGroupItem
        value="employees"
        aria-label="Employees only"
        className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        Employees
      </ToggleGroupItem>
      <ToggleGroupItem
        value="freelancers"
        aria-label="Freelancers only"
        className="text-white data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
      >
        Freelancers
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
