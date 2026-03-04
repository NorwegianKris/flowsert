import { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, Square, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface LocationMapping {
  oldValue: string;
  newValue: string;
  certCount: number;
  certIds: string[];
  rejected?: boolean;
  lat?: number;
  lon?: number;
}

const COUNTRY_VARIANTS: Record<string, string> = {
  'norway': 'Norway', 'norge': 'Norway',
  'uk': 'United Kingdom', 'united kingdom': 'United Kingdom',
  'netherlands': 'Netherlands', 'the netherlands': 'Netherlands',
  'italy': 'Italy',
  'australia': 'Australia',
  'spain': 'Spain', 'españa': 'Spain',
  'france': 'France',
  'denmark': 'Denmark',
  'sweden': 'Sweden',
  'ireland': 'Ireland',
  'malta': 'Malta',
  'panama': 'Panama',
  'qatar': 'Qatar',
  'cyprus': 'Cyprus',
  'latvia': 'Latvia',
  'greece': 'Greece',
  'poland': 'Poland',
  'south africa': 'South Africa',
};

function isStandardized(value: string): boolean {
  if (!value.includes(',')) return false;
  const parts = value.split(',').map(p => p.trim());
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
}

interface GeocodingResult {
  displayName: string;
  lat: number;
  lon: number;
}

async function geocodeWithNominatim(query: string): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'FlowSert/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length === 0) return null;

    const result = data[0];
    const displayName: string = result.display_name || '';
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    // Extract city and country from display_name parts
    const parts = displayName.split(',').map((p: string) => p.trim());
    if (parts.length >= 2) {
      const city = parts[0];
      const country = parts[parts.length - 1];
      return { displayName: `${city}, ${country}`, lat, lon };
    }
    return null;
  } catch {
    return null;
  }
}

