import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Personnel } from '@/types';
import { useToast } from '@/hooks/use-toast';

export interface SuggestedFields {
  location?: string;
  workCategory?: string;
  startDate?: string;
  endDate?: string;
  projectManager?: string;
}

export interface PersonnelSuggestion {
  id: string;
  matchScore: number;
  matchReasons: string[];
}

export interface SuggestionResult {
  suggestedFields: SuggestedFields;
  suggestedPersonnel: PersonnelSuggestion[];
}

interface PersonnelForAI {
  id: string;
  name: string;
  role: string;
  location: string;
  category: string | null;
  isJobSeeker: boolean;
  activated: boolean;
  certificates: { name: string; expiryDate: string | null }[];
}

export function useSuggestPersonnel() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const { toast } = useToast();

  const getSuggestions = async (
    prompt: string,
    personnel: Personnel[],
    includeJobSeekers: boolean
  ): Promise<SuggestionResult | null> => {
    if (!prompt.trim()) {
      setSuggestions(null);
      return null;
    }

    setLoading(true);

    try {
      // Prepare personnel data (exclude sensitive fields)
      const personnelForAI: PersonnelForAI[] = personnel.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        location: p.location,
        category: p.category || null,
        isJobSeeker: p.isJobSeeker || false,
        activated: p.activated || false,
        certificates: p.certificates.map(c => ({
          name: c.name,
          expiryDate: c.expiryDate
        }))
      }));

      const { data, error } = await supabase.functions.invoke('suggest-project-personnel', {
        body: {
          prompt,
          personnel: personnelForAI,
          includeJobSeekers
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast({
            variant: 'destructive',
            title: 'Rate Limited',
            description: 'Too many requests. Please wait a moment and try again.'
          });
        } else if (data.error.includes('credits')) {
          toast({
            variant: 'destructive',
            title: 'Credits Exhausted',
            description: 'AI credits have been used. Please add credits to continue.'
          });
        } else {
          throw new Error(data.error);
        }
        return null;
      }

      const result = data as SuggestionResult;
      setSuggestions(result);
      return result;

    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get AI suggestions. You can still select personnel manually.'
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions(null);
  };

  const getSuggestionForPersonnel = (personnelId: string): PersonnelSuggestion | undefined => {
    return suggestions?.suggestedPersonnel.find(s => s.id === personnelId);
  };

  return {
    loading,
    suggestions,
    getSuggestions,
    clearSuggestions,
    getSuggestionForPersonnel
  };
}
