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
  activated: boolean;
  nationality: string | null;
  department: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  employmentType: 'employee' | 'freelancer';
  skills: string[];
  certificates: { 
    name: string; 
    expiryDate: string | null;
    category: string | null;
    issuingAuthority: string | null;
  }[];
}

/**
 * Calculate a profile completion percentage (0-100) for sorting.
 * Fields: name, role, location, email, bio, nationality, department, country, city, skills, certificates.
 */
function getProfileCompletionPct(p: Personnel): number {
  const fields = [
    !!p.name?.trim(),
    !!p.role?.trim(),
    !!p.location?.trim() && p.location !== 'Not specified',
    !!p.email?.trim(),
    !!p.bio?.trim(),
    !!p.nationality,
    !!p.department,
    !!p.country,
    !!p.city,
    (p.skills?.length ?? 0) > 0,
    p.certificates.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}


export function useSuggestPersonnel() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionResult | null>(null);
  const { toast } = useToast();

  const getSuggestions = async (
    prompt: string,
    personnel: Personnel[],
    includeFreelancers: boolean,
    includeEmployees: boolean,
    documentCounts?: Map<string, number>
  ): Promise<SuggestionResult | null> => {
    if (!prompt.trim()) {
      setSuggestions(null);
      return null;
    }

    setLoading(true);

    try {
      // ── Pre-filter & payload limit ──────────────────────────────────────────
      // Only send activated personnel to the AI. Sort by profile completion so
      // the most complete profiles are prioritised. Cap at 200 to keep the HTTP
      // payload under ~1 MB and avoid edge-function timeouts.
      const MAX_CLIENT_PAYLOAD = 200;

      const activatedPersonnel = personnel.filter(p => p.activated);

      const scored = activatedPersonnel.map(p => ({
        person: p,
        completionPct: getProfileCompletionPct(p),
      }));
      scored.sort((a, b) => b.completionPct - a.completionPct);

      const cappedPersonnel = scored.slice(0, MAX_CLIENT_PAYLOAD);

      const personnelForAI: PersonnelForAI[] = cappedPersonnel.map(({ person: p }) => {
        const employmentType: 'employee' | 'freelancer' =
          p.category === 'freelancer' ? 'freelancer' : 'employee';

        // Truncate bio to avoid token limits (max 500 chars)
        const truncatedBio = p.bio ? p.bio.slice(0, 500) : null;

        return {
          id: p.id,
          name: p.name,
          role: p.role,
          location: p.location,
          category: p.category || null,
          activated: true, // always true after pre-filter
          nationality: p.nationality || null,
          department: p.department || null,
          bio: truncatedBio,
          country: p.country || null,
          city: p.city || null,
          employmentType,
          skills: p.skills || [],
          certificates: p.certificates.map(c => ({
            name: c.name,
            expiryDate: c.expiryDate,
            category: c.category || null,
            issuingAuthority: c.issuingAuthority || null,
          })),
        };
      });

      const { data, error } = await supabase.functions.invoke('suggest-project-personnel', {
        body: {
          prompt,
          personnel: personnelForAI,
          includeFreelancers,
          includeEmployees
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        if (data.error === 'monthly_cap_reached') {
          toast({
            variant: 'destructive',
            title: 'Monthly Limit Reached',
            description: "You've reached your monthly Search limit. Upgrade your plan to continue."
          });
        } else if (data.error.includes('Rate limit')) {
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

      // Check 80% usage warning
      if (data.usage_remaining) {
        const { used, cap } = data.usage_remaining;
        if (cap > 0 && used / cap >= 0.8) {
          const pct = Math.round((used / cap) * 100);
          toast({
            title: 'Usage Warning',
            description: `You've used ${pct}% of your monthly Search allowance. Upgrade your plan to avoid interruption.`
          });
        }
      }

      const result = data as SuggestionResult;
      // Deduplicate by personnel ID — keep highest matchScore
      const seen = new Map<string, PersonnelSuggestion>();
      for (const p of result.suggestedPersonnel) {
        const existing = seen.get(p.id);
        if (!existing || p.matchScore > existing.matchScore) {
          seen.set(p.id, p);
        }
      }
      result.suggestedPersonnel = Array.from(seen.values());
      // Raise minimum display threshold to 40%
      result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore >= 40);
      // If any result scores 90%+, suppress everything below 50%
      const hasStrongMatch = result.suggestedPersonnel.some(p => p.matchScore >= 90);
      if (hasStrongMatch) {
        result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore >= 50);
      }
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
