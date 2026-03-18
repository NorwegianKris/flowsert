

## Plan: Tighten matchedIssuer Prompt Instruction

**Single line change** in `supabase/functions/extract-certificate-data/index.ts`, line 231.

Replace:
```
If the issuing authority matches one of these exactly or closely, include that name in matchedIssuer.
```

With:
```
If the issuing authority visible on the document matches one of these by exact name or minor spelling variation only (e.g. abbreviation, capitalisation, or a missing/extra word), include that exact name from the list in matchedIssuer. Do NOT match based on semantic similarity, organisational relationship, or because two bodies operate in the same industry or country. If the match is not near-exact, return null for matchedIssuer.
```

No other changes.

