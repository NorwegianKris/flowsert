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

interface RegistrationLinkCardProps {
  embedded?: boolean;
}

export function RegistrationLinkCard({ embedded }: RegistrationLinkCardProps) {
  const { business, loading } = useBusinessInfo();
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const companyCode = business?.company_code || '';
  const registrationUrl = `https://flowsert.com/register/freelancer/${companyCode}`;

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
    if (embedded) {
      return <div className="h-20 animate-pulse bg-muted rounded p-4" />;
    }
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

  const innerContent = (
    <div className={embedded ? "space-y-4 p-4" : undefined}>
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

      <p className="text-xs text-muted-foreground">
        Freelancers can use this link to register and be automatically associated with your company.
      </p>
    </div>
  );

  return (
    <>
      {embedded ? (
        innerContent
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Freelancer Registration Link
            </CardTitle>
            <CardDescription>
              Share this link with freelancers to let them register for your company profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {innerContent}
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      <AlertDialog open={showQr} onOpenChange={setShowQr}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registration QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Scan this QR code to access the freelancer signup page for {business?.name}.
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
