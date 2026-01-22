import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Check, ExternalLink, Link2, QrCode, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function RegistrationLinkCard() {
  const { business, loading, refetch } = useBusinessInfo();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const companyCode = business?.company_code || '';
  const savedDomain = business?.custom_domain || '';
  
  // Use custom domain if set, otherwise fallback to current origin
  const getBaseUrl = () => {
    if (savedDomain) {
      // Ensure proper format
      const domain = savedDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${domain}`;
    }
    return window.location.origin;
  };
  
  const baseUrl = getBaseUrl();
  const registrationUrl = `${baseUrl}/register/jobseeker/${companyCode}`;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
      toast({
        title: 'Copied!',
        description: type === 'code' ? 'Company code copied to clipboard.' : 'Registration link copied to clipboard.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy to clipboard.',
      });
    }
  };

  const getQrCodeUrl = () => {
    const url = encodeURIComponent(registrationUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url}`;
  };

  const handleSaveDomain = async () => {
    if (!business?.id) return;
    
    setIsSaving(true);
    try {
      // Clean the domain input
      const cleanDomain = customDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      const { error } = await (supabase as any)
        .from('businesses')
        .update({ custom_domain: cleanDomain || null })
        .eq('id', business.id);

      if (error) throw error;

      toast({
        title: 'Domain Saved',
        description: cleanDomain 
          ? 'Your custom domain has been saved. The registration link and QR code will now use this domain.'
          : 'Custom domain removed.',
      });
      
      await refetch();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving custom domain:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save custom domain.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    setCustomDomain(savedDomain);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-20 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!companyCode) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Job Seeker Registration Link
          </CardTitle>
          <CardDescription>
            Share this link with job seekers to let them register for your company profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Custom Domain Setting */}
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Custom Domain (optional)</Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  id="custom-domain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="e.g., flowsert.com"
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSaveDomain}
                  disabled={isSaving}
                  title="Save domain"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  id="custom-domain-display"
                  value={savedDomain || 'Not set'}
                  readOnly
                  className="text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                >
                  {savedDomain ? 'Edit' : 'Set Domain'}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Set your custom domain so the registration link and QR code work correctly.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-code">Company Code</Label>
            <div className="flex items-center gap-2">
              <Input
                id="company-code"
                value={companyCode}
                readOnly
                className="font-mono bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(companyCode, 'code')}
                title="Copy code"
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registration-link">Registration Link</Label>
            <div className="flex items-center gap-2">
              <Input
                id="registration-link"
                value={registrationUrl}
                readOnly
                className="text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(registrationUrl, 'link')}
                title="Copy link"
              >
                {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(registrationUrl, '_blank')}
                title="Open link"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowQr(true)}
                title="Show QR code"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!savedDomain && (
            <p className="text-xs text-amber-600">
              ⚠️ Set your custom domain above to ensure the QR code works correctly when scanned.
            </p>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <AlertDialog open={showQr} onOpenChange={setShowQr}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registration QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Scan this QR code to access the job seeker signup page for {business?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col items-center gap-2 py-4">
            <img
              src={getQrCodeUrl()}
              alt="QR Code"
              className="w-48 h-48 border rounded-lg"
            />
            <p className="text-xs text-muted-foreground text-center max-w-[200px] break-all">
              {registrationUrl}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const link = document.createElement('a');
                link.href = getQrCodeUrl();
                link.download = `${business?.name || 'company'}-registration-qr.png`;
                link.click();
              }}
            >
              Download
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
