import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Users, Globe, MapPin, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GeoLocationInput } from '@/components/ui/geo-location-input';
import { GeoStructuredResult } from '@/hooks/useGeoSearch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ProjectVisibilityControlsProps {
  projectCountry: string;
  projectLocationLabel: string;
  visibilityMode: 'same_country' | 'all';
  includeCountries: string[];
  excludeCountries: string[];
  onProjectLocationChange: (country: string, label: string) => void;
  onChange: (data: {
    visibilityMode: 'same_country' | 'all';
    includeCountries: string[];
    excludeCountries: string[];
  }) => void;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map(x => x.toLowerCase().trim()).filter(Boolean))];
}

export function ProjectVisibilityControls({
  projectCountry,
  projectLocationLabel,
  visibilityMode,
  includeCountries,
  excludeCountries,
  onProjectLocationChange,
  onChange,
}: ProjectVisibilityControlsProps) {
  const { profile } = useAuth();
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [workerCount, setWorkerCount] = useState<number | null>(null);
  const [locationValue, setLocationValue] = useState(projectLocationLabel || projectCountry || '');

  // Keep locationValue in sync when props change (e.g. dialog re-opens)
  useEffect(() => {
    setLocationValue(projectLocationLabel || projectCountry || '');
  }, [projectLocationLabel, projectCountry]);

  // Fetch distinct countries from personnel (non-null, non-empty)
  useEffect(() => {
    async function fetchCountries() {
      if (!profile?.business_id) return;
      const { data } = await supabase
        .from('personnel')
        .select('country')
        .eq('business_id', profile.business_id)
        .not('country', 'is', null);
      if (!data) return;
      const countries = [...new Set(
        data
          .map(r => (r.country as string || '').toLowerCase().trim())
          .filter(c => c !== '')
      )].sort();
      setAvailableCountries(countries);
    }
    fetchCountries();
  }, [profile?.business_id]);

  // Worker count preview — mirrors DB function logic client-side
  const countWorkers = useCallback(async () => {
    if (!profile?.business_id) return;
    const { data } = await supabase
      .from('personnel')
      .select('country')
      .eq('business_id', profile.business_id);
    if (!data) { setWorkerCount(0); return; }

    const normExclude = dedup(excludeCountries);
    const normInclude = dedup(includeCountries);
    const normProjectCountry = projectCountry.toLowerCase().trim();

    let count = 0;
    for (const row of data) {
      const workerCountry = (row.country as string || '').toLowerCase().trim();
      // Exclude check
      if (normExclude.includes(workerCountry)) continue;
      if (visibilityMode === 'all') {
        count++;
      } else {
        // same_country: match project country or include list
        if (workerCountry && (workerCountry === normProjectCountry || normInclude.includes(workerCountry))) {
          count++;
        }
      }
    }
    setWorkerCount(count);
  }, [profile?.business_id, visibilityMode, projectCountry, includeCountries, excludeCountries]);

  useEffect(() => { countWorkers(); }, [countWorkers]);

  const handleStructuredSelect = (result: GeoStructuredResult) => {
    const newCountry = (result.country || '').toLowerCase().trim();
    const newLabel = result.label;
    // Dedup guard: remove new country from include/exclude
    const newInclude = includeCountries.filter(c => c.toLowerCase().trim() !== newCountry);
    const newExclude = excludeCountries.filter(c => c.toLowerCase().trim() !== newCountry);
    onProjectLocationChange(newCountry, newLabel);
    onChange({ visibilityMode, includeCountries: newInclude, excludeCountries: newExclude });
  };

  // Countries available for include/exclude (all worker countries except project country)
  const filteredCountries = availableCountries.filter(
    c => c !== projectCountry.toLowerCase().trim()
  );

  const toggleInclude = (country: string) => {
    const norm = country.toLowerCase().trim();
    const current = dedup(includeCountries);
    const updated = current.includes(norm)
      ? current.filter(c => c !== norm)
      : dedup([...current, norm]);
    onChange({ visibilityMode, includeCountries: updated, excludeCountries: dedup(excludeCountries) });
  };

  const toggleExclude = (country: string) => {
    const norm = country.toLowerCase().trim();
    const current = dedup(excludeCountries);
    const updated = current.includes(norm)
      ? current.filter(c => c !== norm)
      : dedup([...current, norm]);
    onChange({ visibilityMode, includeCountries: dedup(includeCountries), excludeCountries: updated });
  };

  const normInclude = dedup(includeCountries);
  const normExclude = dedup(excludeCountries);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Project Location & Visibility
        </Label>
        {workerCount !== null && (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {workerCount} worker{workerCount !== 1 ? 's' : ''} can see this
          </Badge>
        )}
      </div>

      {/* Section 1: Project Location */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Project Location (required to post)</Label>
        <GeoLocationInput
          value={locationValue}
          onChange={setLocationValue}
          placeholder="Search for a project location..."
          onStructuredSelect={handleStructuredSelect}
        />
        {projectCountry && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            By default, visible to workers in <span className="font-medium text-foreground">{titleCase(projectCountry)}</span>
          </p>
        )}
      </div>

      {/* Section 2: Visibility mode toggle */}
      <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
        <div className="space-y-0.5">
          <Label className="text-sm cursor-pointer" htmlFor="visibility-mode-switch">
            {visibilityMode === 'all' ? 'All workers can see this project' : 'Same-country workers only'}
          </Label>
          <p className="text-xs text-muted-foreground">
            {visibilityMode === 'all' ? 'Visible across all locations (fly-in)' : 'Visible to workers in the project country'}
          </p>
        </div>
        <Switch
          id="visibility-mode-switch"
          checked={visibilityMode === 'all'}
          onCheckedChange={(checked) =>
            onChange({ visibilityMode: checked ? 'all' : 'same_country', includeCountries: normInclude, excludeCountries: normExclude })
          }
        />
      </div>

      {/* Section 3: Advanced accordion */}
      {filteredCountries.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced" className="border-0">
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline">
              Advanced settings
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-1">
                {/* Include additional countries */}
                {visibilityMode === 'same_country' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Include additional countries</Label>
                    <p className="text-[11px] text-muted-foreground">Workers from these countries will also see this project</p>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredCountries.map(country => (
                        <Badge
                          key={country}
                          variant={normInclude.includes(country) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleInclude(country)}
                        >
                          {titleCase(country)}
                          {normInclude.includes(country) && <X className="h-2.5 w-2.5 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclude countries */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Exclude countries</Label>
                  <p className="text-[11px] text-muted-foreground">Workers from these countries will NOT see this project</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredCountries.map(country => (
                      <Badge
                        key={country}
                        variant={normExclude.includes(country) ? 'destructive' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleExclude(country)}
                      >
                        {titleCase(country)}
                        {normExclude.includes(country) && <X className="h-2.5 w-2.5 ml-1" />}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
