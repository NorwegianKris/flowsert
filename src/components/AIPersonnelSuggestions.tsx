import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Personnel } from '@/types';
import { useSuggestPersonnel, PersonnelSuggestion } from '@/hooks/useSuggestPersonnel';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface AIPersonnelSuggestionsProps {
  personnel: Personnel[];
  onApplyFilters: (filters: {
    roleFilters: string[];
    locationFilters: string[];
    certificateFilters: string[];
  }) => void;
  onHighlightPersonnel: (personnelIds: string[]) => void;
  onClearHighlight: () => void;
  onIncludeJobSeekersChange?: (value: boolean) => void;
}

export function AIPersonnelSuggestions({
  personnel,
  onApplyFilters,
  onHighlightPersonnel,
  onClearHighlight,
  onIncludeJobSeekersChange,
}: AIPersonnelSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [includeJobSeekers, setIncludeJobSeekers] = useState(false);
  const { loading: aiLoading, suggestions, getSuggestions, clearSuggestions } = useSuggestPersonnel();

  const handleGetSuggestions = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter search requirements first');
      return;
    }
    const result = await getSuggestions(aiPrompt, personnel, includeJobSeekers);
    if (result?.suggestedPersonnel && result.suggestedPersonnel.length > 0) {
      onHighlightPersonnel(result.suggestedPersonnel.map(s => s.id));
      
      // Check if any suggested personnel are job seekers and sync the main toggle
      const hasJobSeekers = result.suggestedPersonnel.some(s => {
        const person = personnel.find(p => p.id === s.id);
        return person?.isJobSeeker;
      });
      
      if (hasJobSeekers && includeJobSeekers && onIncludeJobSeekersChange) {
        onIncludeJobSeekersChange(true);
      }
      
      toast.success(`Found ${result.suggestedPersonnel.length} matching personnel`);
    }
  };

  const handleClear = () => {
    setAiPrompt('');
    clearSuggestions();
    onClearHighlight();
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
    return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  };

  const suggestedCount = suggestions?.suggestedPersonnel?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium">AI Personnel Search</span>
            {suggestedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {suggestedCount} matches
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 ml-2 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        {suggestedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="aiIncludeJobSeekers"
                checked={includeJobSeekers}
                onCheckedChange={setIncludeJobSeekers}
              />
              <Label htmlFor="aiIncludeJobSeekers" className="text-sm cursor-pointer">
                Include job seekers
              </Label>
            </div>
            <Button
              type="button"
              variant="secondary"
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
