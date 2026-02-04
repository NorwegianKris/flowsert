import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface BulkUpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleNormalized: string;
  targetTypeName: string;
  certificateCount: number;
  createAlias: boolean;
  onCreateAliasChange: (checked: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const MAX_BATCH_SIZE = 500;

export function BulkUpdateConfirmDialog({
  open,
  onOpenChange,
  titleNormalized,
  targetTypeName,
  certificateCount,
  createAlias,
  onCreateAliasChange,
  onConfirm,
  isLoading,
}: BulkUpdateConfirmDialogProps) {
  const exceedsLimit = certificateCount > MAX_BATCH_SIZE;
  const batchCount = Math.ceil(certificateCount / MAX_BATCH_SIZE);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Bulk Update</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This will update <strong>{certificateCount}</strong> certificate
                {certificateCount !== 1 ? "s" : ""}:
              </p>

              <div className="rounded-md bg-muted p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Normalized title:</span>
                  <span className="font-medium">{titleNormalized}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New type:</span>
                  <span className="font-medium">{targetTypeName}</span>
                </div>
              </div>

              {exceedsLimit && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/30">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">
                      Large batch detected
                    </p>
                    <p className="text-muted-foreground mt-1">
                      This will be processed in {batchCount} batches of up to {MAX_BATCH_SIZE}{" "}
                      certificates each. You'll be asked to confirm each batch.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="create-alias"
                  checked={createAlias}
                  onCheckedChange={(checked) => onCreateAliasChange(checked === true)}
                />
                <Label htmlFor="create-alias" className="text-sm">
                  Create alias for future auto-matching
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : exceedsLimit ? (
              `Update in ${batchCount} batches`
            ) : (
              `Update ${certificateCount} record${certificateCount !== 1 ? "s" : ""}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { MAX_BATCH_SIZE };
