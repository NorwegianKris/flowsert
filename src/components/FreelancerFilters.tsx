import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CustomPersonnelFilterDialog } from './CustomPersonnelFilterDialog';
import { Personnel } from '@/types';

type PersonnelFilterValue = 'all' | 'employees' | 'freelancers' | 'custom';

interface FreelancerFiltersProps {
  personnelFilter: PersonnelFilterValue;
  onPersonnelFilterChange: (value: PersonnelFilterValue) => void;
  personnel?: Personnel[];
  customPersonnelIds?: string[];
  customRoles?: string[];
  customWorkerGroupIds?: string[];
  customSkills?: string[];
  onCustomFilterChange?: (personnelIds: string[], roles: string[], workerGroupIds: string[], skills: string[]) => void;
}

export function FreelancerFilters({
  personnelFilter,
  onPersonnelFilterChange,
  personnel = [],
  customPersonnelIds = [],
  customRoles = [],
  customWorkerGroupIds = [],
  customSkills = [],
  onCustomFilterChange,
}: FreelancerFiltersProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  const handleCustomClick = () => {
    if (personnelFilter === 'custom') {
      setCustomDialogOpen(true);
    } else {
      onPersonnelFilterChange('custom');
      setCustomDialogOpen(true);
    }
  };

  const handleApplyCustomFilter = (personnelIds: string[], roles: string[], workerGroupIds: string[], skills: string[]) => {
    onCustomFilterChange?.(personnelIds, roles, workerGroupIds, skills);
    if (personnelIds.length === 0 && roles.length === 0 && workerGroupIds.length === 0 && skills.length === 0) {
      onPersonnelFilterChange('employees');
    }
  };

  const customSelectionCount = customPersonnelIds.length + customRoles.length + customWorkerGroupIds.length + customSkills.length;

  return (
    <>
      <ToggleGroup
        type="single"
        value={personnelFilter}
        onValueChange={(value) => {
          if (value === 'custom') {
            handleCustomClick();
          } else if (value) {
            onPersonnelFilterChange(value as PersonnelFilterValue);
          }
        }}
        className="bg-primary p-1 rounded-lg shrink-0"
      >
        <ToggleGroupItem
          value="all"
          aria-label="All personnel"
          className="text-white hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
        >
          <Users className="h-4 w-4 mr-1.5" />
          All
        </ToggleGroupItem>
        <ToggleGroupItem
          value="employees"
          aria-label="Employees only"
          className="text-white hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
        >
          Employees
        </ToggleGroupItem>
        <ToggleGroupItem
          value="freelancers"
          aria-label="Freelancers only"
          className="text-white hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm"
        >
          Freelancers
        </ToggleGroupItem>
        <ToggleGroupItem
          value="custom"
          aria-label="Custom filter"
          className="text-white hover:bg-primary-foreground/20 data-[state=on]:bg-background data-[state=on]:text-primary data-[state=on]:shadow-sm px-3 py-1.5 text-sm gap-1.5"
          onClick={(e) => {
            if (personnelFilter === 'custom') {
              e.preventDefault();
              setCustomDialogOpen(true);
            }
          }}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Custom
          {personnelFilter === 'custom' && customSelectionCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
              {customSelectionCount}
            </Badge>
          )}
        </ToggleGroupItem>
      </ToggleGroup>

      {onCustomFilterChange && (
        <CustomPersonnelFilterDialog
          open={customDialogOpen}
          onOpenChange={setCustomDialogOpen}
          personnel={personnel}
          selectedPersonnelIds={customPersonnelIds}
          selectedRoles={customRoles}
          selectedWorkerGroupIds={customWorkerGroupIds}
          selectedSkills={customSkills}
          onApply={handleApplyCustomFilter}
        />
      )}
    </>
  );
}
