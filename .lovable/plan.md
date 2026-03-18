

## Plan: Add Rule 5c and Update placeOfIssue Schema Description

Two changes in `supabase/functions/extract-certificate-data/index.ts`.

### Change 1 — Insert rule 5c after line 204

After current line 204 (rule 5b), insert:

```
5c. PLACE OF ISSUE vs ISSUING AUTHORITY — DO NOT CONFUSE THESE: Place of issue is a geographic location (city or country) only — never an organization name. Issuing authority is an organization name only — never a city or country. If you find an organization name (e.g. "NYD Subsea Training Centre", "Havtil", "DNV"), do NOT put it in placeOfIssue — put it in issuingAuthority. If you find a city or country (e.g. "Oslo", "Norway", "Haugesund"), do NOT put it in issuingAuthority — put it in placeOfIssue. When a stamp or block contains both an organization name and an address, extract the organization to issuingAuthority and the city/country to placeOfIssue separately.
```

### Change 2 — Update placeOfIssue tool schema description (line 288)

Replace current description:
```
"Explicit place of issue if labeled, otherwise inferred from the issuing organization's address, training centre location, or clinic address — city preferred, country as fallback. Never use the certificate holder's address. Null only if nothing can be inferred."
```

With:
```
"Geographic location (city or country) where the certificate was issued. Must be a place name only — never an organization, training centre, or issuing body name. Infer from org address or clinic address if not explicitly labeled. Return null if no geographic location can be identified. Examples: 'Haugesund, Norway', 'Oslo', 'Norway', 'Aberdeen, UK'."
```

Two changes only. Nothing else touched.

