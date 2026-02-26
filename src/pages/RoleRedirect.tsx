import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { needsConsent } from '@/lib/legalVersions';
import { Loader2 } from 'lucide-react';
import Auth from './Auth';

export default function RoleRedirect() {
  const { user, role, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authRequested = searchParams.get('auth') === '1';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (authRequested) return; // Don't navigate, render Auth below
      navigate('/auth', { replace: true });
      return;
    }

    if (needsConsent(profile)) {
      navigate('/consent', { replace: true });
      return;
    }

    // Redirect based on role
    if (role === 'admin' || role === 'manager') {
      navigate('/admin', { replace: true });
    } else if (role === 'worker') {
      navigate('/worker', { replace: true });
    } else {
      // No role assigned yet, might be a new user
      navigate('/auth', { replace: true });
    }
  }, [user, role, profile, loading, navigate, authRequested]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loading && !user && authRequested) {
    return <Auth />;
  }

  // Default spinner (brief flash while useEffect navigates)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
