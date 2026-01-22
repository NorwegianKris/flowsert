import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface RegistrationData {
  business_id: string;
  business_name: string;
  token: string;
}

export default function JobSeekerRedirect() {
  const { companyCode } = useParams<{ companyCode: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!companyCode) {
        navigate('/auth');
        return;
      }

      try {
        // Look up business and active job seeker invitation by company code
        const { data, error } = await (supabase.rpc as any)(
          'get_job_seeker_registration_by_code', 
          { lookup_code: companyCode }
        ) as { data: RegistrationData[] | null; error: any };

        if (error || !data || data.length === 0) {
          setError('Invalid or expired registration link');
          return;
        }

        const invitation = data[0];

        // Redirect to auth with the token
        navigate(`/auth?job_seeker_token=${invitation.token}`);
      } catch {
        setError('Something went wrong. Please try again.');
      }
    };

    fetchAndRedirect();
  }, [companyCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive font-medium">{error}</p>
          <button 
            onClick={() => navigate('/auth')}
            className="text-primary underline"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
