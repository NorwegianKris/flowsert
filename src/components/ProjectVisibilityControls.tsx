import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, MapPin, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProjectVisibilityControlsProps {
  visibilityAll: boolean;
  visibilityCountries: string[];
  visibilityCities: Record<string, string[]>;
  onChange: (data: {
    visibilityAll: boolean;
    visibilityCountries: string[];
    visibilityCities: Record<string, string[]>;
  }) => void;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export function ProjectVisibilityControls({
  visibilityAll,
  visibilityCountries,
  visibilityCities,
  onChange,
}: ProjectVisibilityControlsProps) {
  const { profile } = useAuth();
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<Record<string, string[]>>({});
  const [workerCount, setWorkerCount] = useState<number | null>(null);

  // Fetch distinct countries and cities from personnel
  useEffect(() => {
    async function fetchLocations() {
      if (!profile?.business_id) return;

      const { data } = await supabase
        .from('personnel')
        .select('country, city')
        .eq('business_id', profile.business_id)
        .not('country', 'is', null);

      if (!data) return;

      const countrySet = new Set<string>();
      const cityMap: Record<string, Set<string>> = {};

      for (const row of data) {
        const country = row.country as string;
        if (!country) continue;
        countrySet.add(country);
        if (!cityMap[country]) cityMap[country] = new Set();
        if (row.city) cityMap[country].add(row.city as string);
      }

      setAvailableCountries([...countrySet].sort());
      const cityRecord: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(cityMap)) {
        cityRecord[k] = [...v].sort();
      }
      setAvailableCities(cityRecord);
    }
    fetchLocations();
  }, [profile?.business_id]);

  // Worker count preview
  useEffect(() => {
    async function countWorkers() {
      if (!profile?.business_id) return;

      if (visibilityAll) {
        const { count } = await supabase
          .from('personnel')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', profile.business_id);
        setWorkerCount(count ?? 0);
        return;
      }

      if (visibilityCountries.length === 0) {
        setWorkerCount(0);
        return;
      }

      // Count workers matching country + city rules
      const { data } = await supabase
        .from('personnel')
        .select('country, city')
        .eq('business_id', profile.business_id)
        .in('country', visibilityCountries);

      if (!data) { setWorkerCount(0); return; }

      let count = 0;
      for (const row of data) {
        const country = row.country as string;
        const city = row.city as string | null;
        const targetedCities = visibilityCities[country];
        if (!targetedCities || targetedCities.length === 0) {
          count++; // All cities allowed
        } else if (city && targetedCities.includes(city)) {
          count++;
        }
      }
      setWorkerCount(count);
    }
    countWorkers();
  }, [visibilityAll, visibilityCountries, visibilityCities, profile?.business_id]);

  const handleCountryToggle = (country: string, checked: boolean) => {
    let newCountries: string[];
    let newCities = { ...visibilityCities };
    if (checked) {
      newCountries = [...visibilityCountries, country];
    } else {
      newCountries = visibilityCountries.filter(c => c !== country);
      delete newCities[country];
    }
    onChange({ visibilityAll: false, visibilityCountries: newCountries, visibilityCities: newCities });
  };

  const handleCityToggle = (country: string, city: string, checked: boolean) => {
    const currentCities = visibilityCities[country] || [];
    let newCities: string[];
    if (checked) {
      newCities = [...currentCities, city];
    } else {
      newCities = currentCities.filter(c => c !== city);
    }
    onChange({
      visibilityAll: false,
      visibilityCountries,
      visibilityCities: { ...visibilityCities, [country]: newCities },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Visibility
        </Label>
        {workerCount !== null && (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {workerCount} worker{workerCount !== 1 ? 's' : ''} can see this
          </Badge>
        )}
      </div>

      <RadioGroup
        value={visibilityAll ? 'all' : 'selected'}
        onValueChange={(val) => {
          if (val === 'all') {
            onChange({ visibilityAll: true, visibilityCountries: [], visibilityCities: {} });
          } else {
            onChange({ visibilityAll: false, visibilityCountries, visibilityCities });
          }
        }}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="all" id="vis-all" />
          <Label htmlFor="vis-all" className="font-normal cursor-pointer">All locations</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="selected" id="vis-selected" />
          <Label htmlFor="vis-selected" className="font-normal cursor-pointer">Selected locations</Label>
        </div>
      </RadioGroup>

      {!visibilityAll && (
        <div className="space-y-3">
          {availableCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No personnel with location data found.</p>
          ) : (
            <ScrollArea className="max-h-60">
              <div className="space-y-3">
                {availableCountries.map(country => {
                  const isSelected = visibilityCountries.includes(country);
                  const cities = availableCities[country] || [];
                  const targetedCities = visibilityCities[country] || [];

                  return (
                    <div key={country} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`country-${country}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleCountryToggle(country, checked as boolean)}
                        />
                        <Label htmlFor={`country-${country}`} className="font-medium cursor-pointer text-sm">
                          {titleCase(country)}
                        </Label>
                      </div>

                      {isSelected && cities.length > 0 && (
                        <div className="ml-6 space-y-1.5">
                          <p className="text-xs text-muted-foreground">
                            {targetedCities.length === 0 ? 'All cities' : `${targetedCities.length} cit${targetedCities.length === 1 ? 'y' : 'ies'} selected`}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {cities.map(city => (
                              <Badge
                                key={city}
                                variant={targetedCities.includes(city) ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => handleCityToggle(country, city, !targetedCities.includes(city))}
                              >
                                <MapPin className="h-2.5 w-2.5 mr-1" />
                                {titleCase(city)}
                                {targetedCities.includes(city) && (
                                  <X className="h-2.5 w-2.5 ml-1" />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
