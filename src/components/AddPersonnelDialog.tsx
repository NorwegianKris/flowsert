import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface AddPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelAdded: () => void;
}

export function AddPersonnelDialog({ open, onOpenChange, onPersonnelAdded }: AddPersonnelDialogProps) {
  const { businessId } = useAuth();
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
    language: 'Norwegian',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!businessId) {
      toast.error('No business found');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.role.trim() || !formData.location.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('personnel').insert({
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
        business_id: businessId,
      });

      if (error) throw error;

      toast.success('Personnel record created successfully');
      setFormData({ 
        name: '', email: '', phone: '', role: '', location: '',
        nationality: '', gender: '', address: '', postalCode: '', 
        postalAddress: '', nationalId: '', salaryAccountNumber: '', language: 'Norwegian'
      });
      onOpenChange(false);
      onPersonnelAdded();
    } catch (error: any) {
      console.error('Error creating personnel:', error);
      toast.error(error.message || 'Failed to create personnel record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+47 123 45 678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Job Role *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Marine Engineer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Oslo, Norway"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                placeholder="Norwegian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Input
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="Male / Female / Other"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street name and number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="0001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalAddress">Postal Address</Label>
              <Input
                id="postalAddress"
                value={formData.postalAddress}
                onChange={(e) => setFormData({ ...formData, postalAddress: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationalId">Norwegian ID Number</Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="11 digits"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryAccountNumber">Salary Account Number</Label>
              <Input
                id="salaryAccountNumber"
                value={formData.salaryAccountNumber}
                onChange={(e) => setFormData({ ...formData, salaryAccountNumber: e.target.value })}
                placeholder="Bank account number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
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
              Add Personnel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
