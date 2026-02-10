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
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, FileText, User, Award } from 'lucide-react';

interface WelcomeDialogProps {
  personnelId: string | undefined;
  businessId: string | null | undefined;
  isFreelancer?: boolean;
}

export function WelcomeDialog({ personnelId, businessId, isFreelancer = false }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState<string>('');

  useEffect(() => {
    if (!personnelId) return;

    // Check if we've already shown the welcome dialog
    const welcomeShown = localStorage.getItem(`flowsert_welcome_shown_${personnelId}`);
    
    if (!welcomeShown) {
      setOpen(true);
    }
  }, [personnelId]);

  useEffect(() => {
    async function fetchBusinessName() {
      if (!businessId) return;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', businessId)
        .single();
      
      if (!error && data) {
        setBusinessName(data.name);
      }
    }
    
    if (open && businessId) {
      fetchBusinessName();
    }
  }, [open, businessId]);

  const handleClose = () => {
    if (personnelId) {
      localStorage.setItem(`flowsert_welcome_shown_${personnelId}`, 'true');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Welcome to {businessName ? `${businessName}'s` : 'the'} Flowsert System!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your account has been successfully created. To get started, please complete the following:
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Complete Your Profile</p>
              <p className="text-xs text-muted-foreground">
                {isFreelancer 
                  ? 'Fill in your personal information and contact details.'
                  : 'Fill in your personal information, contact details, and next of kin.'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Award className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Upload Certificates</p>
              <p className="text-xs text-muted-foreground">
                Add your relevant certifications with expiry dates.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Upload Documentation</p>
              <p className="text-xs text-muted-foreground">
                Add any required documents such as ID, contracts, or training records.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
