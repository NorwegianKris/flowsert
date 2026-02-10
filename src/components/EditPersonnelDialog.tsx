import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Camera } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Personnel } from '@/types';
import { useWorkerCategories } from '@/hooks/useWorkerCategories';
import { useDepartments } from '@/hooks/useDepartments';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { MultiSelectInput } from '@/components/ui/multi-select-input';
import { useLocations, useNationalities, useLanguages } from '@/hooks/useLocations';
import { normalizeText } from '@/lib/stringUtils';

interface EditPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: Personnel;
  onSuccess: () => void;
}

export function EditPersonnelDialog({ open, onOpenChange, personnel, onSuccess }: EditPersonnelDialogProps) {
  const { categories: workerCategories, loading: categoriesLoading } = useWorkerCategories();
  const { departments, loading: departmentsLoading } = useDepartments();
  const { locations } = useLocations();
  const { nationalities } = useNationalities();
  const { languages } = useLanguages();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if this is a freelancer profile
  const isFreelancer = personnel.category === 'freelancer';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    location: '',
    category: 'employee' as 'employee' | 'freelancer',
    nationality: '',
    department: '',
    gender: '',
    address: '',
    postalCode: '',
    postalAddress: '',
    nationalId: '',
    salaryAccountNumber: '',
    languages: [] as string[],
    nextOfKinName: '',
    nextOfKinRelation: '',
    nextOfKinPhone: '',
    bio: '',
  });

  useEffect(() => {
    if (open && personnel) {
      setFormData({
        name: personnel.name || '',
        email: personnel.email || '',
        phone: personnel.phone || '',
        role: personnel.role || '',
        location: personnel.location || '',
        category: (personnel.category === 'employee' || personnel.category === 'freelancer') ? personnel.category : 'employee',
        nationality: personnel.nationality || '',
        department: personnel.department || '',
        gender: personnel.gender || '',
        address: personnel.address || '',
        postalCode: personnel.postalCode || '',
        postalAddress: personnel.postalAddress || '',
        nationalId: personnel.nationalId || '',
        salaryAccountNumber: personnel.salaryAccountNumber || '',
        languages: personnel.language ? personnel.language.split(', ').filter(Boolean) : ['Norwegian'],
        nextOfKinName: personnel.nextOfKinName || '',
        nextOfKinRelation: personnel.nextOfKinRelation || '',
        nextOfKinPhone: personnel.nextOfKinPhone || '',
        bio: personnel.bio || '',
      });
      setAvatarUrl(personnel.avatarUrl || null);
    }
  }, [open, personnel]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${personnel.id}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update personnel record with avatar URL
      const { error: updateError } = await supabase
        .from('personnel')
        .update({ avatar_url: publicUrl })
        .eq('id', personnel.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = personnel.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

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
          location: normalizeText(formData.location) || null,
          category: formData.category,
          nationality: normalizeText(formData.nationality) || null,
          department: formData.department.trim() || null,
          gender: formData.gender.trim() || null,
          address: formData.address.trim() || null,
          postal_code: formData.postalCode.trim() || null,
          postal_address: formData.postalAddress.trim() || null,
          national_id: formData.nationalId.trim() || null,
          salary_account_number: formData.salaryAccountNumber.trim() || null,
          language: formData.languages.length > 0 ? formData.languages.join(', ') : 'Norwegian',
          next_of_kin_name: formData.nextOfKinName.trim() || null,
          next_of_kin_relation: formData.nextOfKinRelation.trim() || null,
          next_of_kin_phone: formData.nextOfKinPhone.trim() || null,
          bio: formData.bio.trim() || null,
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
          {/* Avatar Upload Section */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={personnel.name} />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Picture</p>
              <p className="text-xs text-muted-foreground">Click the camera icon to upload</p>
            </div>
          </div>
          
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
              <Label htmlFor="edit-role">Job Role *</Label>
              {workerCategories.length > 0 ? (
                <Select
                  value={workerCategories.some(c => c.name === formData.role) ? formData.role : ''}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder={formData.role && !workerCategories.some(c => c.name === formData.role) ? `${formData.role} (please update)` : "Select a job role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workerCategories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="edit-role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="Marine Engineer"
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location *</Label>
              <AutocompleteInput
                id="edit-location"
                options={locations}
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value })}
                placeholder="Oslo, Norway"
              />
            </div>
            {/* Category - locked for freelancers */}
            {!isFreelancer && (
              <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: 'employee' | 'freelancer') => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-nationality">Nationality *</Label>
              <AutocompleteInput
                id="edit-nationality"
                options={nationalities}
                value={formData.nationality}
                onChange={(value) => setFormData({ ...formData, nationality: value })}
                placeholder="Norwegian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              {departments.length > 0 ? (
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  disabled={departmentsLoading}
                >
                  <SelectTrigger id="edit-department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                  disabled
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gender">Gender *</Label>
              <Input
                id="edit-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="Male / Female / Other"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street name and number"
              />
              <p className="text-xs text-muted-foreground">*not mandatory</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-postalCode">Postal Code</Label>
              <Input
                id="edit-postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="0001"
              />
              <p className="text-xs text-muted-foreground">*not mandatory</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-postalAddress">Postal Address</Label>
              <Input
                id="edit-postalAddress"
                value={formData.postalAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  const shouldAutoFillLocation = (!formData.location || formData.location === 'Not specified') && value.trim();
                  setFormData(prev => ({
                    ...prev,
                    postalAddress: value,
                    location: shouldAutoFillLocation ? value.trim() : prev.location
                  }));
                  if (shouldAutoFillLocation && value.trim()) {
                    toast.info('Location auto-filled from postal address');
                  }
                }}
                placeholder="City, Country"
              />
              <p className="text-xs text-muted-foreground">*not mandatory</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">Languages</Label>
              <MultiSelectInput
                id="edit-language"
                options={languages}
                value={formData.languages}
                onChange={(value) => setFormData({ ...formData, languages: value })}
                placeholder="Select languages..."
              />
            </div>
          </div>
          {/* Bio Section - only for freelancers */}
          {isFreelancer && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground mb-2">Tell me about yourself</h3>
              <p className="text-xs text-muted-foreground mb-3">Write freely about why you're applying for a job and what makes you a great candidate.</p>
              <Textarea
                id="edit-bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="I am an experienced professional with a passion for..."
                rows={5}
              />
            </div>
          )}

          {/* Next of Kin Section - hidden for freelancers */}
          {!isFreelancer && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-foreground mb-4">Next of Kin</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nextOfKinName">Name</Label>
                  <Input
                    id="edit-nextOfKinName"
                    value={formData.nextOfKinName}
                    onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nextOfKinRelation">Relation</Label>
                  <Input
                    id="edit-nextOfKinRelation"
                    value={formData.nextOfKinRelation}
                    onChange={(e) => setFormData({ ...formData, nextOfKinRelation: e.target.value })}
                    placeholder="Spouse, Parent, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nextOfKinPhone">Phone Number</Label>
                  <Input
                    id="edit-nextOfKinPhone"
                    value={formData.nextOfKinPhone}
                    onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                    placeholder="+47 123 45 678"
                  />
                </div>
              </div>
            </div>
          )}
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
