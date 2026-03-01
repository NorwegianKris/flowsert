

## Plan: Fix click propagation on "Teach the System" collapsible

**File: `src/components/TaxonomySeedingTool.tsx`**

The `CollapsibleTrigger` (around line 168) needs `onClick={(e) => e.stopPropagation()}` added to prevent the click from bubbling up to the Settings panel's parent handler.

Single line change — add the `onClick` prop to the existing `<CollapsibleTrigger>` element.

