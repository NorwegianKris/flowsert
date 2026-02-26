

## Plan: Add structured country/city fields to AI personnel matching

The SQL confirms `country` is reliably populated (lowercase, e.g. "norway", "spain", "united kingdom"). This enables deterministic geographic matching instead of relying on AI to parse location strings.

### Changes (2 files only)

#### 1. `src/hooks/useSuggestPersonnel.ts`

**Interface** (after line 33, add):
```
country: string | null;
city: string | null;
```

**Mapped object** (after line 113 `bio: truncatedBio,`, add):
```
country: p.country || null,
city: p.city || null,
```

#### 2. `supabase/functions/suggest-project-personnel/index.ts`

**PersonnelData interface** (after line 18 `bio: string | null;`, add):
```
country: string | null;
city: string | null;
```

**personnelSummary map** (after line 189 `bio: p.bio,`, add):
```
country: p.country,
city: p.city,
```

**Replace geographic location matching section** (lines 225–236) with:
```
IMPORTANT - Geographic Location Matching:
- Each person has a structured 'country' field (lowercase, e.g. "norway", "spain", "united kingdom") AND a display 'location' string (e.g. "Bergen, Norway").
- Always use the 'country' field for country matching — it is authoritative.
- When a specific country is mentioned in the query, ONLY include personnel whose 'country' field exactly matches. Never use location string for country matching.
- Norway query → country must equal "norway"
- UK/United Kingdom query → country must equal "united kingdom"
- Spain query → country must equal "spain"
- Scandinavia query → country must be one of: "norway", "sweden", "denmark"
- Europe query → include all European countries
- Personnel with null country field: exclude from any location-specific query.
- This is a hard rule. No exceptions based on qualifications or other factors.
```

### Risk
- 🔴 Edge function prompt change → anchor required per checklist Q2
- Requires redeployment of `suggest-project-personnel`

