

## Change default personnel sort to "Last Updated"

**File:** `src/pages/AdminDashboard.tsx` — line 126

Change:
```ts
const [sortOption, setSortOption] = useState<PersonnelSortOption>('alphabetical');
```
to:
```ts
const [sortOption, setSortOption] = useState<PersonnelSortOption>('last_updated');
```

One-line change. No schema impact. Anchor optional.

