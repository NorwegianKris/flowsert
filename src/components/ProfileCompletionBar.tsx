import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionBarProps {
  personnel: Personnel;
}

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
}

// Calculate completion using the same 9-item logic as ProfileCompletionIndicator
function calculateCompletionItems(personnel: Personnel, documentCount: number): CompletionItem[] {
  return [
    {
      id: 'name',
      label: 'Full name',
      completed: !!personnel.name && personnel.name.trim().length > 0,
    },
    {
      id: 'role',
      label: 'Role/position',
      completed: !!personnel.role && personnel.role.trim().length > 0,
    },
    {
      id: 'nationality',
      label: 'Nationality',
      completed: !!personnel.nationality,
    },
    {
      id: 'gender',
      label: 'Gender',
      completed: !!personnel.gender,
    },
    {
      id: 'phone',
      label: 'Phone number',
      completed: !!personnel.phone && personnel.phone.trim().length > 0,
    },
    {
      id: 'email',
      label: 'Email address',
      completed: !!personnel.email && personnel.email.trim().length > 0,
    },
    {
      id: 'location',
      label: 'Location',
      completed: !!personnel.location && personnel.location.trim().length > 0 && personnel.location !== 'Not specified',
    },
    {
      id: 'certificates',
      label: 'At least 1 certificate',
      completed: personnel.certificates.length > 0,
    },
    {
      id: 'documents',
      label: 'At least 1 document',
      completed: documentCount > 0,
    },
  ];
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

  const completionItems = calculateCompletionItems(personnel, documentCount);
  const completedCount = completionItems.filter(item => item.completed).length;
  const totalCount = completionItems.length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  // Derived values for display
  const hasCertificate = personnel.certificates.length > 0;
  const hasDocument = documentCount > 0;
  const personalInfoItems = completionItems.filter(item => !['certificates', 'documents'].includes(item.id));
  const personalInfoFilled = personalInfoItems.filter(item => item.completed).length;
  const personalInfoTotal = personalInfoItems.length;

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
          {personalInfoFilled === personalInfoTotal ? (
            <CheckCircle className="h-3.5 w-3.5 text-[hsl(var(--status-valid))]" />
          ) : (
            <Circle className="h-3.5 w-3.5" />
          )}
          <span className={cn(personalInfoFilled === personalInfoTotal && 'text-foreground')}>
            Personal info complete ({personalInfoFilled}/{personalInfoTotal})
          </span>
        </div>
      </div>
    </div>
  );
}
