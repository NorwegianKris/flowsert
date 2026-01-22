import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function JobSeekerRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        // Get the first active job seeker invitation
        const { data, error } = await supabase
          .from('job_seeker_invitations')
          .select('token')
          .eq('is_active', true)
          .limit(1)
          .single();

        if (error || !data) {
          navigate('/auth');
          return;
        }

        // Redirect to auth with the token
        navigate(`/auth?job_seeker_token=${data.token}`);
      } catch {
        navigate('/auth');
      }
    };

    fetchAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
