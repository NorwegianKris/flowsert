import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useAuth();

  useEffect(() => {
    async function fetchLocations() {
      if (!businessId) {
        setLocations([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('personnel')
          .select('location')
          .eq('business_id', businessId)
          .not('location', 'is', null)
          .not('location', 'eq', '');

        if (error) throw error;

        // Extract unique, non-empty locations
        const uniqueLocations = [...new Set(
          (data || [])
            .map(p => p.location?.trim())
            .filter((loc): loc is string => !!loc && loc.length > 0)
        )].sort();

        setLocations(uniqueLocations);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, [businessId]);

  return { locations, loading };
}

export function useNationalities() {
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useAuth();

  useEffect(() => {
    async function fetchNationalities() {
      if (!businessId) {
        setNationalities([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('personnel')
          .select('nationality')
          .eq('business_id', businessId)
          .not('nationality', 'is', null)
          .not('nationality', 'eq', '');

        if (error) throw error;

        // Extract unique, non-empty nationalities
        const uniqueNationalities = [...new Set(
          (data || [])
            .map(p => p.nationality?.trim())
            .filter((nat): nat is string => !!nat && nat.length > 0)
        )].sort();

        setNationalities(uniqueNationalities);
      } catch (error) {
        console.error('Error fetching nationalities:', error);
        setNationalities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchNationalities();
  }, [businessId]);

  return { nationalities, loading };
}

export function useLanguages() {
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { businessId } = useAuth();

  useEffect(() => {
    async function fetchLanguages() {
      if (!businessId) {
        setLanguages([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('personnel')
          .select('language')
          .eq('business_id', businessId)
          .not('language', 'is', null)
          .not('language', 'eq', '');

        if (error) throw error;

        // Extract unique, non-empty languages, include common defaults
        const defaultLanguages = ['Norwegian', 'English', 'Swedish', 'Danish', 'Finnish', 'German', 'Polish'];
        const fromDb = (data || [])
          .map(p => p.language?.trim())
          .filter((lang): lang is string => !!lang && lang.length > 0);
        
        const uniqueLanguages = [...new Set([...defaultLanguages, ...fromDb])].sort();

        setLanguages(uniqueLanguages);
      } catch (error) {
        console.error('Error fetching languages:', error);
        setLanguages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchLanguages();
  }, [businessId]);

  return { languages, loading };
}
