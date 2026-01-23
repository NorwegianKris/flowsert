import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { 
  CheckCircle2, 
  Circle, 
  User, 
  Award, 
  FileText, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionIndicatorProps {
  personnel: Personnel;
}

interface CompletionItem {
  id: string;
  label: string;
  completed: boolean;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

export function ProfileCompletionIndicator({ personnel }: ProfileCompletionIndicatorProps) {
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocumentCount() {
      try {
        const { count, error } = await supabase
          .from('personnel_documents')
          .select('*', { count: 'exact', head: true })
          .eq('personnel_id', personnel.id);

        if (!error && count !== null) {
          setDocumentCount(count);
        }
      } catch (err) {
        console.error('Error fetching document count:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDocumentCount();
  }, [personnel.id]);

  // Define completion items
  const completionItems: CompletionItem[] = [
    {
      id: 'name',
      label: 'Full name added',
      completed: !!personnel.name && personnel.name.trim().length > 0,
      icon: <User className="h-4 w-4" />,
      priority: 'high',
    },
    {
      id: 'phone',
      label: 'Phone number added',
      completed: !!personnel.phone && personnel.phone.trim().length > 0,
      icon: <User className="h-4 w-4" />,
      priority: 'high',
    },
    {
      id: 'nationality',
      label: 'Nationality specified',
      completed: !!personnel.nationality,
      icon: <User className="h-4 w-4" />,
      priority: 'medium',
    },
    {
      id: 'department',
      label: 'Department selected',
      completed: !!personnel.department,
      icon: <User className="h-4 w-4" />,
      priority: 'medium',
    },
    {
      id: 'bio',
      label: 'Personal introduction written',
      completed: !!personnel.bio && personnel.bio.trim().length >= 20,
      icon: <User className="h-4 w-4" />,
      priority: 'medium',
    },
    {
      id: 'certificates',
      label: 'At least one certificate uploaded',
      completed: personnel.certificates.length > 0,
      icon: <Award className="h-4 w-4" />,
      priority: 'high',
    },
    {
      id: 'documents',
      label: 'Supporting documents uploaded',
      completed: documentCount > 0,
      icon: <FileText className="h-4 w-4" />,
      priority: 'high',
    },
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const totalCount = completionItems.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Color coding based on completion percentage
  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-[hsl(var(--status-valid))]';
    if (percentage >= 50) return 'bg-[hsl(var(--status-warning))]';
    return 'bg-destructive';
  };

  const getStatusText = () => {
    if (percentage === 100) return 'Profile Complete!';
    if (percentage >= 80) return 'Almost there!';
    if (percentage >= 50) return 'Good progress';
    return 'Needs attention';
  };

  const getStatusBadgeVariant = () => {
    if (percentage >= 80) return 'default';
    if (percentage >= 50) return 'secondary';
    return 'destructive';
  };

  const incompleteHighPriority = completionItems.filter(
    item => !item.completed && item.priority === 'high'
  );

  if (loading) {
    return null;
  }

  // Don't show if profile is 100% complete
  if (percentage === 100) {
    return (
      <Card className="border-[hsl(var(--status-valid))]/30 bg-[hsl(var(--status-valid))]/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-[hsl(var(--status-valid))]/10">
              <Sparkles className="h-5 w-5 text-[hsl(var(--status-valid))]" />
            </div>
            <div>
              <p className="font-medium text-[hsl(var(--status-valid))]">Profile Complete!</p>
              <p className="text-sm text-muted-foreground">
                Great job! Your profile is ready for employers to review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-border/50",
      percentage < 50 && "border-destructive/30 bg-destructive/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {percentage < 50 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            Profile Completion
          </CardTitle>
          <Badge variant={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} of {totalCount} items completed
            </span>
            <span className="font-semibold">{percentage}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-500 rounded-full", getProgressColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Encouragement message */}
        <p className="text-sm text-muted-foreground">
          Complete your profile to increase your chances of being hired. Employers prefer candidates with detailed profiles and verified certificates.
        </p>

        {/* Incomplete high-priority items */}
        {incompleteHighPriority.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recommended actions:
            </p>
            <div className="space-y-1.5">
              {incompleteHighPriority.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50"
                >
                  <Circle className="h-3 w-3 text-muted-foreground" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion checklist */}
        <details className="group">
          <summary className="text-sm text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
            <span>View all checklist items</span>
            <span className="group-open:rotate-90 transition-transform">→</span>
          </summary>
          <div className="mt-3 space-y-1.5">
            {completionItems.map(item => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded-md",
                  item.completed ? "bg-[hsl(var(--status-valid))]/10" : "bg-muted/30"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-valid))]" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn(
                  item.completed && "text-muted-foreground line-through"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
