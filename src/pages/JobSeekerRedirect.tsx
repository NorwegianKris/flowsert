import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function JobSeekerRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!id) {
        navigate('/auth');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('job_seeker_invitations')
          .select('token, is_active')
          .eq('id', id)
          .single();

        if (error || !data) {
          navigate('/auth');
          return;
        }

        if (!data.is_active) {
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
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
