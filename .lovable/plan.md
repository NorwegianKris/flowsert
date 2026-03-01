

## Fix: Cap Match Scores at 100%

**Problem**: The AI model (Gemini) sometimes returns `matchScore` values above 100 despite the system prompt instructing a 0–100 range. The credential depth bonus (+5/+3) can push scores over 100 when the model doesn't enforce the cap itself.

**Root cause**: Line 671–673 — the edge function filters and sorts AI results but never clamps the score.

**Risk**: 🟢 UI-only display fix. No schema, no RLS, no auth changes.

### Change: `supabase/functions/suggest-project-personnel/index.ts`

At lines 671–673, after filtering valid personnel IDs, add `Math.min(sp.matchScore, 100)` to clamp scores:

```typescript
// Before:
result.suggestedPersonnel = result.suggestedPersonnel
  .filter(sp => validPersonnelIds.has(sp.id))
  .sort((a, b) => b.matchScore - a.matchScore);

// After:
result.suggestedPersonnel = result.suggestedPersonnel
  .filter(sp => validPersonnelIds.has(sp.id))
  .map(sp => ({ ...sp, matchScore: Math.min(sp.matchScore, 100) }))
  .sort((a, b) => b.matchScore - a.matchScore);
```

Single line addition. Ranking order is preserved since clamping only affects values above 100.

### Files changed

| File | Action |
|---|---|
| `supabase/functions/suggest-project-personnel/index.ts` | MODIFY — add `.map()` to clamp matchScore |

