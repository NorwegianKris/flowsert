import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { parseISO, isWithinInterval, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Project } from '@/hooks/useProjects';
import { ProjectPhase } from '@/hooks/useProjectPhases';
import { Personnel } from '@/types';
import { useProjectTimelineData, buildPersonnelTimelineData } from '@/hooks/useProjectTimelineData';
import { TimelineHeader } from './TimelineHeader';
import { MilestoneLane } from './MilestoneLane';
import { EventsLane } from './EventsLane';
import { PersonnelGroup } from './PersonnelGroup';
import { PhaseLane } from './PhaseLane';
import { LABEL_WIDTH } from './types';
import { dateToX } from './utils';
import { Clock, AlertTriangle, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectTimelineProps {
  project: Project;
  personnel: Personnel[];
  phases?: ProjectPhase[];
  onPersonnelClick?: (person: Personnel) => void;
  onEditProject?: () => void;
  onAddItem?: () => void;
  onAddPhase?: () => void;
  onEditTimeline?: () => void;
  onHighlightCertificate?: (certificateId: string) => void;
}

export function ProjectTimeline({
  project,
  personnel,
  phases = [],
  onPersonnelClick,
  onEditProject,
  onAddItem,
  onAddPhase,
  onEditTimeline,
  onHighlightCertificate,
}: ProjectTimelineProps) {
  const assignedPersonnel = useMemo(
    () =>
      project.assignedPersonnel
        .map((id) => personnel.find((p) => p.id === id))
        .filter((p): p is Personnel => p !== undefined),
    [project.assignedPersonnel, personnel]
  );

  const { rawRecordsMap, loading } = useProjectTimelineData(
    project.assignedPersonnel,
    project.startDate,
    project.endDate
  );

  const timelineData = useMemo(
    () =>
      project.endDate
        ? buildPersonnelTimelineData(
            assignedPersonnel,
            rawRecordsMap,
            project.startDate,
            project.endDate
          )
        : [],
    [assignedPersonnel, rawRecordsMap, project.startDate, project.endDate]
  );

  // Measure container width to fill available space
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Timeline content width = container minus the label column, at least MIN_TIMELINE_WIDTH
  const totalWidth = Math.max(100, containerWidth - LABEL_WIDTH);

  const today = new Date();
  const hasEndDate = !!project.endDate;
  const start = parseISO(project.startDate);
  const end = hasEndDate ? parseISO(project.endDate!) : start;
  const showToday = hasEndDate && isWithinInterval(today, { start, end });
  const todayX = showToday ? dateToX(today, start, end, totalWidth) : null;
  const endLineX = hasEndDate ? dateToX(subDays(end, 1), start, end, totalWidth) : null;

  const handleScrollToCertificates = useCallback((certificateId: string) => {
    const el = document.querySelector('[data-certificate-status]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onHighlightCertificate?.(certificateId);
  }, [onHighlightCertificate]);

  // If no end date, show message
  if (!project.endDate) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-muted-foreground">
            Set a project end date to view the timeline.
          </p>
          {onEditProject && (
            <Button variant="outline" size="sm" onClick={onEditProject}>
              Edit Project Dates
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-500" />
              Project Timeline
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Compliance, availability, and key project events over time
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onAddItem && (
              <Button size="sm" onClick={onAddItem} className="gap-1.5 flex-shrink-0 bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add event or milestone</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            {onAddPhase && (
              <Button size="sm" onClick={onAddPhase} className="gap-1.5 flex-shrink-0 bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Define phase</span>
                <span className="sm:hidden">Phase</span>
              </Button>
            )}
            {onEditTimeline && (
              <Button variant="secondary" size="sm" onClick={onEditTimeline} className="gap-1.5 flex-shrink-0">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Edit timeline</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider delayDuration={200}>
          <ScrollArea className="w-full" ref={containerRef}>
            <div>
              {/* Time axis header */}
              <div className="flex">
                <div className="w-[160px] flex-shrink-0 border-r border-border/30 border-b border-border/50" />
                <TimelineHeader
                  projectStart={project.startDate}
                  projectEnd={project.endDate}
                  totalWidth={totalWidth}
                />
              </div>

              {/* Today + End vertical lines across all lanes */}
              <div className="relative">
                {/* Start line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-destructive/40 z-20 pointer-events-none"
                  style={{ left: LABEL_WIDTH }}
                />
                {todayX !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-primary/40 z-20 pointer-events-none"
                    style={{ left: LABEL_WIDTH + todayX }}
                  />
                )}
                {/* End line */}
                {endLineX !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-destructive/40 z-20 pointer-events-none"
                    style={{ left: LABEL_WIDTH + endLineX }}
                  />
                )}

                {/* Milestone lane */}
                <MilestoneLane
                  calendarItems={project.calendarItems || []}
                  projectStart={project.startDate}
                  projectEnd={project.endDate}
                  totalWidth={totalWidth}
                />

                {/* Events lane */}
                <EventsLane
                  calendarItems={project.calendarItems || []}
                  projectStart={project.startDate}
                  projectEnd={project.endDate}
                  totalWidth={totalWidth}
                />

                {/* Phase lane */}
                <PhaseLane
                  phases={phases}
                  projectStart={project.startDate}
                  projectEnd={project.endDate}
                  totalWidth={totalWidth}
                />

                {/* Personnel groups */}
                {assignedPersonnel.length > 0 ? (
                  timelineData.map((data, i) => (
                    <PersonnelGroup
                      key={data.person.id}
                      data={data}
                      projectStart={project.startDate}
                      projectEnd={project.endDate!}
                      totalWidth={totalWidth}
                      defaultExpanded={false}
                      onPersonnelClick={() => onPersonnelClick?.(data.person)}
                      onScrollToCertificates={handleScrollToCertificates}
                    />
                  ))
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No personnel assigned
                    </p>
                  </div>
                )}
              </div>
            </div>
            
          </ScrollArea>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
