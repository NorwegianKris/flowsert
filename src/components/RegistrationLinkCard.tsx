import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { Copy, Check, ExternalLink, Link2, QrCode } from 'lucide-react';
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
  const { business, loading } = useBusinessInfo();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const companyCode = business?.company_code || '';
  
  // Get clean URL for display - handle preview URLs
  const getDisplayUrl = () => {
    const origin = window.location.origin;
    // If on preview, show the published lovable.app URL
    if (origin.includes('id-preview--')) {
      // Extract project ID and construct published URL
      const match = origin.match(/id-preview--([^.]+)/);
      if (match) {
        return `https://${match[1]}.lovable.app`;
      }
    }
    if (origin.includes('-preview--')) {
      return origin.replace('-preview--', '');
    }
    return origin;
  };
  
  const displayUrl = getDisplayUrl();
  const registrationUrl = `${displayUrl}/register/jobseeker/${companyCode}`;
  
  // Use actual origin for opening/testing
  const actualUrl = `${window.location.origin}/register/jobseeker/${companyCode}`;

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
                onClick={() => window.open(actualUrl, '_blank')}
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

          <p className="text-xs text-muted-foreground">
            Job seekers can use this link to register and be automatically associated with your company.
          </p>
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
          <div className="flex justify-center py-4">
            <img
              src={getQrCodeUrl()}
              alt="QR Code"
              className="w-48 h-48 border rounded-lg"
            />
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