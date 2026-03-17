

## Fix: Make Accordion Expand Indicator Visible

### Problem
The Accordion **is already implemented** in `CertificateCategoriesInner` (lines 311-348 of `CategoriesSection.tsx`). However, the class `[&>svg]:hidden` on line 316 hides the default chevron icon from the AccordionTrigger, making rows look flat and non-interactive. Clicking them does expand — but there's no visual cue.

### Fix in `src/components/CategoriesSection.tsx`

**Line 316** — Remove `[&>svg]:hidden` from the AccordionTrigger className so the chevron arrow is visible and rotates on open/close:

```tsx
// Before:
<AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-accent/50 transition-colors [&>svg]:hidden">

// After:
<AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-accent/50 transition-colors">
```

This single change makes the chevron visible, providing the standard accordion affordance. The expand/collapse functionality is already working.

### Files modified
- `src/components/CategoriesSection.tsx` — remove `[&>svg]:hidden` from AccordionTrigger (line 316)

