import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trash2 } from 'lucide-react';
import { QueuedFile } from './types';
import { QueueItem } from './QueueItem';

interface ProcessingQueueProps {
  queue: QueuedFile[];
  isProcessing: boolean;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export function ProcessingQueue({
  queue,
  isProcessing,
  onRetry,
  onRemove,
  onClearAll,
}: ProcessingQueueProps) {
  if (queue.length === 0) return null;

  const completedCount = queue.filter(f => f.status === 'complete').length;
  const errorCount = queue.filter(f => f.status === 'error').length;
  const totalCount = queue.length;
  const progressPercent = totalCount > 0 ? ((completedCount + errorCount) / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Header with progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              Processing Queue ({completedCount} of {totalCount} complete)
            </span>
            {!isProcessing && queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 gap-1 text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {queue.map((item) => (
          <QueueItem
            key={item.id}
            item={item}
            onRetry={onRetry}
            onRemove={onRemove}
            isProcessing={isProcessing}
          />
        ))}
      </div>
    </div>
  );
}
