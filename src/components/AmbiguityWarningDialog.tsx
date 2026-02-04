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
import { AlertTriangle } from "lucide-react";
import { getAmbiguityWarning } from "@/lib/certificateNormalization";

interface AmbiguityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  normalizedTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AmbiguityWarningDialog({
  open,
  onOpenChange,
  normalizedTitle,
  onConfirm,
  onCancel,
}: AmbiguityWarningDialogProps) {
  const warningMessage = getAmbiguityWarning(normalizedTitle);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Generic Certificate Name Detected
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{warningMessage}</p>
            <p className="text-sm">
              Creating an alias for generic names may cause incorrect automatic matching 
              in the future. Are you sure you want to remember this name?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            Create Alias Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
