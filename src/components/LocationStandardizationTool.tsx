import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Check, X, MapPin, RefreshCw } from 'lucide-react';
import { stringSimilarity } from '@/lib/stringUtils';

interface LocationGroup {
  entries: string[];
  counts: Map<string, number>;
  suggestedStandard: string;
  status: 'pending' | 'loading' | 'approved' | 'skipped';
}

async function fetchPhotonSuggestion(query: string): Promise<string | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=en&lat=60.47&lon=8.47`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    const props = feature.properties;
    const city = props.city || props.name || props.county || props.state || '';
    const country = props.country || '';
    if (!city) return null;
    return country ? `${city}, ${country}` : city;
  } catch {
    return null;
  }
}

function groupSimilarLocations(locations: { location: string; count: number }[]): LocationGroup[] {
  const groups: LocationGroup[] = [];
  const assigned = new Set<string>();

  for (const loc of locations) {
    if (assigned.has(loc.location)) continue;

    const group: LocationGroup = {
      entries: [loc.location],
      counts: new Map([[loc.location, loc.count]]),
      suggestedStandard: loc.location,
      status: 'pending',
    };
    assigned.add(loc.location);

    // Find similar entries
    for (const other of locations) {
      if (assigned.has(other.location)) continue;
      if (
        stringSimilarity(loc.location, other.location) >= 0.6 ||
        loc.location.toLowerCase().trim() === other.location.toLowerCase().trim()
      ) {
        group.entries.push(other.location);
        group.counts.set(other.location, other.count);
        assigned.add(other.location);
      }
    }

    groups.push(group);
  }

  return groups.sort((a, b) => b.entries.length - a.entries.length);
}

export function LocationStandardizationTool() {
  const { businessId } = useAuth();
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const fetchLocations = async () => {
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

      // Count occurrences
      const countMap = new Map<string, number>();
      for (const row of data || []) {
        const loc = row.location;
        countMap.set(loc, (countMap.get(loc) || 0) + 1);
      }

      const locationsWithCount = Array.from(countMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count);

      const grouped = groupSimilarLocations(locationsWithCount);

      // Fetch Photon suggestions for groups with >1 entry (rate limited)
      for (let i = 0; i < grouped.length; i++) {
        const g = grouped[i];
        if (g.entries.length > 1 || g.entries.some(e => !e.includes(','))) {
          g.status = 'loading';
          setGroups([...grouped]);
          
          const suggestion = await fetchPhotonSuggestion(g.entries[0]);
          if (suggestion) {
            g.suggestedStandard = suggestion;
          }
          g.status = 'pending';
          
          // Rate limit: 500ms between API calls
          if (i < grouped.length - 1) {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }

      setGroups(grouped);
    } catch (err: any) {
      console.error('Error fetching locations:', err);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [businessId]);

  const handleApply = async (groupIndex: number) => {
    const group = groups[groupIndex];
    if (!businessId) return;

    setApplying(group.suggestedStandard);
    try {
      // Update all personnel with matching locations
      for (const entry of group.entries) {
        if (entry === group.suggestedStandard) continue;
        const { error } = await supabase
          .from('personnel')
          .update({ location: group.suggestedStandard })
          .eq('business_id', businessId)
          .eq('location', entry);

        if (error) throw error;
      }

      const updated = [...groups];
      updated[groupIndex] = { ...group, status: 'approved' };
      setGroups(updated);
      
      const count = group.entries.length;
      toast.success(`Standardized ${count} location variant${count > 1 ? 's' : ''} to "${group.suggestedStandard}"`);
    } catch (err: any) {
      console.error('Error applying standardization:', err);
      toast.error('Failed to apply standardization');
    } finally {
      setApplying(null);
    }
  };

  const handleSkip = (groupIndex: number) => {
    const updated = [...groups];
    updated[groupIndex] = { ...updated[groupIndex], status: 'skipped' };
    setGroups(updated);
  };

  const handleEditSuggestion = (groupIndex: number, value: string) => {
    const updated = [...groups];
    updated[groupIndex] = { ...updated[groupIndex], suggestedStandard: value };
    setGroups(updated);
  };

  // Only show groups that need attention (multiple entries or no comma)
  const actionableGroups = groups.filter(
    g => g.status !== 'approved' && g.status !== 'skipped' && 
    (g.entries.length > 1 || g.entries.some(e => !e.includes(',')))
  );

  const completedCount = groups.filter(g => g.status === 'approved').length;

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
              Review and standardize location entries across all personnel profiles. 
              Groups similar entries and suggests a standardized "City, Country" format.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLocations} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
        {completedCount > 0 && (
          <Badge variant="secondary" className="w-fit">
            {completedCount} group{completedCount > 1 ? 's' : ''} standardized
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyzing locations...</span>
          </div>
        ) : actionableGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>All locations are already standardized!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Current Values</TableHead>
                <TableHead>Suggested Standard</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionableGroups.map((group, idx) => {
                const realIndex = groups.indexOf(group);
                return (
                  <TableRow key={group.entries.join('|')}>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.entries.map(entry => (
                          <Badge key={entry} variant="outline" className="text-xs">
                            {entry}
                            <span className="ml-1 text-muted-foreground">
                              ({group.counts.get(entry) || 0})
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {group.status === 'loading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Input
                          value={group.suggestedStandard}
                          onChange={(e) => handleEditSuggestion(realIndex, e.target.value)}
                          className="h-8 text-sm"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApply(realIndex)}
                          disabled={applying !== null || group.status === 'loading'}
                          className="h-8"
                        >
                          {applying === group.suggestedStandard ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSkip(realIndex)}
                          className="h-8"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
