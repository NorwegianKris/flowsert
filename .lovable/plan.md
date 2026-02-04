
# Phase 2 Implementation: Admin Cleanup Tools & EditCertificateDialog Update

## Final Refinements Incorporated

Based on your feedback, I'm incorporating these 5 additional guardrails:

### 1. Bulk Update Cap with Safe Path Forward
When a group exceeds 500 certificates, I'll:
- Show a warning explaining the limit
- Offer two options:
  - **Split into batches**: Process in 500-record chunks with confirmation for each
  - **Use Backfill Tool**: Link to the Backfill Tool pre-filtered for that `title_normalized`

### 2. Cursor-Based Backfill with `created_at`
Since the `certificates` table has `created_at`, I'll use:
```sql
ORDER BY created_at ASC, id ASC
WHERE (created_at, id) > (last_created_at, last_id)
```
This ensures stable, idempotent pagination even if data changes mid-run.

### 3. Review Queue Null Safety
The grouped query will explicitly exclude null/empty `title_normalized`:
```sql
WHERE title_normalized IS NOT NULL 
  AND title_normalized != ''
  AND needs_review = true
  AND unmapped_by IS NULL
```
A separate "Unmapped Titles" bucket will handle certificates with null/empty normalized titles.

### 4. Edit Dialog Alias Lookup Debounce
Title changes will trigger alias lookups with a 400ms debounce using `useEffect` + `setTimeout`, preventing excessive queries during typing.

### 5. Subtle Alias-Existence Indicators
Instead of prominent badges, I'll use:
- A small info icon next to the type selector
- Tooltip on hover: "Alias exists for this name" or "No alias exists for this name"
- Only visible when type selector is focused or after title changes

---

## Implementation Order

### Task 1: Update EditCertificateDialog.tsx

**Changes:**
- Add `CertificateTypeSelector` component with role-based behavior
- Add state tracking: `selectedTypeId`, `originalTypeId`, `titleChanged`, `aliasExists`, `aliasLoading`
- Implement debounced alias lookup (400ms) when name changes
- Don't auto-remap if `originalTypeId` is set - just show informational status
- Add subtle tooltip for alias existence indicator
- Add "Remember this name" checkbox for admins (with ambiguity warning)
- Update submit handler with `title_raw`, `title_normalized`, `certificate_type_id`, `needs_review`

**Key Logic:**
```typescript
// On dialog open:
if (certificate.certificate_type_id) {
  // Preserve existing mapping
  setOriginalTypeId(certificate.certificate_type_id);
  setSelectedTypeId(certificate.certificate_type_id);
  // Run alias lookup for INFO ONLY, don't auto-select
}

// On title change (debounced 400ms):
if (selectedTypeId && !titleChanged) {
  // Keep existing type, just update alias indicator
} else if (!originalTypeId) {
  // Pre-select from alias match (suggestion)
}
```

### Task 2: Create CertificateTypesManager.tsx

**Features:**
- List all certificate types with category links
- Create new types with name, description, category dropdown
- Edit existing types
- Archive (soft delete) with usage count warning
- Restore archived types
- Filter toggle: Active / Archived / All

### Task 3: Create CertificateAliasesManager.tsx

**Features:**
- List aliases grouped by certificate type
- Show normalized alias, raw example, last-seen, confidence
- Delete individual aliases
- Reassign alias to different type via dropdown

### Task 4: Create useCertificatesNeedingReview.ts Hook

**Features:**
- Optimized JOIN query (not IN subquery)
- Grouped by `title_normalized` with explicit source indicators
- Excludes null/empty `title_normalized` (handled separately)
- Returns: count, raw_examples, has_worker_selected_type, worker_selected_type_ids, example_personnel_names

```typescript
// Uses JOIN for performance
const query = supabase
  .from('certificates')
  .select(`
    title_normalized,
    certificate_type_id,
    title_raw,
    personnel!inner(business_id, name)
  `)
  .eq('personnel.business_id', businessId)
  .eq('needs_review', true)
  .is('unmapped_by', null)
  .not('title_normalized', 'is', null)
  .neq('title_normalized', '');
```

### Task 5: Create CertificateReviewQueue.tsx

