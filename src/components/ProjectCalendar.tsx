import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flag } from 'lucide-react';
import { Project } from '@/hooks/useProjects';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';

interface ProjectCalendarProps {
  project: Project;
  onUpdateDates?: (startDate: string, endDate: string | undefined) => void;
  editable?: boolean;
}

export function ProjectCalendar({ project, onUpdateDates, editable = true }: ProjectCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return parseISO(project.startDate);
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState(project.startDate);
  const [editEndDate, setEditEndDate] = useState(project.endDate || '');

  const projectStart = parseISO(project.startDate);
  const projectEnd = project.endDate ? parseISO(project.endDate) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const isInProjectRange = (day: Date) => {
    if (!projectEnd) {
      return isSameDay(day, projectStart);
    }
    return isWithinInterval(day, { start: projectStart, end: projectEnd });
  };

  const isProjectStart = (day: Date) => isSameDay(day, projectStart);
  const isProjectEnd = (day: Date) => projectEnd && isSameDay(day, projectEnd);

  const getCalendarItemForDay = (day: Date) => {
    if (!project.calendarItems) return null;
    return project.calendarItems.find((item) => isSameDay(parseISO(item.date), day));
  };

  const handleSave = () => {
    if (onUpdateDates && editStartDate) {
      onUpdateDates(editStartDate, editEndDate || undefined);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditStartDate(project.startDate);
    setEditEndDate(project.endDate || '');
    setIsEditing(false);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-sky-500" />
            Project Timeline
          </CardTitle>
          {editable && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit Dates
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Start:</span>
              <span className="font-medium">{format(projectStart, 'MMM d, yyyy')}</span>
            </div>
            {projectEnd && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary/50" />
                <span className="text-muted-foreground">End:</span>
                <span className="font-medium">{format(projectEnd, 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium">{format(currentMonth, 'MMMM yyyy')}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="py-2 text-muted-foreground font-medium text-xs">
                {day}
              </div>
            ))}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="contents">
                {week.map((day, dayIndex) => {
                  const inRange = isInProjectRange(day);
                  const isStart = isProjectStart(day);
                  const isEnd = isProjectEnd(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const calendarItem = getCalendarItemForDay(day);

                  const dayContent = (
                    <div
                      key={day.toISOString()}
                      className={`
                        relative py-2 text-sm
                        ${!isCurrentMonth ? 'text-muted-foreground/40' : ''}
                        ${inRange ? 'bg-primary/20' : ''}
                        ${isStart ? 'rounded-l-md bg-primary text-primary-foreground font-semibold' : ''}
                        ${isEnd ? 'rounded-r-md bg-primary text-primary-foreground font-semibold' : ''}
                        ${inRange && !isStart && !isEnd && dayIndex === 0 ? 'rounded-l-md' : ''}
                        ${inRange && !isStart && !isEnd && dayIndex === 6 ? 'rounded-r-md' : ''}
                      `}
                    >
                      {format(day, 'd')}
                      {calendarItem && (
                        <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${calendarItem.isMilestone ? 'bg-amber-500' : 'bg-destructive'}`} />
                      )}
                    </div>
                  );

                  if (calendarItem) {
                    return (
                      <Tooltip key={day.toISOString()}>
                        <TooltipTrigger asChild>
                          {dayContent}
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="flex items-center gap-2">
                            {calendarItem.isMilestone && <Flag className="h-3 w-3 text-amber-500" />}
                            <p className="font-medium">{format(day, 'MMM d, yyyy')}</p>
                          </div>
                          <p className="text-xs">{calendarItem.description}</p>
                          {calendarItem.isMilestone && (
                            <p className="text-xs text-amber-500 mt-1">Milestone</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return dayContent;
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
