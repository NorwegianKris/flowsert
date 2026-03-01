

## Plan: Add "Normalize Country Names" Step to Location Tool

**Risk**: 🟢 Pure UI + string mapping. No schema/RLS/auth changes.

### What changes

**File: `src/components/CertificateLocationNormalizationTool.tsx`** — MODIFY

Add a country normalization section that appears after the city normalization results (or independently via a separate button). This is a hardcoded lookup — no API calls.

**New state:**
- `countryMappings: LocationMapping[]` — country-only matches found
- `countryApplying: boolean`
- `showCountryResults: boolean`

**Country map** — a `Record<string, string>` keyed by lowercase variant:
```
"norway","norge" → "Norway"
"uk","united kingdom" → "United Kingdom"
"netherlands","the netherlands" → "Netherlands"
"spain","españa" → "Spain"
... (all entries from the user's list)
```

**"Normalize country names" button:**
- Shown when: city normalization is idle (no processing/applying), OR after city results are applied/dismissed
- On click: queries all certificates with non-null `place_of_issue` for the business, groups by unique value, checks each against the country map (case-insensitive lookup, no comma = country-only), builds `countryMappings` for values that differ from the canonical form
- Instant — no progress bar needed since it's pure string matching with no API calls

**Results display** — same pattern as city normalization:
- Summary: "X country names normalized (Y certificates)"
- Expandable before/after list with reject (X) buttons
- "Apply All" button using same rollback pattern (save old value to `rescan_previous_data.place_of_issue_original`)

**Placement**: Below the city normalization results section, separated by a subtle divider. If city normalization hasn't been run, the country button still appears as a standalone action.

### Files changed

| File | Action |
|---|---|
| `src/components/CertificateLocationNormalizationTool.tsx` | MODIFY — add country mapping logic and UI section |

