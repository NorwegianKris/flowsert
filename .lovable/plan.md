

# Add Collapsible Expiry List View Below Event Timeline

## Summary
Add a collapsible list view of expiring/expired certificates directly below the Event Timeline chart in the ExpiryTimeline component. This provides a scannable, detailed complement to the visual timeline -- showing person, certificate, expiry date, and status in a structured list grouped by urgency.

## Changes

### 1. Update: `src/components/ExpiryTimeline.tsx`

Below the `<TimelineChart />` component (after line 302), add a new collapsible section using the existing `Collapsible` component from Radix UI.

**Structure:**
- A collapsible trigger button labeled "Expiry Details" with a count badge and chevron icon
- Default state: collapsed
- When expanded, shows a list of all timeline events (filtered by the same type/category filters and zoom range) grouped by status lane (Overdue, Next 30 Days, 31-60, etc.)

**List layout per group:**
- Group header: colored status label with certificate count (e.g., "Overdue (4)")
- Each row shows: Person name | Certificate name | Expiry date (formatted) | Days remaining badge
- Rows are sorted by expiry date (soonest first)
- Clicking a row navigates to the Personnel tab filtered to that person (reuses existing `navigate` logic)

**Filtering:**
- Respects the same `selectedTypeId`, `selectedCategoryId`, `timelineStartDays`, and `timelineEndDays` filters already applied to `timelineEvents`
- Only shows events within the current visible range

**Visual style:**
- Muted border, compact rows (py-2), small text (text-sm/text-xs)
- Status-colored dot or badge per row matching existing lane colors
- Scrollable if many items, but no fixed height -- renders inline

### Technical Details

**New imports in ExpiryTimeline.tsx:**
- `Collapsible, CollapsibleContent, CollapsibleTrigger` from `@/components/ui/collapsible`
- `ChevronsUpDown` or `ChevronDown` from `lucide-react`
- `format` from `date-fns`
- `Badge` from `@/components/ui/badge`

**Grouping logic:**
Uses the existing `getLaneConfigsForRange(timelineEndDays)` to determine which groups to show, then filters `timelineEvents` into buckets by their `status` field. Empty groups are hidden.

**New state:**
```ts
const [listOpen, setListOpen] = useState(false);
```

**Event filtering for visible range:**
Reuses `timelineEvents` (already filtered by type/category), additionally filtered to only include events where `daysUntilExpiry` falls within `[timelineStartDays, timelineEndDays]`.

**Row click handler:**
Navigates using the same pattern as `handleGroupClick` -- constructs URL params and navigates to `/admin?tab=personnel&...` with appropriate filters.

### No other files change
All data and filtering logic already exists in `timelineEvents`. This is purely a UI addition within the existing component.

