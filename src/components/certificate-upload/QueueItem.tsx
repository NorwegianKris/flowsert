import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  FileText,
  RefreshCw,
  X,
  Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueuedFile } from './types';
import { ExtractionStatus } from '@/types/certificateExtraction';

interface QueueItemProps {
  item: QueuedFile;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  isProcessing: boolean;
}

export function QueueItem({ item, onRetry, onRemove, isProcessing }: QueueItemProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'complete':
        if (!item.result) return <Circle className="h-4 w-4 text-muted-foreground" />;
        return getExtractionStatusIcon(item.result.status);
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getExtractionStatusIcon = (status: ExtractionStatus) => {
    switch (status) {
      case 'green':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'amber':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBgClass = () => {
    if (item.status === 'complete' && item.result) {
      switch (item.result.status) {
        case 'green':
          return 'bg-green-500/10 border-green-500/20';
        case 'amber':
          return 'bg-amber-500/10 border-amber-500/20';
        case 'red':
          return 'bg-red-500/10 border-red-500/20';
      }
    }
    if (item.status === 'error') {
      return 'bg-destructive/10 border-destructive/20';
    }
    if (item.status === 'processing') {
      return 'bg-primary/5 border-primary/20';
    }
    return 'bg-muted/30 border-border';
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'complete':
        if (!item.result) return 'Complete';
        if (item.result.status === 'green') {
          return `Extracted (${item.result.confidence}%)`;
        } else if (item.result.status === 'amber') {
          return `Partial (${item.result.confidence}%)`;
        } else {
          return 'Manual entry needed';
        }
      case 'processing':
        return 'Analyzing...';
      case 'error':
        return item.error || 'Failed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const canRetry = item.status === 'error' || (item.status === 'complete' && item.result?.status === 'red');
  const canRemove = !isProcessing || item.status !== 'processing';

  return (
    <div className={cn(
      "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
      getStatusBgClass()
    )}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate font-medium">
            {item.file.name}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getStatusText()}
          {item.result?.extractedData?.certificateName && item.status === 'complete' && (
            <span className="ml-1">
              — {item.result.extractedData.certificateName}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {canRetry && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRetry(item.id)}
            disabled={isProcessing}
            title="Retry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onRemove(item.id)}
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
