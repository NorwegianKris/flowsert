import { useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Personnel } from '@/types';
import { getDaysUntilExpiry } from '@/lib/certificateUtils';
import { Clock, AlertTriangle, AlertCircle, CheckCircle, Users, Award } from 'lucide-react';
import { TimelineChart } from '@/components/timeline/TimelineChart';
import { TimelineZoomControls } from '@/components/timeline/TimelineZoomControls';
import { ExpiryDetailsList } from '@/components/timeline/ExpiryDetailsList';
import { TimelineEvent, getEventStatus, getEventColor } from '@/components/timeline/types';
import { useCertificateTypes } from '@/hooks/useCertificateTypes';
import { useCertificateCategories } from '@/hooks/useCertificateCategories';
import { usePersonnelWorkerGroups } from '@/hooks/usePersonnelWorkerGroups';

interface ExpiryGroup {
  id: string;
  label: string;
  description: string;
  certificateCount: number;
  personnelCount: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  filterParams: { minDays?: number; maxDays?: number; overdue?: boolean };
}

interface ExpiryTimelineProps {
  personnel: Personnel[];
  personnelFilter: 'all' | 'employees' | 'freelancers' | 'custom';
  customPersonnelIds?: string[];
  customRoles?: string[];
  customWorkerGroupIds?: string[];
}

