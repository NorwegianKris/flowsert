import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Personnel } from '@/types';

interface EditPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel;
  onSuccess: () => void;
}

export function EditPersonnelDialog({ open, onOpenChange, personnel, onSuccess }: EditPersonnelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    location: '',
    nationality: '',
    gender: '',
    address: '',
    postalCode: '',
    postalAddress: '',
    nationalId: '',
    salaryAccountNumber: '',
    language: '',
  });

  useEffect(() => {
    if (open && personnel) {
      setFormData({
        name: personnel.name || '',
        email: personnel.email || '',
        phone: personnel.phone || '',
        role: personnel.role || '',
        location: personnel.location || '',
        nationality: personnel.nationality || '',
        gender: personnel.gender || '',
        address: personnel.address || '',
        postalCode: personnel.postalCode || '',
        postalAddress: personnel.postalAddress || '',
        nationalId: personnel.nationalId || '',
        salaryAccountNumber: personnel.salaryAccountNumber || '',
        language: personnel.language || 'Norwegian',
      });
    }
  }, [open, personnel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('personnel')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role.trim(),
          location: formData.location.trim(),
          nationality: formData.nationality.trim() || null,
          gender: formData.gender.trim() || null,
          address: formData.address.trim() || null,
          postal_code: formData.postalCode.trim() || null,
          postal_address: formData.postalAddress.trim() || null,
          national_id: formData.nationalId.trim() || null,
          salary_account_number: formData.salaryAccountNumber.trim() || null,
          language: formData.language.trim() || 'Norwegian',
        })
        .eq('id', personnel.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating personnel:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Personal Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+47 123 45 678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Job Role</Label>
              <Input
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Marine Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Oslo, Norway"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nationality">Nationality</Label>
              <Input
                id="edit-nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="Norwegian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender</Label>
              <Input
                id="edit-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="Male / Female / Other"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street name and number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postalCode">Postal Code</Label>
              <Input
                id="edit-postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postalAddress">Postal Address</Label>
              <Input
                id="edit-postalAddress"
                value={formData.postalAddress}
                onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nationalId">Norwegian ID Number</Label>
              <Input
                id="edit-nationalId"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="11 digits"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-salaryAccountNumber">Salary Account Number</Label>
              <Input
                id="edit-salaryAccountNumber"
                value={formData.salaryAccountNumber}
                onChange={(e) => setFormData({ ...formData, salaryAccountNumber: e.target.value })}
                placeholder="Bank account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">Language</Label>
              <Input
                id="edit-language"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                placeholder="Norwegian"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
