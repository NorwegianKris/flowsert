

## Fix: Sort Button Sizing & Filter Label Readability

**File: `src/components/PersonnelFilters.tsx`**

### Changes

1. **Sort button (line 399)**: Remove `min-w-[180px]` and add `text-xs` to make the text smaller so it fits naturally.
   - Change: `className="ml-auto h-9 justify-between min-w-[180px] bg-primary ..."` → `className="ml-auto h-9 justify-between text-xs bg-primary ..."`

2. **Sort button span (line 401)**: Remove `truncate` class so the label displays fully.

3. **Filter buttons**: Remove `truncate` from the span inside each filter trigger so labels show in full:
   - Availability (line 131): remove `truncate`
   - Location (line 175): remove `truncate`
   - Certificates (line 223): remove `truncate`
   - Department (line 319): remove `truncate`
   - Compliance (line 368): remove `truncate`

4. **Filter button min-widths**: Remove `min-w-[160px]`/`min-w-[180px]` from filter buttons so they size naturally to their content. This prevents them from being wider than needed while still showing full labels.

