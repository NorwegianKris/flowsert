import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, User, Mail, Copy, Check, Link } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';

interface AddPersonnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonnelAdded: () => void;
}

export function AddPersonnelDialog({ open, onOpenChange, onPersonnelAdded }: AddPersonnelDialogProps) {
  const { businessId, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Invitation state
  const [sendInvitation, setSendInvitation] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    location: '',
    category: 'fixed_employee' as 'fixed_employee' | 'freelancer',
    nationality: '',
    gender: '',
    address: '',
    postalCode: '',
    postalAddress: '',
    nationalId: '',
    salaryAccountNumber: '',
    language: 'Norwegian',
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (personnelId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${personnelId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const initials = formData.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied to clipboard');
  };

  const resetForm = () => {
    setFormData({ 
      name: '', email: '', phone: '', role: '', location: '',
      category: 'fixed_employee',
      nationality: '', gender: '', address: '', postalCode: '', 
      postalAddress: '', nationalId: '', salaryAccountNumber: '', language: 'Norwegian'
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setSendInvitation(false);
    setInviteLink('');
    setCopied(false);
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

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
      const { data: newPersonnel, error } = await supabase.from('personnel').insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role.trim(),
        location: formData.location.trim(),
        category: formData.category,
        nationality: formData.nationality.trim() || null,
        gender: formData.gender.trim() || null,
        address: formData.address.trim() || null,
        postal_code: formData.postalCode.trim() || null,
        postal_address: formData.postalAddress.trim() || null,
        national_id: formData.nationalId.trim() || null,
        salary_account_number: formData.salaryAccountNumber.trim() || null,
        language: formData.language.trim() || 'Norwegian',
        business_id: businessId,
      }).select('id').single();

      if (error) throw error;

      // Upload avatar if selected
      if (avatarFile && newPersonnel) {
        const avatarUrl = await uploadAvatar(newPersonnel.id);
        if (avatarUrl) {
          await supabase.from('personnel')
            .update({ avatar_url: avatarUrl })
            .eq('id', newPersonnel.id);
        }
      }

      // Send invitation if checkbox is checked
      if (sendInvitation && newPersonnel) {
        const { data: inviteData, error: insertError } = await supabase
          .from('invitations')
          .insert({
            business_id: businessId,
            personnel_id: newPersonnel.id,
            email: formData.email.toLowerCase().trim(),
            invited_by: user?.id,
          })
          .select('token')
          .single();

        if (insertError) {
          console.error('Error creating invitation:', insertError);
          toast.error('Personnel created but invitation failed');
        } else {
          const signupUrl = `${window.location.origin}/auth?token=${inviteData.token}`;
          setInviteLink(signupUrl);

          // Send invitation email
          const { error: emailError } = await supabase.functions.invoke('send-invitation', {
            body: {
              to: formData.email.toLowerCase().trim(),
              workerName: formData.name.trim(),
              inviteLink: signupUrl,
            },
          });

          if (emailError) {
            console.error('Failed to send email:', emailError);
            toast.success('Personnel created. Email could not be sent - please share the link manually.');
          } else {
            toast.success(`Personnel created and invitation sent to ${formData.email}`);
          }
        }
      } else {
        toast.success('Personnel record created successfully');
        resetForm();
        onOpenChange(false);
      }

      onPersonnelAdded();
    } catch (error: any) {
      console.error('Error creating personnel:', error);
      toast.error(error.message || 'Failed to create personnel record');
    } finally {
      setLoading(false);
    }
  };

  // Show invite link success screen
  if (inviteLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invitation Sent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{formData.name}</strong> has been added and an invitation email has been sent.
            </p>
            <div className="space-y-2">
              <Label>Worker Email</Label>
              <p className="text-sm text-muted-foreground">{formData.email}</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Signup Link
              </Label>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The worker must sign up with the exact email address: <strong>{formData.email}</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Personnel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <div 
              className="relative cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-20 w-20 border-2 border-border">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Preview" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {initials || <User className="h-8 w-8" />}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <span className="text-sm text-muted-foreground">Click to upload photo</span>
          </div>

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
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: 'fixed_employee' | 'freelancer') => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_employee">Fixed Employee</SelectItem>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Invite Worker Section */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="sendInvitation" 
                checked={sendInvitation}
                onCheckedChange={(checked) => setSendInvitation(checked === true)}
              />
              <div className="space-y-1">
                <Label htmlFor="sendInvitation" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  Send invitation to create account
                </Label>
                <p className="text-xs text-muted-foreground">
                  An email with a signup link will be sent to {formData.email || 'the email above'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="active" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {sendInvitation ? 'Add & Send Invitation' : 'Add Personnel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
