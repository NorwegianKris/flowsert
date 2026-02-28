

## Update Fuzzy Auto-Select Thresholds in CertificateTypeSelector

**Risk: 🟢 anchor optional** — UI logic change only.

### Context
The OCR auto-select fuzzy matching logic has not been implemented yet — it's part of the pending Upload Field Redesign. This plan specifies the exact thresholds and "clear winner" logic to use when that code is written.

### Changes — `src/components/CertificateTypeSelector.tsx`

When the `ocrHint` prop is added (as part of the Upload Field Redesign), the high-confidence (>=0.85) auto-select logic must use this algorithm:

1. Score all filtered types against `ocrHint.extractedName` using `stringSimilarity` from `src/lib/stringUtils.ts`
2. Sort by score descending
3. **Auto-select** only if:
   - Best match score > **0.7** (not 0.5)
   - AND either there is only one match above 0.7, or the gap between 1st and 2nd best scores is >= **0.15**
4. **Fall back to search pre-fill** if:
   - Best match scores > 0.7 but the 2nd-best is within 0.15 of it (ambiguous match)
   - Set `searchValue` to `ocrHint.extractedName` so user sees both close matches and picks one
5. If best match <= 0.7, no auto-select, no pre-fill from this tier — the medium/low confidence tiers handle it

```text
Pseudocode:
  scores = filteredTypes.map(t => ({ id, name, score: stringSimilarity(extracted, t.name) }))
  scores.sort(desc by score)
  best = scores[0], second = scores[1]

  if best.score > 0.7:
    if !second OR (best.score - second.score >= 0.15):
      → auto-select best (clear winner)
    else:
      → pre-fill search with extractedName (ambiguous, let user choose)
  else:
    → no action from high-confidence tier
```

This ensures we never auto-select when two types like "BOSIET" and "BOSIET with CA-EBS" both score similarly against an OCR extraction.

### No code changes now
This is a specification constraint for the upcoming implementation. No files are modified in this plan.