**Features:**
- Grouped table by `title_normalized`
- Show count, sample raw titles, source badge (Worker-selected vs Unmatched)
- Show example personnel names
- Actions:
  - **Map to Type**: Select from dropdown + optional "Create alias" checkbox
  - **Create New Type**: Inline creation + auto-creates alias
  - **Mark Unmapped**: Opens `MarkUnmappedDialog`
- Bulk update with 500-record cap:
  - If under 500: Show `BulkUpdateConfirmDialog` with preview
  - If over 500: Offer split batches OR link to Backfill Tool
- Separate "Unmapped Titles" bucket for null/empty normalized titles

### Task 6: Create BulkUpdateConfirmDialog.tsx

**Features:**
- Shows count of certificates to update
- Shows normalized title and target type
- Shows "Create alias" checkbox state
- Confirm/Cancel buttons
- Loading state during update

### Task 7: Create CertificateBackfillTool.tsx

**Features:**
- Admin-only button: "Standardize Existing Certificates (Safe)"
- Cursor-based pagination using `(created_at, id)`:
```typescript
const cursor = { lastCreatedAt: string | null, lastId: string | null };

// Query:
query.order('created_at', { ascending: true })
     .order('id', { ascending: true })
     .limit(200);

if (cursor.lastCreatedAt && cursor.lastId) {
  query.or(`created_at.gt.${cursor.lastCreatedAt},and(created_at.eq.${cursor.lastCreatedAt},id.gt.${cursor.lastId})`);
}
```
- Progress display with percentage
- Stats: Matched, Needs Review, Processed
- Pause/Resume capability
- Idempotent: safe to run multiple times

### Task 8: Update CategoriesSection.tsx

**Changes:**
- Add "Standardization" as a top-level tab (not nested)
- Tab contains sub-sections:
  - Certificate Types
  - Aliases
  - Review Queue
  - Backfill Tool
- Update grid from `grid-cols-4` to `grid-cols-5`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/CertificateTypesManager.tsx` | CRUD for canonical types with archive support |
| `src/components/CertificateAliasesManager.tsx` | Alias management UI |
| `src/components/CertificateReviewQueue.tsx` | Needs-review cleanup with batching |
| `src/components/CertificateBackfillTool.tsx` | Cursor-based safe backfill |
| `src/components/BulkUpdateConfirmDialog.tsx` | Confirm dialog for bulk mapping |
| `src/hooks/useCertificatesNeedingReview.ts` | Optimized grouped query |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditCertificateDialog.tsx` | Add type selector, debounced alias lookup, role-based logic |
| `src/components/CategoriesSection.tsx` | Add "Standardization" tab |

---

## Technical Details

### Debounced Alias Lookup (EditCertificateDialog)
```typescript
const [debouncedName, setDebouncedName] = useState(name);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedName(name);
  }, 400);
  return () => clearTimeout(timer);
}, [name]);

const { data: aliasMatch, isLoading: aliasLoading } = useLookupAlias(
  titleChanged ? debouncedName : null
);
```

### Bulk Update with Split Batches
```typescript
const MAX_BATCH_SIZE = 500;

if (certificateCount > MAX_BATCH_SIZE) {
  // Show dialog with options:
  // 1. Split into N batches (N = ceil(count/500))
  // 2. Use Backfill Tool (link with pre-filter)
}
```

### Cursor State for Backfill
```typescript
interface BackfillCursor {
  lastCreatedAt: string | null;
  lastId: string | null;
}

interface BackfillState {
  cursor: BackfillCursor;
  totalProcessed: number;
  totalMatched: number;
  totalNeedsReview: number;
  isRunning: boolean;
  isComplete: boolean;
  isPaused: boolean;
}
```

---

## Safety Constraints Maintained

| Constraint | How It's Enforced |
|------------|-------------------|
| No auto-remap if already mapped | Check `originalTypeId` before any auto-selection |
| Title changes don't override type | Only show alias info, require explicit user action |
| Debounced alias lookups | 400ms debounce prevents query spam |
| Bulk updates capped at 500 | With split batch OR backfill tool handoff |
| Cursor-based backfill | Uses `(created_at, id)` for stable pagination |
| Null title_normalized handled | Separate bucket, excluded from main grouping |
| Subtle alias indicators | Tooltip/helper text, not prominent badges |
