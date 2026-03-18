

## Plan: Add General Hallucination Prevention Rule and Harden dateOfIssue Schema

Two insertions and one replacement in `supabase/functions/extract-certificate-data/index.ts`. No other changes.

### Change 1 — Insert rule 3b after line 200

After line 200 (`3. If a field is not visible or unclear, return null for that field`), insert:

```
3b. HALLUCINATION PREVENTION — GENERAL: For all factual extraction fields (certificateName, dateOfIssue, placeOfIssue, issuingAuthority), only return values that are directly visible or unambiguously inferable from text present in this specific document image. Never use your training knowledge to fill in what "should" be there. When in doubt, return null. A null is always preferable to a fabricated value.
```

### Change 2 — Update dateOfIssue tool schema description (line 275)

Replace:
```
"Date the certificate was issued in YYYY-MM-DD format"
```

With:
```
"Date the certificate was issued, in YYYY-MM-DD format. Only return a date explicitly visible on the document with a label such as 'date of issue', 'issued', 'utstedelsesdato', 'dato', or similar. Do NOT infer from expiry date, certificate type, or training knowledge. Return null if not clearly present."
```

Two changes total — one line inserted, one description replaced. Nothing else touched.

