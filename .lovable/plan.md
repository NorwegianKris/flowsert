

## Make Filter Sections Collapsible (Closed by Default) in New Project Dialog

### What Changes
Inside the New Project dialog's filter popover (the one that opens when you click the "Filters" button), each filter section -- Availability, Job Role, Location, Certificates, and Department -- will be wrapped in a collapsible accordion that starts **closed** by default. You click a section header to expand it and see its options.

This eliminates the awkward scrolling that happens when all filter sections and their checkbox lists are visible at once.

### How It Will Look
- Click "Filters" button -- the popover opens showing 5 compact section headers (e.g., "Availability", "Job Role", "Location", "Certificates", "Department")
- Click any header to expand it and see its filter options
- Click again to collapse
- Active filters on a section will show a count badge on the header so you know filters are applied even when collapsed

### Technical Details

**File modified:** `src/components/AddProjectDialog.tsx`

1. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronRight` from `lucide-react`
2. Wrap each of the 5 filter sections (lines ~793-945) in a `Collapsible` component with `defaultOpen={false}`
3. Replace the current `Label` headers with `CollapsibleTrigger` buttons styled as clickable rows with:
   - The filter name and icon on the left
   - A chevron icon on the right that rotates when expanded
   - A small badge showing the count of active selections for that filter (if any)
4. Wrap the filter content (checkboxes, calendar picker, toggle group) in `CollapsibleContent`
5. No new state variables needed -- `Collapsible` manages its own open/closed state internally with `defaultOpen`

