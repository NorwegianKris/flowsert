import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface NotificationDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationDialog({ notification, open, onOpenChange }: NotificationDialogProps) {
  if (!notification) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{notification.subject}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {format(new Date(notification.created_at), 'PPP')} at {format(new Date(notification.created_at), 'p')}
            </span>
            {notification.read_at && (
              <Badge variant="secondary" className="text-xs">
                Read
              </Badge>
            )}
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{notification.message}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
