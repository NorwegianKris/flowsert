import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface DataProcessingAcknowledgementDialogProps {
  open: boolean;
  companyName: string;
  onAcknowledge: () => Promise<boolean>;
}

export function DataProcessingAcknowledgementDialog({
  open,
  companyName,
  onAcknowledge,
}: DataProcessingAcknowledgementDialogProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    setSubmitting(true);
    await onAcknowledge();
    setSubmitting(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Handling of personal data and documentation</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                This system is used by <strong className="text-foreground">{companyName}</strong> to manage personnel qualifications and certificates required for work assignments.
              </p>
              <p>
                The company will store and process your personal information and uploaded documentation in accordance with applicable data protection laws (GDPR).
              </p>
              <p>
                Your data is only accessible to authorized personnel within the company and is used solely for compliance, safety, and operational purposes.
              </p>
              <p>
                FlowSert acts as a data processor on behalf of the company.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-start space-x-3 py-2">
          <Checkbox
            id="gdpr-ack"
            checked={checked}
            onCheckedChange={(val) => setChecked(val === true)}
          />
          <Label htmlFor="gdpr-ack" className="text-sm leading-snug cursor-pointer">
            I confirm that I have read and understood this information
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleContinue}
            disabled={!checked || submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
