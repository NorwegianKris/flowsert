

## AI Search Deduplication

**File:** `src/hooks/useSuggestPersonnel.ts`

Insert deduplication block between line 152 and line 153 (after `const result = data as SuggestionResult;`, before the threshold filters):

```ts
// Deduplicate by personnel ID — keep highest matchScore
const seen = new Map<string, PersonnelSuggestion>();
for (const p of result.suggestedPersonnel) {
  const existing = seen.get(p.id);
  if (!existing || p.matchScore > existing.matchScore) {
    seen.set(p.id, p);
  }
}
result.suggestedPersonnel = Array.from(seen.values());
```

One insertion, no other changes. Client-side only — anchor optional.

