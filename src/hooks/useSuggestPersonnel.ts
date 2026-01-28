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
  profileCompletionPercentage: number;
  profileCompletionStatus: 'complete' | 'high' | 'medium' | 'low';
}

// Calculate profile completion percentage (must match PersonnelCard and ProfileCompletionIndicator logic)
function calculateProfileCompletion(p: Personnel, documentCount: number): { percentage: number; status: 'complete' | 'high' | 'medium' | 'low' } {
  const checks = [
    !!p.name && p.name.trim().length > 0,
    !!p.role && p.role.trim().length > 0,
    !!p.nationality,
    !!p.gender,
    !!p.phone && p.phone.trim().length > 0,
    !!p.email && p.email.trim().length > 0,
    !!p.location && p.location.trim().length > 0 && p.location !== 'Not specified',
    p.certificates.length > 0,
    documentCount > 0,
  ];
  const percentage = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  let status: 'complete' | 'high' | 'medium' | 'low';
  if (percentage === 100) status = 'complete';
  else if (percentage >= 80) status = 'high';
  else if (percentage >= 50) status = 'medium';
  else status = 'low';
  return { percentage, status };
}

export function useSuggestPersonnel() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const { toast } = useToast();

  const getSuggestions = async (
    prompt: string,
    personnel: Personnel[],
    includeJobSeekers: boolean,
    documentCounts?: Map<string, number>
  ): Promise<SuggestionResult | null> => {
    if (!prompt.trim()) {
      setSuggestions(null);
      return null;
    }

    setLoading(true);

    try {
      // Prepare personnel data (exclude sensitive fields, include completion info)
      const personnelForAI: PersonnelForAI[] = personnel.map(p => {
        const docCount = documentCounts?.get(p.id) || 0;
        const { percentage, status } = calculateProfileCompletion(p, docCount);
        return {
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
          })),
          profileCompletionPercentage: percentage,
          profileCompletionStatus: status
        };
      });

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
