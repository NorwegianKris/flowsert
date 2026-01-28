import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionBarProps {
  personnel: Personnel;
}

interface CompletionCriteria {
  hasCertificate: boolean;
  hasDocument: boolean;
  personalInfoComplete: boolean;
}

// Personal info fields that need to be filled for 100% completion
const REQUIRED_PERSONAL_INFO_FIELDS: (keyof Personnel)[] = [
  'name',
  'role',
  'nationality',
  'gender',
  'phone',
  'email',
];

function calculatePersonalInfoCompletion(personnel: Personnel): { filled: number; total: number } {
  const total = REQUIRED_PERSONAL_INFO_FIELDS.length;
  let filled = 0;

  for (const field of REQUIRED_PERSONAL_INFO_FIELDS) {
    const value = personnel[field];
    if (value && typeof value === 'string' && value.trim() !== '' && value !== 'Not specified') {
      filled++;
    }
  }

  return { filled, total };
}

export function ProfileCompletionBar({ personnel }: ProfileCompletionBarProps) {
  const [documentCount, setDocumentCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentCount = async () => {
      try {
        const { count, error } = await supabase
          .from('personnel_documents')
          .select('*', { count: 'exact', head: true })
          .eq('personnel_id', personnel.id);

        if (error) throw error;
        setDocumentCount(count || 0);
      } catch (error) {
        console.error('Error fetching document count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentCount();
  }, [personnel.id]);

  const hasCertificate = personnel.certificates.length > 0;
  const hasDocument = documentCount > 0;
  const personalInfo = calculatePersonalInfoCompletion(personnel);
  const personalInfoComplete = personalInfo.filled === personalInfo.total;

  // Calculate completion percentage (3 criteria, each worth ~33.33%)
  let completedCriteria = 0;
  if (hasCertificate) completedCriteria++;
  if (hasDocument) completedCriteria++;
  if (personalInfoComplete) completedCriteria++;

  const completionPercentage = Math.round((completedCriteria / 3) * 100);

  // Determine bar color based on percentage
  const getBarColorClass = () => {
    if (completionPercentage >= 100) return 'bg-[hsl(var(--status-valid))]';
    if (completionPercentage >= 67) return 'bg-[hsl(var(--status-warning))]';
    if (completionPercentage >= 34) return 'bg-[hsl(var(--status-warning))]';
    return 'bg-destructive';
  };

  // Create gradient stops for visual reference
  const gradientBackground = 'linear-gradient(90deg, hsl(0, 72%, 50%) 0%, hsl(38, 92%, 50%) 50%, hsl(142, 76%, 36%) 100%)';

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Profile Completion</span>
        <span className="text-sm font-semibold text-foreground">{completionPercentage}%</span>
      </div>

      {/* Progress bar with gradient background */}
      <div className="relative">
        {/* Gradient background track */}
        <div 
          className="h-3 rounded-full overflow-hidden"
          style={{ background: gradientBackground }}
        />
        
        {/* Overlay to mask unachieved progress */}
        <div 
          className="absolute top-0 right-0 h-3 bg-muted/90 rounded-r-full transition-all duration-500"
          style={{ width: `${100 - completionPercentage}%` }}
        />
      </div>

      {/* Criteria checklist */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {hasCertificate ? (
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--status-valid))]" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          <span className={cn(hasCertificate && 'text-foreground')}>
            At least 1 certificate
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {hasDocument ? (
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--status-valid))]" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          <span className={cn(hasDocument && 'text-foreground')}>
            At least 1 document
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {personalInfoComplete ? (
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--status-valid))]" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          <span className={cn(personalInfoComplete && 'text-foreground')}>
            Personal info complete ({personalInfo.filled}/{personalInfo.total})
          </span>
        </div>
      </div>
    </div>
  );
}
