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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FolderOpen, Plus } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Health & Safety',
  'Diving',
  'Lifting & Rigging',
  'Electrical',
  'Welding',
  'First Aid & Medical',
  'Maritime',
  'Mechanical',
  'NDT / Inspection',
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
  const [selectedDefaults, setSelectedDefaults] = useState<Set<string>>(new Set());
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [saving, setSaving] = useState(false);

  const storageKey = `flowsert_category_onboarding_dismissed_${businessId}`;

  useEffect(() => {
    if (!businessId) return;

    // If already dismissed, don't show
    if (localStorage.getItem(storageKey)) return;

    // Check if business already has categories
    const checkCategories = async () => {
      const { count, error } = await supabase
        .from('certificate_categories')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (error) {
        console.error('Error checking categories:', error);
        return;
      }

      if (count === 0) {
        setOpen(true);
      }
    };

    checkCategories();
  }, [businessId, storageKey]);

  const toggleDefault = (category: string) => {
    setSelectedDefaults((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Check for duplicates against defaults and existing custom (case-insensitive)
    const lowerTrimmed = trimmed.toLowerCase();
    const isDuplicateDefault = DEFAULT_CATEGORIES.some((c) => c.toLowerCase() === lowerTrimmed);
    const isDuplicateCustom = customCategories.some((c) => c.toLowerCase() === lowerTrimmed);

    if (isDuplicateDefault) {
      // Auto-select the default instead
      setSelectedDefaults((prev) => new Set(prev).add(
        DEFAULT_CATEGORIES.find((c) => c.toLowerCase() === lowerTrimmed)!
      ));
      setCustomInput('');
      return;
    }

    if (isDuplicateCustom) {
      setCustomInput('');
      return;
    }

    setCustomCategories((prev) => [...prev, trimmed]);
    setCustomInput('');
  };

  const removeCustom = (index: number) => {
    setCustomCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const allSelected = [
      ...Array.from(selectedDefaults),
      ...customCategories,
    ];

    if (allSelected.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    setSaving(true);
    try {
      const rows = allSelected.map((name) => ({
        business_id: businessId,
        name,
      }));

      const { error } = await supabase
        .from('certificate_categories')
        .insert(rows);

      if (error) throw error;

      localStorage.setItem(storageKey, 'true');
      toast.success(`${allSelected.length} categories created`);
      setOpen(false);
      onComplete();
    } catch (error) {
      console.error('Error saving categories:', error);
      toast.error('Failed to save categories');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    setOpen(false);
  };

  const totalSelected = selectedDefaults.size + customCategories.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Set up your certificate categories</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Select the categories relevant to your business. You can always add, edit, or remove these later in Settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Default categories grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_CATEGORIES.map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedDefaults.has(category)}
                  onCheckedChange={() => toggleDefault(category)}
                />
                <span className="text-sm">{category}</span>
              </label>
            ))}
          </div>

          {/* Custom categories */}
          {customCategories.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Custom categories:</p>
              <div className="flex flex-wrap gap-2">
                {customCategories.map((cat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-sm"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCustom(i)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Add custom input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a custom category"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <Button onClick={handleSave} disabled={saving || totalSelected === 0} className="w-full">
            {saving ? 'Saving…' : `Save & Continue (${totalSelected})`}
          </Button>
          <div className="flex items-center justify-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={dontShowAgain}
                onCheckedChange={(v) => setDontShowAgain(!!v)}
              />
              <span className="text-xs text-muted-foreground">Don't show again</span>
            </label>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Skip for now
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
