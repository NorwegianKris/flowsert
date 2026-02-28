

## Fix suggest-certificate-types for Production Scale

**Risk: 🔴 anchor required** — Edge function + config.toml changes.

### Fix 1 — Add config.toml entry

Append to `supabase/config.toml` after line 16:
```toml
[functions.suggest-certificate-types]
verify_jwt = false
```

### Fix 2 — Increase max_tokens, reduce batch size

In `supabase/functions/suggest-certificate-types/index.ts`:
- Line 239: `BATCH_SIZE = 50` → `BATCH_SIZE = 25`
- Line 265: `max_tokens: 4000` → `max_tokens: 16000`

### Fix 3 — Defensive JSON parsing with salvage

Replace lines 316-322 (the current `JSON.parse` block) with the salvage pattern: try `JSON.parse(clean)`, on failure find last complete object via `lastIndexOf('},')`, truncate and close the array, re-parse. Log warnings for salvaged batches, errors for unrecoverable ones. Push results with `if (parsed.length > 0) allResults.push(...parsed)`.

### Fix 4 — Time budget guard

Before the `for (const batch of batches)` loop (line 247), add:
```typescript
const START_TIME = Date.now();
const MAX_DURATION_MS = 50000;
```
At top of loop body:
```typescript
if (Date.now() - START_TIME > MAX_DURATION_MS) {
  console.warn(`Time budget reached — returning ${allResults.length} partial results`);
  break;
}
```

### Fix 5 — Return partial metadata

Replace line 337 success response with:
```typescript
return new Response(JSON.stringify({
  suggestions: allResults,
  partial: allResults.length < certificates.length,
  processed: allResults.length,
  total: certificates.length,
}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
```

Also add `partial`/`processed`/`total` fields to 429 and 402 error responses.

### Fix 6 — Frontend partial results notice

In `src/components/TypeMergingPane.tsx`:

1. Add state variable `aiPartialInfo` (line ~196):
```typescript
const [aiPartialInfo, setAiPartialInfo] = useState<{partial: boolean; processed: number; total: number} | null>(null);
```

2. After `const result = await response.json()` (line 602), extract partial metadata:
```typescript
if (result.partial) {
  setAiPartialInfo({ partial: true, processed: result.processed, total: result.total });
} else {
  setAiPartialInfo(null);
}
```

3. In `renderSuggestionsList` (line 946, after the bulk bar div), add:
```typescript
{aiPartialInfo?.partial && (
  <div className="px-3 py-2 bg-amber-50 border-b text-xs text-amber-800 flex items-center gap-2">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    Showing {aiPartialInfo.processed} of {aiPartialInfo.total} suggestions — run AI Suggest again for remaining certificates.
  </div>
)}
```

4. Clear `aiPartialInfo` in `handleClearSuggestions`.

### Files changed

- `supabase/config.toml` — add function entry
- `supabase/functions/suggest-certificate-types/index.ts` — fixes 2–5
- `src/components/TypeMergingPane.tsx` — fix 6

