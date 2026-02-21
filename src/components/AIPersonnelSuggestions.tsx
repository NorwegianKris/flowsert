import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Personnel } from '@/types';
import { useSuggestPersonnel, PersonnelSuggestion } from '@/hooks/useSuggestPersonnel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AIPersonnelSuggestionsProps {
  personnel: Personnel[];
  onApplyFilters: (filters: {
    roleFilters: string[];
    locationFilters: string[];
    certificateFilters: string[];
  }) => void;
  onHighlightPersonnel: (personnelIds: string[]) => void;
  onClearHighlight: () => void;
  includeFreelancers: boolean;
  onFilterByAI?: (personnelIds: string[] | null) => void;
}

export function AIPersonnelSuggestions({
  personnel,
  onApplyFilters,
  onHighlightPersonnel,
  onClearHighlight,
  includeFreelancers,
  onFilterByAI,
}: AIPersonnelSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [documentCounts, setDocumentCounts] = useState<Map<string, number>>(new Map());
  const { loading: aiLoading, suggestions, getSuggestions, clearSuggestions } = useSuggestPersonnel();

  // Fetch document counts for all personnel
  useEffect(() => {
    async function fetchDocumentCounts() {
      if (personnel.length === 0) return;
      
      const personnelIds = personnel.map(p => p.id);
      const { data, error } = await supabase
        .from('personnel_documents')
        .select('personnel_id')
        .in('personnel_id', personnelIds);
      
      if (!error && data) {
        const counts = new Map<string, number>();
        data.forEach(doc => {
          counts.set(doc.personnel_id, (counts.get(doc.personnel_id) || 0) + 1);
        });
        setDocumentCounts(counts);
      }
    }
    
    fetchDocumentCounts();
  }, [personnel]);

  const handleGetSuggestions = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter search requirements first');
      return;
    }
    const result = await getSuggestions(aiPrompt, personnel, includeFreelancers, documentCounts);
    if (result?.suggestedPersonnel && result.suggestedPersonnel.length > 0) {
      const matchedIds = result.suggestedPersonnel.map(s => s.id);
      onHighlightPersonnel(matchedIds);
      
      // Filter to show only matching personnel
      if (onFilterByAI) {
        onFilterByAI(matchedIds);
      }
      
      
      
      toast.success(`Found ${result.suggestedPersonnel.length} matching personnel`);
    } else if (result?.suggestedPersonnel?.length === 0) {
      // No matches found - filter to empty
      if (onFilterByAI) {
        onFilterByAI([]);
      }
      toast.info('No matching personnel found');
    }
  };

  const handleClear = () => {
    setAiPrompt('');
    clearSuggestions();
    onClearHighlight();
    // Clear the AI filter to show all personnel again
    if (onFilterByAI) {
      onFilterByAI(null);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  };

  const suggestedCount = suggestions?.suggestedPersonnel?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary text-white">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent text-white hover:text-white">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="font-medium">AI Personnel Search</span>
            {suggestedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestedCount} matches
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 ml-2 text-white/70" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2 text-white/70" />
            )}
          </Button>
        </CollapsibleTrigger>
        {(suggestions !== null || aiPrompt.trim() !== '') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-white/70 hover:text-white hover:bg-transparent"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Search
          </Button>
        )}
      </div>
      
      <CollapsibleContent className="mt-2">
        <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe who you're looking for...&#10;e.g., 'Divers with G4 certificate available next week in Stavanger area'"
            rows={3}
            className="resize-y min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleGetSuggestions}
              disabled={aiLoading || !aiPrompt.trim()}
              className="gap-2"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Find Personnel
                </>
              )}
            </Button>
          </div>

          {/* Suggestions Results */}
          {suggestions?.suggestedPersonnel && suggestions.suggestedPersonnel.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  🤖 Found {suggestedCount} matching personnel:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.suggestedPersonnel.map((suggestion) => {
                  const person = personnel.find(p => p.id === suggestion.id);
                  if (!person) return null;
                  return (
                    <Badge
                      key={suggestion.id}
                      variant="outline"
                      className={`${getMatchScoreColor(suggestion.matchScore)} cursor-default`}
                    >
                      <span className="font-medium">{person.name}</span>
                      <span className="ml-1 opacity-70">({suggestion.matchScore}%)</span>
                    </Badge>
                  );
                })}
              </div>
              {suggestions.suggestedPersonnel.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Matching personnel are highlighted in the list below.
                </p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
