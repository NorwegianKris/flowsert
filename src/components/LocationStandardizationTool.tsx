import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GeoLocationInput } from '@/components/ui/geo-location-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, MapPin, RefreshCw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationEntry {
  value: string;
  count: number;
}

const isStandardized = (loc: string) => /^.+,\s*.+$/.test(loc);

export function LocationStandardizationTool() {
  const { businessId } = useAuth();
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [standardValue, setStandardValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const userInputted = locations.filter(l => !isStandardized(l.value));
  const standardized = locations.filter(l => isStandardized(l.value));

  const fetchLocations = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personnel')
        .select('location')
        .eq('business_id', businessId)
        .not('location', 'is', null)
        .not('location', 'eq', '')
        .not('location', 'eq', 'Not specified');

      if (error) throw error;

      const countMap = new Map<string, number>();
      for (const row of data || []) {
        const loc = row.location;
        countMap.set(loc, (countMap.get(loc) || 0) + 1);
      }

      const entries = Array.from(countMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value));

      setLocations(entries);
      setSelected(new Set());
      setStandardValue('');
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const toggleSelect = (value: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === userInputted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(userInputted.map(l => l.value)));
    }
  };

  const handleApply = async () => {
    if (selected.size === 0 || !standardValue.trim() || !businessId) return;

    setApplying(true);
    try {
      for (const entry of selected) {
        if (entry === standardValue) continue;
        const { error } = await supabase
          .from('personnel')
          .update({ location: standardValue })
          .eq('business_id', businessId)
          .eq('location', entry);
        if (error) throw error;
      }

      toast.success(`Updated ${selected.size} location(s) to "${standardValue}"`);

      setLocations(prev => {
        const appliedSet = new Set(selected);
        let newCount = 0;
        const remaining: LocationEntry[] = [];
        for (const loc of prev) {
          if (appliedSet.has(loc.value)) {
            newCount += loc.count;
          } else {
            remaining.push(loc);
          }
        }
        const existingIdx = remaining.findIndex(l => l.value === standardValue);
        if (existingIdx >= 0) {
          remaining[existingIdx] = { ...remaining[existingIdx], count: remaining[existingIdx].count + newCount };
        } else {
          remaining.push({ value: standardValue, count: newCount });
        }
        return remaining.sort((a, b) => a.value.localeCompare(b.value));
      });

      setSelected(new Set());
      setStandardValue('');
    } catch (err: any) {
      console.error('Error applying standardization:', err);
      toast.error('Failed to apply standardization');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Standardize Locations
            </CardTitle>
            <CardDescription>
              Select locations on the left, then choose a standardized city on the right.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLocations} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading locations...</span>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No locations found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left panel: user-inputted locations only */}
            <div className="border rounded-md">
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <span className="text-sm font-medium">
                  User-inputted locations ({userInputted.length})
                </span>
                {userInputted.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs">
                    {selected.size === userInputted.length ? 'Deselect all' : 'Select all'}
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[360px]">
                {userInputted.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-12 text-muted-foreground text-sm">
                    <div className="text-center">
                      <Check className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>All locations are standardized!</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 space-y-0.5">
                    {userInputted.map(loc => (
                      <label
                        key={loc.value}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent/50 transition-colors',
                          selected.has(loc.value) && 'bg-accent'
                        )}
                      >
                        <Checkbox
                          checked={selected.has(loc.value)}
                          onCheckedChange={() => toggleSelect(loc.value)}
                        />
                        <span className="text-sm flex-1 truncate">{loc.value}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {loc.count}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selected.size > 0 && (
                <div className="p-2 border-t bg-muted/50">
                  <span className="text-xs text-muted-foreground">
                    {selected.size} selected
                  </span>
                </div>
              )}
            </div>

            {/* Right panel: tabs */}
            <div className="border rounded-md flex flex-col">
              <Tabs defaultValue="standardize" className="flex flex-col flex-1">
                <div className="p-3 border-b bg-muted/50">
                  <TabsList className="w-full">
                    <TabsTrigger value="standardize" className="flex-1">Standardize to</TabsTrigger>
                    <TabsTrigger value="existing" className="flex-1">
                      Standardized ({standardized.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="standardize" className="flex-1 flex flex-col m-0">
                  <div className="p-4 flex-1 flex flex-col gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">
                        Search for the correct city name
                      </label>
                      <GeoLocationInput
                        value={standardValue}
                        onChange={setStandardValue}
                        placeholder="Type a city name..."
                      />
                    </div>

                    {selected.size > 0 && standardValue.trim() && (
                      <div className="rounded-md border p-3 bg-muted/30">
                        <p className="text-sm mb-2">
                          Will update <strong>{selected.size}</strong> location value{selected.size > 1 ? 's' : ''} to:
                        </p>
                        <Badge variant="default" className="text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          {standardValue}
                        </Badge>
                      </div>
                    )}

                    <Button
                      onClick={handleApply}
                      disabled={selected.size === 0 || !standardValue.trim() || applying}
                      className="mt-auto"
                    >
                      {applying ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Apply to {selected.size} selected
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="existing" className="flex-1 m-0">
                  <ScrollArea className="h-[360px]">
                    {standardized.length === 0 ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        <div className="text-center">
                          <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No standardized locations yet.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 space-y-0.5">
                        {standardized.map(loc => (
                          <div
                            key={loc.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm"
                          >
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm flex-1 truncate">{loc.value}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {loc.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
