

## Section 8: Location Normalization — QA Results

All 12 checks verified against `CertificateLocationNormalizationTool.tsx` (687 lines).

| Check | Result | Evidence |
|---|---|---|
| 8.1 Located in Settings > Locations | **PASS** | Renders as `<Collapsible>` (line 431), matching memory docs confirming Settings > Locations placement |
| 8.2 Reads place_of_issue from certificates | **PASS** | Lines 112-117, 161-166: selects `place_of_issue` from `certificates` joined with `personnel!inner(business_id)` |
| 8.3 Groups by unique values | **PASS** | Lines 176-182: `Map<string, string[]>` groups cert IDs by unique `place_of_issue` value |
| 8.4 Normalizes via Nominatim geocoding | **PASS** | `geocodeWithNominatim()` (lines 63-88) calls `nominatim.openstreetmap.org/search` with `User-Agent: FlowSert/1.0` |
| 8.5 Respects 1000ms delay | **PASS** | Line 233: `await new Promise(r => setTimeout(r, 1000))` between each call |
| 8.6 Country name normalization | **PASS** | `COUNTRY_VARIANTS` map (lines 30-49) used by `handleNormalizeCountries()` (line 331) for string-only normalization without API calls |
| 8.7 Stores place_of_issue_lat | **PASS** | Line 292: `updatePayload.place_of_issue_lat = mapping.lat` — DB column is `double precision` per schema |
| 8.8 Stores place_of_issue_lon | **PASS** | Line 293: `updatePayload.place_of_issue_lon = mapping.lon` — DB column is `double precision` per schema |
| 8.9 Saves rollback data to rescan_previous_data | **PASS** | Lines 275-285: fetches existing `rescan_previous_data`, merges `place_of_issue_original: mapping.oldValue`, writes back as JSONB |
| 8.10 Handles unresolvable locations gracefully | **PASS** | Lines 224-225: if `geocodeWithNominatim` returns null, value is pushed to `failedLocations` array; processing continues to next item |
| 8.11 Progress indicator | **PASS** | Lines 447-461: `<Progress>` bar with "Normalizing X of Y" text and Stop button |
| 8.12 Results summary | **PASS** | Lines 472-494: summary shows normalized count, already-clean count, and failed count with distinct icons |

**All 12 checks pass. No code changes required.**

### Anchor check
- Q1 (SQL/schema): No
- Q2 (edge functions/auth): No
- Q3 (access control): No
- Q4 (core filtering/compliance): No — location normalization is cosmetic/data-quality, not compliance-gating
- Q5 (UI only): Audit only, no changes

No issues found. Plan update to `.lovable/plan.md` will document these results.

