import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PlatformAdminRouteProps {
  children: ReactNode;
}

export function PlatformAdminRoute({ children }: PlatformAdminRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || profile?.email !== 'hello@flowsert.com') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
