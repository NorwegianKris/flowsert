

## Add Category Filtering with "Show All" Toggle to CertificateTypeSelector

**Risk: 🟢 anchor optional** — purely UI text/layout change.

### Current State
- `CertificateTypeSelector` has no `categoryFilter` prop — it always shows all types grouped by category
- `CertificateType` already has `category_id` and `category_name` from the joined query

### Changes — `src/components/CertificateTypeSelector.tsx`

1. **Add new prop** `categoryFilter?: string | null` — when set, filters `groupedTypes` to only types matching this `category_id`

2. **Add local state** `showAllCategories` (boolean, default `false`) — resets to `false` whenever `categoryFilter` changes

3. **Update `groupedTypes` memo** to apply category filtering:
   - If `categoryFilter` is set AND `showAllCategories` is false: filter types to only those where `type.category_id === categoryFilter`
   - Otherwise: show all types (current behavior)

4. **Add toggle at bottom of `CommandList`** (after all `CommandGroup` blocks, before the "Create new" group):
   - Only visible when `categoryFilter` is set
   - When filtered: show a small button/link — "Show all categories" with a chevron icon
   - When showing all: show "Show selected category only" to toggle back
   - Styled as a subtle `text-xs text-muted-foreground` clickable element with padding, matching existing dropdown styling

5. **Apply in both render paths** (the `allowFreeText` branch and the standard dropdown branch)

### No other changes
- No schema changes
- No changes to how `categoryFilter` is passed (callers can adopt it when ready)
- Existing behavior unchanged when `categoryFilter` is not provided

