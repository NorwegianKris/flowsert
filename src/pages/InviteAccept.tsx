import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, LogOut, UserPlus, LogIn } from 'lucide-react';

interface InvitePreview {
  business_id: string;
  business_name: string;
  invited_email: string;
  invited_role: string;
  expires_at: string;
  status: string;
}

type PageState = 'loading' | 'invalid' | 'not_logged_in' | 'wrong_account' | 'ready' | 'accepting' | 'success' | 'error';

export default function InviteAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [state, setState] = useState<PageState>('loading');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasExistingAccount, setHasExistingAccount] = useState<boolean | null>(null);

  // Guard to prevent the initial useEffect and onAuthStateChange from competing
  const evaluatingRef = useRef(false);
  const previewRef = useRef<InvitePreview | null>(null);

  console.log('[InviteAccept] token:', token ? 'present' : 'missing');

  // Evaluate session against the invite preview
  const evaluateSession = async (invite: InvitePreview) => {
    if (evaluatingRef.current) return;
    evaluatingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('[InviteAccept] evaluateSession: no session');
        const { data: exists } = await supabase.rpc('check_invite_email_exists', { p_email: invite.invited_email });
        setHasExistingAccount(exists === true);
        setState('not_logged_in');
        return;
      }

      const userEmail = session.user.email?.toLowerCase() ?? '';
      const invitedEmail = invite.invited_email.toLowerCase();
      const match = userEmail === invitedEmail;
      console.log('[InviteAccept] evaluateSession email:', userEmail, '| invited:', invitedEmail, '| match:', match);
      setSessionEmail(userEmail);

      if (!match) {
        setState('wrong_account');
      } else {
        setState('ready');
      }
    } finally {
      evaluatingRef.current = false;
    }
  };

  // Initial load: fetch preview, then evaluate session
  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    const load = async () => {
      setState('loading');

      const { data, error } = await supabase.rpc('preview_invite', { p_token: token });

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        console.log('[InviteAccept] preview result: invalid/expired');
        setState('invalid');
        return;
      }

      const invite: InvitePreview = Array.isArray(data) ? data[0] : data;
      console.log('[InviteAccept] preview result: valid');
      setPreview(invite);
      previewRef.current = invite;

      await evaluateSession(invite);
    };

    load();
  }, [token]);

  // Listen for auth state changes (handles redirect back from /auth after login)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[InviteAccept] onAuthStateChange:', event);
      
      if (event === 'SIGNED_IN' && previewRef.current) {
        // User just signed in — re-evaluate against the invite
        evaluateSession(previewRef.current);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    setState('accepting');

    const { error } = await supabase.rpc('accept_invite', { p_token: token });

    if (error) {
      console.error('[InviteAccept] accept_invite failed:', error.message);
      const msg = error.message?.includes('INVITE:')
        ? error.message.replace('INVITE: ', '')
        : 'Failed to accept invite. Please try again.';
      setErrorMessage(msg);
      setState('error');
    } else {
      console.log('[InviteAccept] accept_invite success');
      setState('success');

      // Redirect to role-appropriate dashboard
      const targetPath = preview?.invited_role === 'worker' ? '/worker' : '/admin';
      setTimeout(() => {
        window.location.assign(targetPath);
      }, 2000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.assign(`/invite?token=${encodeURIComponent(token!)}`);
  };

  // Build auth URLs with double-encoded redirect
  const redirectUrl = token ? `/invite?token=${encodeURIComponent(token)}` : '/invite';
  const loginUrl = `/auth?mode=signin&redirect=${encodeURIComponent(redirectUrl)}`;
  const signupUrl = `/auth?mode=signup&token=${encodeURIComponent(token!)}&redirect=${encodeURIComponent(redirectUrl)}`;

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Contact your administrator to request a new invite.
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (state === 'not_logged_in' && preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>You're Invited</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{preview.business_name}</strong> as a{' '}
              <strong>{preview.invited_role}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              Invitation for: <strong>{preview.invited_email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {hasExistingAccount === false
                ? `Create your account to join ${preview.business_name}.`
                : hasExistingAccount === true
                ? `Log in to accept your invitation to join ${preview.business_name}.`
                : 'Log in or create an account to accept this invitation.'}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {hasExistingAccount !== false && (
              <>
                {hasExistingAccount === true && (
                  <p className="text-sm text-muted-foreground text-center mb-1">
                    You already have a FlowSert account — log in to accept this invitation.
                  </p>
                )}
                <Button className="w-full" onClick={() => navigate(loginUrl)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Log in to accept
                </Button>
              </>
            )}
            {hasExistingAccount !== true && (
              <Button variant={hasExistingAccount === false ? "default" : "outline"} className="w-full" onClick={() => navigate(signupUrl)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create account to accept
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (state === 'wrong_account' && preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-2" />
            <CardTitle>Wrong Account</CardTitle>
            <CardDescription>
              This invitation is for <strong>{preview.invited_email}</strong>.
              You are logged in as <strong>{sessionEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out and continue
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Invite Accepted!</CardTitle>
            <CardDescription>
              You've joined <strong>{preview?.business_name}</strong>. Redirecting…
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Error</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => setState('ready')}>
              Try again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // state === 'ready' || 'accepting'
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Join <strong>{preview?.business_name}</strong> as a{' '}
            <strong>{preview?.invited_role}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Accepting as <strong>{sessionEmail}</strong>
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button onClick={handleAccept} disabled={state === 'accepting'}>
            {state === 'accepting' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting…
              </>
            ) : (
              'Accept Invite'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