export function CertificateLocationNormalizationTool() {
  const { businessId } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uniqueLocationCount, setUniqueLocationCount] = useState<number | null>(null);
  const [totalCertCount, setTotalCertCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [mappings, setMappings] = useState<LocationMapping[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [failedLocations, setFailedLocations] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const abortRef = useRef(false);
  const [countryMappings, setCountryMappings] = useState<LocationMapping[]>([]);
  const [countryApplying, setCountryApplying] = useState(false);
  const [showCountryResults, setShowCountryResults] = useState(false);
  const [countryOnlyCount, setCountryOnlyCount] = useState(0);
  // Fetch unique location count on mount
  useEffect(() => {
    if (!businessId) return;
    const fetchCount = async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('place_of_issue, personnel!inner(business_id)')
        .eq('personnel.business_id', businessId)
        .not('place_of_issue', 'is', null)
        .not('place_of_issue', 'eq', '');

      if (error || !data) return;

      const uniqueValues = new Set<string>();
      const needsNormalization: string[] = [];
      let countryOnly = 0;
      const seenCountryVariants = new Set<string>();
      data.forEach((c: any) => {
        const val = c.place_of_issue?.trim();
        if (val) {
          uniqueValues.add(val);
          if (!isStandardized(val)) {
            needsNormalization.push(val);
            // Check if it's a country-only variant
            const lower = val.toLowerCase();
            if (!val.includes(',') && COUNTRY_VARIANTS[lower] && COUNTRY_VARIANTS[lower] !== val) {
              seenCountryVariants.add(val);
            }
          }
        }
      });

      const uniqueNeedingNorm = new Set(needsNormalization);
      setUniqueLocationCount(uniqueNeedingNorm.size);
      setTotalCertCount(needsNormalization.length);
      setCountryOnlyCount(seenCountryVariants.size);
    };
    fetchCount();
  }, [businessId, showResults, showCountryResults]);

  const handleNormalize = useCallback(async () => {
    if (!businessId) return;
    setConfirmOpen(false);
    setProcessing(true);
    setCurrent(0);
    setMappings([]);
    setSkippedCount(0);
    setFailedLocations([]);
    setShowResults(false);
    abortRef.current = false;

    try {
      // Fetch all certificates with place_of_issue for this business
      const { data: certs, error } = await supabase
        .from('certificates')
        .select('id, place_of_issue, personnel!inner(business_id)')
        .eq('personnel.business_id', businessId)
        .not('place_of_issue', 'is', null)
        .not('place_of_issue', 'eq', '');

      if (error) throw error;
      if (!certs || certs.length === 0) {
        toast.info('No certificates with location data found');
        setProcessing(false);
        return;
      }

      // Group by unique place_of_issue
      const groups = new Map<string, string[]>();
      certs.forEach((c: any) => {
        const val = c.place_of_issue?.trim();
        if (!val) return;
        if (!groups.has(val)) groups.set(val, []);
        groups.get(val)!.push(c.id);
      });

      // Filter to only non-standardized values
      const toProcess: Array<{ value: string; certIds: string[] }> = [];
      let skipped = 0;
      groups.forEach((certIds, value) => {
        if (isStandardized(value)) {
          skipped += 1;
        } else {
          toProcess.push({ value, certIds });
        }
      });

      setSkippedCount(skipped);
      setTotal(toProcess.length);

      if (toProcess.length === 0) {
        toast.info('All locations are already in clean format');
        setProcessing(false);
        return;
      }

      const resultMappings: LocationMapping[] = [];
      const failed: string[] = [];

      for (let i = 0; i < toProcess.length; i++) {
        if (abortRef.current) break;
        setCurrent(i + 1);

        const { value, certIds } = toProcess[i];

        const result = await geocodeWithNominatim(value);

        if (result && result.displayName !== value) {
          resultMappings.push({
            oldValue: value,
            newValue: result.displayName,
            certCount: certIds.length,
            certIds,
            lat: result.lat,
            lon: result.lon,
          });
        } else if (!result) {
          failed.push(value);
        } else {
          // normalized === value, already clean
          skipped++;
        }

        // 1000ms delay between Nominatim calls
        if (i < toProcess.length - 1 && !abortRef.current) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      setMappings(resultMappings);
      setFailedLocations(failed);
      setSkippedCount(skipped);
      setShowResults(true);
    } catch (err) {
      console.error('[LocationNorm] Fatal error:', err);
      toast.error('Location normalization failed unexpectedly');
    }

    setProcessing(false);

    if (abortRef.current) {
      toast.info(`Normalization stopped. Processed ${current} of ${total} locations.`);
      setShowResults(true);
    }
  }, [businessId]);

  const handleRejectMapping = (index: number) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, rejected: true } : m));
  };

  const handleApplyAll = useCallback(async () => {
    const toApply = mappings.filter(m => !m.rejected);
    if (toApply.length === 0) {
      toast.info('No mappings to apply');
      return;
    }

    setApplying(true);
    let applied = 0;
    let errors = 0;

    for (const mapping of toApply) {
      try {
        // For each certificate with this old value, update and save rollback data
        // We do one update per unique old value using the cert IDs
        for (const certId of mapping.certIds) {
          // Fetch existing rescan_previous_data
          const { data: cert } = await supabase
            .from('certificates')
            .select('rescan_previous_data')
            .eq('id', certId)
            .single();

          const existingData = (cert?.rescan_previous_data as Record<string, unknown>) || {};
          const updatedPreviousData = {
            ...existingData,
            place_of_issue_original: mapping.oldValue,
          };

          const updatePayload: Record<string, unknown> = {
            place_of_issue: mapping.newValue,
            rescan_previous_data: updatedPreviousData,
          };
          if (mapping.lat != null && mapping.lon != null) {
            updatePayload.place_of_issue_lat = mapping.lat;
            updatePayload.place_of_issue_lon = mapping.lon;
          }

          const { error } = await supabase
            .from('certificates')
            .update(updatePayload)
            .eq('id', certId);

          if (error) {
            errors++;
          } else {
            applied++;
          }
        }
      } catch (err) {
        console.error('[LocationNorm] Apply error:', err);
        errors++;
      }
    }

    setApplying(false);

    if (errors > 0) {
      toast.warning(`Applied ${applied} updates with ${errors} errors`);
    } else {
      toast.success(`Successfully normalized ${applied} certificate locations`);
    }

    // Reset
    setMappings([]);
    setShowResults(false);
    setFailedLocations([]);
  }, [mappings]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleNormalizeCountries = useCallback(async () => {
    if (!businessId) return;
    setCountryMappings([]);
    setShowCountryResults(false);

    const { data: certs, error } = await supabase
      .from('certificates')
      .select('id, place_of_issue, personnel!inner(business_id)')
      .eq('personnel.business_id', businessId)
      .not('place_of_issue', 'is', null)
      .not('place_of_issue', 'eq', '');

    if (error || !certs) {
      toast.error('Failed to fetch certificates');
      return;
    }

    const groups = new Map<string, string[]>();
    certs.forEach((c: any) => {
      const val = c.place_of_issue?.trim();
      if (!val || val.includes(',')) return; // skip city,country format
      if (!groups.has(val)) groups.set(val, []);
      groups.get(val)!.push(c.id);
    });

    const results: LocationMapping[] = [];
    groups.forEach((certIds, value) => {
      const canonical = COUNTRY_VARIANTS[value.toLowerCase()];
      if (canonical && canonical !== value) {
        results.push({ oldValue: value, newValue: canonical, certCount: certIds.length, certIds });
      }
    });

    setCountryMappings(results);
    setShowCountryResults(true);

    if (results.length === 0) {
      toast.info('No country name variants found to normalize');
    }
  }, [businessId]);

  const handleRejectCountryMapping = (index: number) => {
    setCountryMappings(prev => prev.map((m, i) => i === index ? { ...m, rejected: true } : m));
  };

  const handleApplyCountries = useCallback(async () => {
    const toApply = countryMappings.filter(m => !m.rejected);
    if (toApply.length === 0) {
      toast.info('No mappings to apply');
      return;
    }

    setCountryApplying(true);
    let applied = 0;
    let errors = 0;

    for (const mapping of toApply) {
      for (const certId of mapping.certIds) {
        try {
          const { data: cert } = await supabase
            .from('certificates')
            .select('rescan_previous_data')
            .eq('id', certId)
            .single();

          const existingData = (cert?.rescan_previous_data as Record<string, unknown>) || {};
          const updatedPreviousData = { ...existingData, place_of_issue_original: mapping.oldValue };

          const { error } = await supabase
            .from('certificates')
            .update({ place_of_issue: mapping.newValue, rescan_previous_data: updatedPreviousData })
            .eq('id', certId);

          if (error) errors++;
          else applied++;
        } catch {
          errors++;
        }
      }
    }

    setCountryApplying(false);

    if (errors > 0) {
      toast.warning(`Applied ${applied} updates with ${errors} errors`);
    } else {
      toast.success(`Successfully normalized ${applied} country names`);
    }

    setCountryMappings([]);
    setShowCountryResults(false);
  }, [countryMappings]);

  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const acceptedMappings = mappings.filter(m => !m.rejected);
  const totalCertsAffected = acceptedMappings.reduce((sum, m) => sum + m.certCount, 0);
  const acceptedCountryMappings = countryMappings.filter(m => !m.rejected);
  const totalCountryCertsAffected = acceptedCountryMappings.reduce((sum, m) => sum + m.certCount, 0);

  return (
    <Collapsible className="mb-6">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary cursor-pointer w-full py-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Normalize Certificate Locations</span>
        {uniqueLocationCount !== null && uniqueLocationCount > 0 && (
          <span className="text-xs text-muted-foreground ml-1">({uniqueLocationCount} unique locations)</span>
        )}
        <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="border rounded-lg p-4 space-y-4 bg-white dark:bg-card">
          <p className="text-sm text-muted-foreground">
            Standardize certificate place-of-issue values to clean "City, Country" format using geocoding. Groups identical values to minimize API calls. Original data is preserved for rollback.
          </p>

          {/* Processing state */}
          {processing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Normalizing {current} of {total} unique locations...</span>
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <Square className="h-3 w-3 mr-1" />
                  Stop
                </Button>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Rate-limited to 1 request/second per Nominatim policy. You can stop at any time.
              </p>
            </div>
          )}

          {/* Applying state */}
          {applying && (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Applying {totalCertsAffected} certificate updates...</span>
            </div>
          )}

          {/* Results */}
          {showResults && !processing && !applying && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex flex-wrap gap-3 text-sm">
                {acceptedMappings.length > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    {acceptedMappings.length} normalized
                  </span>
                )}
                {skippedCount > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    {skippedCount} already clean
                  </span>
                )}
                {failedLocations.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {failedLocations.length} failed
                  </span>
                )}
              </div>

              {/* Normalized list */}
              {mappings.length > 0 && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer">
                    <CheckCircle2 className="h-4 w-4" />
                    {acceptedMappings.length} locations normalized ({totalCertsAffected} certificates)
                    <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {mappings.map((mapping, i) => (
                      <div
                        key={mapping.oldValue}
                        className={`flex items-center text-xs border-b border-border/50 pb-1 last:border-0 gap-1 ${mapping.rejected ? 'opacity-40' : ''}`}
                      >
                        <span className="text-muted-foreground line-through">{mapping.oldValue}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium">{mapping.newValue}</span>
                        <span className="text-muted-foreground ml-1">({mapping.certCount} cert{mapping.certCount !== 1 ? 's' : ''})</span>
                        {!mapping.rejected && (
                          <button
                            onClick={() => handleRejectMapping(i)}
                            className="ml-auto p-0.5 hover:bg-destructive/10 rounded"
                            title="Reject this mapping"
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Failed list */}
              {failedLocations.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-destructive hover:underline cursor-pointer">
                    <XCircle className="h-4 w-4" />
                    {failedLocations.length} failed
                    <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-5 space-y-1">
                    {failedLocations.map(loc => (
                      <div key={loc} className="text-xs text-muted-foreground">{loc}</div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Apply button */}
              {acceptedMappings.length > 0 && (
                <Button onClick={handleApplyAll} size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Apply All ({totalCertsAffected} certificates)
                </Button>
              )}
            </div>
          )}

          {/* Action button */}
          {!processing && !applying && !showResults && (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={uniqueLocationCount === 0 || uniqueLocationCount === null}
              variant="outline"
              size="sm"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Normalize locations
            </Button>
          )}

          {/* Separator */}
          <div className="border-t border-border/50 pt-4 mt-2">
            <p className="text-sm font-medium mb-2">Normalize Country Names</p>
            <p className="text-sm text-muted-foreground mb-3">
              Standardize country-only values (e.g., "NORWAY" → "Norway", "UK" → "United Kingdom") using a built-in mapping. No API calls needed.
            </p>

            {/* Country applying state */}
            {countryApplying && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Applying {totalCountryCertsAffected} certificate updates...</span>
              </div>
            )}

            {/* Country results */}
            {showCountryResults && !countryApplying && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  {acceptedCountryMappings.length > 0 && (
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      {acceptedCountryMappings.length} country names to normalize ({totalCountryCertsAffected} certificates)
                    </span>
                  )}
                  {countryMappings.length === 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      No country variants found
                    </span>
                  )}
                </div>

                {countryMappings.length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer">
                      <CheckCircle2 className="h-4 w-4" />
                      {acceptedCountryMappings.length} country names ({totalCountryCertsAffected} certificates)
                      <ChevronDown className="h-3 w-3 ml-1 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1">
                      {countryMappings.map((mapping, i) => (
                        <div
                          key={mapping.oldValue}
                          className={`flex items-center text-xs border-b border-border/50 pb-1 last:border-0 gap-1 ${mapping.rejected ? 'opacity-40' : ''}`}
                        >
                          <span className="text-muted-foreground line-through">{mapping.oldValue}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{mapping.newValue}</span>
                          <span className="text-muted-foreground ml-1">({mapping.certCount} cert{mapping.certCount !== 1 ? 's' : ''})</span>
                          {!mapping.rejected && (
                            <button
                              onClick={() => handleRejectCountryMapping(i)}
                              className="ml-auto p-0.5 hover:bg-destructive/10 rounded"
                              title="Reject this mapping"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {acceptedCountryMappings.length > 0 && (
                  <Button onClick={handleApplyCountries} size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Apply All ({totalCountryCertsAffected} certificates)
                  </Button>
                )}
              </div>
            )}

            {/* Country action button */}
            {!countryApplying && !showCountryResults && !processing && !applying && (
              <Button
                onClick={handleNormalizeCountries}
                disabled={countryOnlyCount === 0}
                variant="outline"
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Normalize country names
                {countryOnlyCount > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">({countryOnlyCount} variants)</span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Confirmation dialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Normalize Certificate Locations</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    This will standardize place of issue for <strong>{totalCertCount}</strong> certificate{totalCertCount !== 1 ? 's' : ''} across <strong>{uniqueLocationCount}</strong> unique location{uniqueLocationCount !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-sm">
                    Original data will be saved for rollback. Rate-limited to 1 request/second per Nominatim policy.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleNormalize}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CollapsibleContent>
    </Collapsible>
  );
}
