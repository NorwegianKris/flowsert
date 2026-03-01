import { useRef } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
  dragActive: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  hasFiles: boolean;
  maxFiles: number;
  currentCount: number;
}

export function UploadZone({
  onFilesSelected,
  disabled = false,
  dragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  hasFiles,
  maxFiles,
  currentCount,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const remainingSlots = maxFiles - currentCount;

  // Compact "Add more" button when files exist
  if (hasFiles) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || remainingSlots <= 0}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled || remainingSlots <= 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add more files
          {remainingSlots > 0 && (
            <span className="text-muted-foreground">
              ({remainingSlots} left)
            </span>
          )}
        </Button>
      </>
    );
  }

  // Full upload zone when no files
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <div
        className={cn(
          "relative p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
          dragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50 bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={handleClick}
      >
        <div className="text-center">
          <Sparkles className="h-8 w-8 mx-auto text-primary mb-2" />
          <h3 className="font-medium text-foreground">Smart Upload</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your certificate(s) and we'll extract the details automatically
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Select up to {maxFiles} files • PDF, JPEG, PNG, WebP • Drag & drop or click
          </p>
          <div className="flex items-center justify-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5 mt-2">
            <span className="text-sm">💡</span>
            <span className="text-xs text-muted-foreground">Make sure your upload(s) is a clear photo, scan, or document for best results.</span>
          </div>
        </div>
      </div>
    </>
  );
}
