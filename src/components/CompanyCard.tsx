import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Loader2, Upload, Building2, FileText, Trash2, Download, ExternalLink,
  Phone, Mail, Globe, MapPin, Hash
} from 'lucide-react';
import { getSignedUrl } from '@/lib/storageUtils';

interface BusinessInfo {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  postal_address: string | null;
  website: string | null;
  org_number: string | null;
  description: string | null;
  logo_url: string | null;
}

interface BusinessDocument {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  signedUrl?: string;
}

interface CompanyCardProps {
  isAdmin?: boolean;
  onClose?: () => void;
  businessId?: string;
}

export function CompanyCard({ isAdmin = false, onClose, businessId: businessIdProp }: CompanyCardProps) {
  const { businessId: authBusinessId } = useAuth();
  const businessId = businessIdProp || authBusinessId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    postal_code: '',
    postal_address: '',
    website: '',
    org_number: '',
    description: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (businessId) {
      fetchBusinessInfo();
      fetchDocuments();
    }
  }, [businessId]);

  const fetchBusinessInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      // Type assertion for the new columns
      const business = data as BusinessInfo;
      setBusinessInfo(business);
      setFormData({
        name: business.name || '',
        phone: business.phone || '',
        email: business.email || '',
        address: business.address || '',
        postal_code: business.postal_code || '',
        postal_address: business.postal_address || '',
        website: business.website || '',
        org_number: business.org_number || '',
        description: business.description || '',
      });
      setLogoPreview(business.logo_url);
    } catch (error) {
      console.error('Error fetching business info:', error);
      toast.error('Failed to load business information');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each document
      const docsWithUrls = await Promise.all(
        (data || []).map(async (doc) => {
          const signedUrl = await getSignedUrl('business-documents', doc.file_url);
          return { ...doc, signedUrl };
        })
      );

      setDocuments(docsWithUrls as BusinessDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !businessId) return null;

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${businessId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, logoFile, { upsert: true });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    try {
      let logoUrl = businessInfo?.logo_url;
      
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) logoUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          postal_address: formData.postal_address.trim() || null,
          website: formData.website.trim() || null,
          org_number: formData.org_number.trim() || null,
          description: formData.description.trim() || null,
          logo_url: logoUrl,
        })
        .eq('id', businessId);

      if (error) throw error;

      toast.success('Business information saved');
      setLogoFile(null);
      fetchBusinessInfo();
    } catch (error: any) {
      console.error('Error saving business info:', error);
      toast.error(error.message || 'Failed to save business information');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('business-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('business_documents')
        .insert({
          business_id: businessId,
          name: file.name,
          file_url: fileName,
          file_type: file.type,
          file_size: file.size,
        });

      if (insertError) throw insertError;

      toast.success('Document uploaded');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: BusinessDocument) => {
    try {
      const { error: deleteStorageError } = await supabase.storage
        .from('business-documents')
        .remove([doc.file_url]);

      if (deleteStorageError) {
        console.error('Storage delete error:', deleteStorageError);
      }

      const { error: deleteDbError } = await supabase
        .from('business_documents')
        .delete()
        .eq('id', doc.id);

      if (deleteDbError) throw deleteDbError;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(error.message || 'Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const initials = formData.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Read-only view for workers
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-border">
            {logoPreview ? (
              <AvatarImage src={logoPreview} alt="Company logo" />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials || <Building2 className="h-6 w-6" />}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{businessInfo?.name || 'Company'}</h2>
            {businessInfo?.description && (
              <p className="text-muted-foreground text-sm mt-1">{businessInfo.description}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {businessInfo?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${businessInfo.email}`} className="text-primary hover:underline">
                {businessInfo.email}
              </a>
            </div>
          )}
          {businessInfo?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${businessInfo.phone}`} className="text-primary hover:underline">
                {businessInfo.phone}
              </a>
            </div>
          )}
          {businessInfo?.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <a href={businessInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                {businessInfo.website} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {businessInfo?.org_number && (
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span>Org: {businessInfo.org_number}</span>
            </div>
          )}
          {(businessInfo?.address || businessInfo?.postal_code || businessInfo?.postal_address) && (
            <div className="flex items-start gap-2 text-sm sm:col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                {businessInfo.address && <div>{businessInfo.address}</div>}
                {(businessInfo.postal_code || businessInfo.postal_address) && (
                  <div>{[businessInfo.postal_code, businessInfo.postal_address].filter(Boolean).join(' ')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {documents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Shared Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{doc.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatFileSize(doc.file_size)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => doc.signedUrl && window.open(doc.signedUrl, '_blank')}
                    disabled={!doc.signedUrl}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin edit view
  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="info" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Information
        </TabsTrigger>
        <TabsTrigger value="documents" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documents
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-4">
        {/* Logo Upload */}
        <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
          <div 
            className="relative cursor-pointer group"
            onClick={() => logoInputRef.current?.click()}
          >
            <Avatar className="h-20 w-20 border-2 border-border">
              {logoPreview ? (
                <AvatarImage src={logoPreview} alt="Company logo" />
              ) : (
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials || <Building2 className="h-8 w-8" />}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoSelect}
            className="hidden"
          />
          <span className="text-sm text-muted-foreground">Click to upload logo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Company Name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contact@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+47 123 45 678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_number">Organization Number</Label>
            <Input
              id="org_number"
              value={formData.org_number}
              onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
              placeholder="123 456 789"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street name and number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="0001"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="postal_address">City / Postal Address</Label>
            <Input
              id="postal_address"
              value={formData.postal_address}
              onChange={(e) => setFormData({ ...formData, postal_address: e.target.value })}
              placeholder="Oslo, Norway"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your company..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !formData.name.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="documents" className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload documents that will be shared with all workers in your company.
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload Document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleDocumentUpload}
            className="hidden"
          />
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📋</div>
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => doc.signedUrl && window.open(doc.signedUrl, '_blank')}
                    disabled={!doc.signedUrl}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDocument(doc)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}