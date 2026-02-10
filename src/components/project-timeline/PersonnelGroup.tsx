import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PersonnelTimelineData } from './types';
import { AvailabilityLane } from './AvailabilityLane';
import { ComplianceLane } from './ComplianceLane';

interface PersonnelGroupProps {
  data: PersonnelTimelineData;
  projectStart: string;
  projectEnd: string;
  totalWidth: number;
  defaultExpanded: boolean;
  onPersonnelClick?: () => void;
  onScrollToCertificates?: () => void;
}

export function PersonnelGroup({
  data,
  projectStart,
  projectEnd,
  totalWidth,
  defaultExpanded,
  onPersonnelClick,
  onScrollToCertificates,
}: PersonnelGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { person } = data;

  const initials = person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-b border-border/30">
      {/* Header */}
      <button
        className="flex items-center w-full px-3 py-1.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mr-1.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground mr-1.5 flex-shrink-0" />
        )}
        <Avatar className="h-5 w-5 mr-2">
          <AvatarImage src={person.avatarUrl} alt={person.name} />
          <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground truncate">{person.name}</span>
        <span className="text-[10px] text-muted-foreground ml-2 truncate">{person.role}</span>
      </button>

      {/* Lanes */}
      {expanded && (
        <div>
          <AvailabilityLane
            spans={data.availabilitySpans}
            projectStart={projectStart}
            projectEnd={projectEnd}
            totalWidth={totalWidth}
            onClick={onPersonnelClick}
          />
          <ComplianceLane
            bars={data.complianceBars}
            projectStart={projectStart}
            projectEnd={projectEnd}
            totalWidth={totalWidth}
            onScrollToCertificates={onScrollToCertificates}
          />
        </div>
      )}
    </div>
  );
}
