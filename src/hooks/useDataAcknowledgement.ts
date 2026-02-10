import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_VERSION = '1.0';

interface Acknowledgement {
  id: string;
  personnel_id: string;
  business_id: string;
  acknowledged_at: string;
  acknowledgement_version: string;
  acknowledgement_type: string;
  created_at: string;
}

export function useDataAcknowledgement(personnelId: string | undefined, businessId: string | undefined, externalVersion?: string) {
  const [acknowledgement, setAcknowledgement] = useState<Acknowledgement | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [requiredVersion, setRequiredVersion] = useState(FALLBACK_VERSION);

  const fetchAcknowledgement = useCallback(async () => {
    if (!personnelId || !businessId) {
      setLoading(false);
      return;
    }

    try {
      let version = externalVersion || FALLBACK_VERSION;

      // Only fetch from businesses if no external version was provided
      if (!externalVersion) {
        const { data: bizData } = await supabase
          .from('businesses')
          .select('required_ack_version')
          .eq('id', businessId)
          .single();

        version = (bizData as any)?.required_ack_version || FALLBACK_VERSION;
      }

      setRequiredVersion(version);

      const { data, error } = await supabase
        .from('data_processing_acknowledgements' as any)
        .select('*')
        .eq('personnel_id', personnelId)
        .eq('business_id', businessId)
        .eq('acknowledgement_version', version)
        .order('acknowledged_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const record = (data as any)?.[0] || null;
      setAcknowledgement(record);
      setHasAcknowledged(!!record);
    } catch (error) {
      console.error('Error fetching data acknowledgement:', error);
    } finally {
      setLoading(false);
    }
  }, [personnelId, businessId, externalVersion]);

  useEffect(() => {
    fetchAcknowledgement();
  }, [fetchAcknowledgement]);

  const submitAcknowledgement = async (type: string = 'registration') => {
    if (!personnelId || !businessId) return false;

    try {
      const { error } = await supabase
        .from('data_processing_acknowledgements' as any)
        .insert({
          personnel_id: personnelId,
          business_id: businessId,
          acknowledged_at: new Date().toISOString(),
          acknowledgement_version: requiredVersion,
          acknowledgement_type: type,
        } as any);

      if (error) throw error;

      setHasAcknowledged(true);
      await fetchAcknowledgement();
      return true;
    } catch (error) {
      console.error('Error submitting acknowledgement:', error);
      return false;
    }
  };

  return {
    acknowledgement,
    loading,
    hasAcknowledged,
    submitAcknowledgement,
    currentVersion: requiredVersion,
  };
}

export function useBusinessAcknowledgements(businessId: string | undefined) {
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('data_processing_acknowledgements' as any)
          .select('*')
          .eq('business_id', businessId)
          .order('acknowledged_at', { ascending: false });

        if (error) throw error;
        setAcknowledgements((data as any) || []);
      } catch (error) {
        console.error('Error fetching business acknowledgements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [businessId]);

  return { acknowledgements, loading };
}
