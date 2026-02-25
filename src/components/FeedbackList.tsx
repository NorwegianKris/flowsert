import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, MessageSquare, Trash2, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Feedback {
  id: string;
  category: string;
  message: string;
  created_at: string;
  user_name: string | null;
}

interface FeedbackListProps {
  embedded?: boolean;
  open?: boolean;
}

export function FeedbackList({ embedded, open: externalOpen }: FeedbackListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const effectiveOpen = embedded ? (externalOpen ?? false) : isOpen;

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          id, 
          category, 
          message, 
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const feedbackWithNames = await Promise.all(
        (data || []).map(async (item) => {
          if (item.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', item.user_id)
              .maybeSingle();
            return {
              ...item,
              user_name: profile?.full_name || profile?.email || 'Unknown User',
            };
          }
          return { ...item, user_name: 'Anonymous' };
        })
      );

      setFeedback(feedbackWithNames);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveOpen) {
      fetchFeedback();
    }
  }, [effectiveOpen]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
      setFeedback((prev) => prev.filter((f) => f.id !== id));
      toast.success('Feedback deleted');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    } finally {
      setDeleting(null);
    }
  };

  const handleExportPDF = async () => {
    if (feedback.length === 0) {
      toast.error('No feedback to export');
      return;
    }

    setExporting(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Feedback Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
            .feedback-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .category { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .bug { background: #fee2e2; color: #dc2626; }
            .improvement { background: #e0e7ff; color: #4f46e5; }
            .general_feedback { background: #f3f4f6; color: #374151; }
            .meta { color: #6b7280; font-size: 12px; }
            .user { font-weight: 500; color: #374151; }
            .message { margin-top: 8px; color: #1f2937; white-space: pre-wrap; }
            .footer { margin-top: 30px; color: #9ca3af; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>User Feedback Report</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          ${feedback.map(item => `
            <div class="feedback-item">
              <div class="header">
                <span class="category ${item.category}">${item.category === 'bug' ? 'Bug' : item.category === 'improvement' ? 'Improvement' : 'General Feedback'}</span>
                <span class="meta">${format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              <div class="user">Reported by: ${item.user_name}</div>
              <div class="message">${item.message}</div>
            </div>
          `).join('')}
          <div class="footer">FlowSert - Personnel Certificate Management</div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
      toast.success('PDF export ready');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'bug':
        return <Badge variant="destructive">Bug</Badge>;
      case 'improvement':
        return <Badge variant="secondary">Improvement</Badge>;
      case 'general_feedback':
        return <Badge variant="outline">General Feedback</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const feedbackContent = (
    <div className={embedded ? "px-4 pb-4 space-y-3" : undefined}>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">💬</div>
          <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(item.category)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Reported by: {item.user_name}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="shrink-0"
                  >
                    {deleting === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );

  if (embedded) return feedbackContent;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold">User Feedback</span>
            {feedback.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {feedback.length}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-3">
        {feedbackContent}
      </CollapsibleContent>
    </Collapsible>
  );
}
