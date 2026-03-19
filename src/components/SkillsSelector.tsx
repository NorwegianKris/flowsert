import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SKILL_CATEGORIES } from '@/lib/skillsData';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

const MAX_SKILLS = 8;
const DEFAULT_VISIBLE = 6;

interface SkillsSelectorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  readonly?: boolean;
}

export function SkillsSelector({ skills, onChange, readonly = false }: SkillsSelectorProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const atMax = skills.length >= MAX_SKILLS;

  const toggleExpand = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  };

  const handleToggle = (skill: string) => {
    if (skills.includes(skill)) {
      onChange(skills.filter(s => s !== skill));
    } else if (!atMax) {
      onChange([...skills, skill]);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return SKILL_CATEGORIES;
    const q = search.toLowerCase();
    return SKILL_CATEGORIES.map(cat => ({
      ...cat,
      skills: cat.skills.filter(s => s.toLowerCase().includes(q)),
    })).filter(cat => cat.skills.length > 0);
  }, [search]);

  if (readonly) {
    if (skills.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {skills.map(skill => (
          <Badge key={skill} className="bg-[#3B3AC2] text-white hover:bg-[#3B3AC2]/90 text-xs">
            {skill}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Pick up to 8 key skills you want to highlight. Choose the ones that best represent your expertise — you can always update them later.
        </p>
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
          {skills.length} of {MAX_SKILLS} selected
        </span>
      </div>

      {/* Selected chips */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map(skill => (
            <Badge
              key={skill}
              className="bg-[#3B3AC2] text-white hover:bg-[#3B3AC2]/90 cursor-pointer gap-1 text-xs"
              onClick={() => handleToggle(skill)}
            >
              {skill}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {filteredCategories.map(cat => {
          const isExpanded = expandedCategories.has(cat.name) || search.trim().length > 0;
          const visibleSkills = isExpanded ? cat.skills : cat.skills.slice(0, DEFAULT_VISIBLE);
          const hasMore = cat.skills.length > DEFAULT_VISIBLE && !search.trim();

          return (
            <div key={cat.name}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {cat.emoji} {cat.name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleSkills.map(skill => {
                  const isSelected = skills.includes(skill);
                  const isDisabled = atMax && !isSelected;

                  const tag = (
                    <button
                      key={skill}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleToggle(skill)}
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                        isSelected
                          ? 'bg-[#3B3AC2] text-white border-[#3B3AC2]'
                          : isDisabled
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                          : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground cursor-pointer'
                      }`}
                    >
                      {skill}
                    </button>
                  );

                  if (isDisabled) {
                    return (
                      <Tooltip key={skill}>
                        <TooltipTrigger asChild>{tag}</TooltipTrigger>
                        <TooltipContent>Maximum {MAX_SKILLS} skills selected — deselect one to choose another</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return tag;
                })}
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => toggleExpand(cat.name)}
                  className="text-xs text-primary hover:underline mt-1.5 flex items-center gap-1"
                >
                  {isExpanded ? (
                    <><ChevronUp className="h-3 w-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" /> Show more ({cat.skills.length - DEFAULT_VISIBLE})</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
