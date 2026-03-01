

## Plan: Fix Needs Review count and deep-link depth

### Issue 1: Wrong count

**`src/hooks/useNeedsReviewCount.ts`** — Change the query from `.eq('needs_review', true)` to `.is('certificate_type_id', null).is('unmapped_by', null).not('title_raw', 'is', null)`. This matches the exact filter logic in `useUnmappedCertificates.ts` (lines 47-49), so the dashboard number will always match the 424 shown in the Types tab.

### Issue 2: Deep-link not deep enough

**`src/components/CategoriesSection.tsx`** — Add a `defaultSubTab?: string` prop. Pass it to the certificates sub-tabs `<Tabs>` as `defaultValue={defaultSubTab || "categories"}` so it can open directly on "types".

**`src/pages/AdminDashboard.tsx`** — On line 893, also pass `defaultSubTab="types"` when `settingsDeepLink === 'review-queue'`:
```
<CategoriesSection 
  defaultTab={settingsDeepLink === 'review-queue' ? 'certificates' : undefined}
  defaultSubTab={settingsDeepLink === 'review-queue' ? 'types' : undefined}
/>
```

### Files changed
- `src/hooks/useNeedsReviewCount.ts` — query filter change (3 lines)
- `src/components/CategoriesSection.tsx` — add `defaultSubTab` prop + wire it (2 lines)
- `src/pages/AdminDashboard.tsx` — pass `defaultSubTab` prop (1 line)

### Not changed
- Card visual design, grid layout, other stat cards
- `CertificateReviewQueue` component
- Database schema