export function ExpiryTimeline({ 
  personnel, 
  personnelFilter,
  customPersonnelIds = [],
  customRoles = [],
  customWorkerGroupIds = [],
}: ExpiryTimelineProps) {
  const [timelineEndDays, setTimelineEndDays] = useState(90);
  const [timelineStartDays, setTimelineStartDays] = useState(-30);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [highlightedLaneId, setHighlightedLaneId] = useState<string | null>(null);
  const [detailsListOpen, setDetailsListOpen] = useState(false);
  const { data: personnelWorkerGroups = [] } = usePersonnelWorkerGroups();
  
  // Fetch certificate types and categories
  const { data: certificateTypes = [] } = useCertificateTypes();
  const { categories: certificateCategories } = useCertificateCategories();

  // Resolve worker group membership to personnel IDs
  const workerGroupPersonnelIds = useMemo(() => {
    if (customWorkerGroupIds.length === 0) return new Set<string>();
    const groupSet = new Set(customWorkerGroupIds);
    return new Set(
      personnelWorkerGroups
        .filter(pwg => groupSet.has(pwg.worker_group_id))
        .map(pwg => pwg.personnel_id)
    );
  }, [customWorkerGroupIds, personnelWorkerGroups]);

  // Filter personnel based on the selected filter
  const filteredPersonnel = useMemo(() => {
    if (personnelFilter === 'all') return personnel;
    if (personnelFilter === 'employees') return personnel.filter(p => p.category === 'employee');
    if (personnelFilter === 'freelancers') return personnel.filter(p => p.category === 'freelancer');
    if (personnelFilter === 'custom') {
      return personnel.filter(p => 
        customPersonnelIds.includes(p.id) || 
        customRoles.includes(p.role) ||
        workerGroupPersonnelIds.has(p.id)
      );
    }
    return personnel;
  }, [personnel, personnelFilter, customPersonnelIds, customRoles, workerGroupPersonnelIds]);

  // Calculate expiry groups
  const expiryGroups = useMemo((): ExpiryGroup[] => {
    const overdue = { certs: 0, personnelIds: new Set<string>() };
    const next30 = { certs: 0, personnelIds: new Set<string>() };
    const days31to60 = { certs: 0, personnelIds: new Set<string>() };
    const days61to90 = { certs: 0, personnelIds: new Set<string>() };

    filteredPersonnel.forEach(p => {
      p.certificates.forEach(cert => {
        const daysUntil = getDaysUntilExpiry(cert.expiryDate);
        
        if (daysUntil === null) return; // Skip certificates without expiry
        
        if (daysUntil < 0) {
          overdue.certs++;
          overdue.personnelIds.add(p.id);
        } else if (daysUntil <= 30) {
          next30.certs++;
          next30.personnelIds.add(p.id);
        } else if (daysUntil <= 60) {
          days31to60.certs++;
          days31to60.personnelIds.add(p.id);
        } else if (daysUntil <= 90) {
          days61to90.certs++;
          days61to90.personnelIds.add(p.id);
        }
      });
    });

    return [
      {
        id: 'overdue',
        label: 'Overdue',
        description: 'Certificates past expiry date',
        certificateCount: overdue.certs,
        personnelCount: overdue.personnelIds.size,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-500/10 hover:bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: AlertCircle,
        filterParams: { overdue: true },
      },
      {
        id: 'next30',
        label: 'Next 30 Days',
        description: 'Expiring within 30 days',
        certificateCount: next30.certs,
        personnelCount: next30.personnelIds.size,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
        borderColor: 'border-orange-500/30',
        icon: AlertTriangle,
        filterParams: { minDays: 0, maxDays: 30 },
      },
      {
        id: 'days31to60',
        label: '31–60 Days',
        description: 'Expiring in 31 to 60 days',
        certificateCount: days31to60.certs,
        personnelCount: days31to60.personnelIds.size,
        color: 'text-yellow-600 dark:text-yellow-500',
        bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: Clock,
        filterParams: { minDays: 31, maxDays: 60 },
      },
      {
        id: 'days61to90',
        label: '61–90 Days',
        description: 'Expiring in 61 to 90 days',
        certificateCount: days61to90.certs,
        personnelCount: days61to90.personnelIds.size,
        color: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
        icon: CheckCircle,
        filterParams: { minDays: 61, maxDays: 90 },
      },
    ];
  }, [filteredPersonnel]);

  // Compute timeline events from filtered personnel (dynamic range based on zoom)
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    filteredPersonnel.forEach(person => {
      person.certificates.forEach(cert => {
        if (!cert.expiryDate) return; // Skip non-expiring
        
        // Apply type filter
        if (selectedTypeId && cert.certificateTypeId !== selectedTypeId) return;
        
        // Apply category filter - need to check via certificate type's category
        if (selectedCategoryId) {
          // Find the certificate type to check its category
          const certType = certificateTypes.find(t => t.id === cert.certificateTypeId);
          if (!certType || certType.category_id !== selectedCategoryId) return;
        }
        
        const expiryDate = parseISO(cert.expiryDate);
        const daysUntil = getDaysUntilExpiry(cert.expiryDate);
        const status = getEventStatus(daysUntil);
        
        // Include all events - filtering will happen in TimelineChart based on zoom
        events.push({
          id: cert.id,
          personnelId: person.id,
          personnelName: person.name,
          certificateName: cert.name,
          expiryDate,
          daysUntilExpiry: daysUntil ?? 0,
          status,
          color: getEventColor(daysUntil),
          certificateTypeId: cert.certificateTypeId ?? null,
          certificateCategoryId: certificateTypes.find(t => t.id === cert.certificateTypeId)?.category_id ?? null,
          issuingAuthority: cert.issuingAuthority ?? null,
          dateOfIssue: cert.dateOfIssue ?? null,
          categoryName: cert.category ?? null,
          placeOfIssue: cert.placeOfIssue ?? null,
          documentUrl: cert.documentUrl ?? null,
        });
      });
    });
    
    return events.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }, [filteredPersonnel, selectedTypeId, selectedCategoryId, certificateTypes]);

  const handleLaneHighlight = (laneId: string) => {
    setHighlightedLaneId(laneId);
    setDetailsListOpen(true);
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Expiry Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Click any group or lane to view affected certificates and personnel
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {expiryGroups.map((group) => {
            const IconComponent = group.icon;
            const hasItems = group.certificateCount > 0;
            
            return (
              <button
                key={group.id}
                onClick={() => handleLaneHighlight(group.id)}
                disabled={!hasItems}
                className={`
                  relative flex flex-col p-4 rounded-lg border transition-all text-left
                  ${group.bgColor} ${group.borderColor}
                  ${hasItems ? 'cursor-pointer' : 'cursor-default opacity-60'}
                  focus:outline-none focus:ring-2 focus:ring-primary/50
                `}
              >
                {/* Header with icon and label */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`h-5 w-5 ${group.color}`} />
                    <span className={`font-semibold ${group.color}`}>
                      {group.label}
                    </span>
                  </div>
                </div>
                
                {/* Metrics */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold text-foreground">
                      {group.certificateCount}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      certificate{group.certificateCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold text-foreground">
                      {group.personnelCount}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      personnel affected
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-xs text-muted-foreground mt-3">
                  {group.description}
                </p>
              </button>
            );
          })}
        </div>
        
        {/* Timeline Section */}
        <Separator className="my-6" />
        
        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-medium text-muted-foreground">Event Timeline</h4>
            <TimelineZoomControls 
              timelineEndDays={timelineEndDays} 
              onTimelineEndDaysChange={setTimelineEndDays}
              timelineStartDays={timelineStartDays}
              onTimelineStartDaysChange={setTimelineStartDays}
              certificateTypes={certificateTypes}
              certificateCategories={certificateCategories}
              selectedTypeId={selectedTypeId}
              selectedCategoryId={selectedCategoryId}
              onTypeChange={setSelectedTypeId}
              onCategoryChange={setSelectedCategoryId}
            />
          </div>
          <TimelineChart 
            events={timelineEvents}
            personnelFilter={personnelFilter}
            timelineEndDays={timelineEndDays}
            timelineStartDays={timelineStartDays}
            onLaneClick={handleLaneHighlight}
          />
          <ExpiryDetailsList
            timelineEvents={timelineEvents}
            timelineStartDays={timelineStartDays}
            timelineEndDays={timelineEndDays}
            personnelFilter={personnelFilter}
            highlightedLaneId={highlightedLaneId}
            open={detailsListOpen}
            onOpenChange={setDetailsListOpen}
            onHighlightClear={() => setHighlightedLaneId(null)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
