import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Health & Safety',
  'First Aid & Medical',
  'Lifting & Rigging',
  'Electrical',
  'Welding',
  'Mechanical',
  'NDT / Inspection',
  'Diving',
  'Maritime / STCW',
  'Crane & Heavy Equipment',
  'Scaffolding',
  'Rope Access & Working at Heights',
  'Hazardous Materials & Chemicals',
  'Fire Safety & Emergency Response',
  'Management & Supervision',
  'Trade Certifications',
  'Regulatory / Compliance',
  'Driver & Operator Licenses',
  'Other',
];

interface CertificateCategoryOnboardingProps {
  businessId: string;
  onComplete: () => void;
}

export function CertificateCategoryOnboarding({ businessId, onComplete }: CertificateCategoryOnboardingProps) {
  const [open, setOpen] = useState(false);

  const storageKey = `flowsert_category_onboarding_dismissed_${businessId}`;

  useEffect(() => {
    // Clean up broken keys from before the fix
    localStorage.removeItem('flowsert_category_onboarding_dismissed_undefined');
    localStorage.removeItem('flowsert_category_onboarding_dismissed_');

    if (!businessId) return;
    if (localStorage.getItem(storageKey)) return;
    setOpen(true);
  }, [businessId, storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
    onComplete();
  };

  if (!businessId) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Your certificate categories are ready</DialogTitle>
          <DialogDescription className="text-base pt-2">
            We've set up 19 default categories to organize your team's certificates. You can add, rename, or remove these anytime in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 py-2">
          {DEFAULT_CATEGORIES.map((category) => (
            <div
              key={category}
              className="px-2 py-1.5 rounded-md bg-muted/50 text-sm"
            >
              {category}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleDismiss} className="w-full">
            Got it, continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
