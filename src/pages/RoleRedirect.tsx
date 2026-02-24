import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { needsConsent } from '@/lib/legalVersions';
import { Loader2 } from 'lucide-react';

export default function RoleRedirect() {
  const { user, role, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
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
  }, [user, role, profile, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
