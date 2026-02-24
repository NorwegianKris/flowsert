import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { needsConsent, TERMS_VERSION, PRIVACY_VERSION } from '@/lib/legalVersions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicFooter } from '@/components/PublicFooter';

export default function Consent() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Account Setup Incomplete</CardTitle>
              <CardDescription>
                Your account setup is incomplete. Please sign out and contact support.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button className="w-full" onClick={() => signOut()}>
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!needsConsent(profile)) {
    return <Navigate to="/" replace />;
  }

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Consent update failed:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to save consent',
        description: error.message || 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-rajdhani">Before you continue</CardTitle>
            <CardDescription>
              Please review and accept our terms to continue using FlowSert.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent-checkbox"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="consent-checkbox" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={!agreed || submitting}
              onClick={handleAccept}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </CardFooter>
        </Card>
      </div>
      <PublicFooter />
    </div>
  );
}
