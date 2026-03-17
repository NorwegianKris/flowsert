

## Fix: Show Suggestions While Adding More Files + Clickable "New Type" Badge

### Problem 1: Suggestions disappear when adding more files
The condition on line 424 (`processed && !addingMore`) hides the entire summary + suggestions section when `addingMore` is true. The file list and suggestions should remain visible below the upload zone.

### Problem 2: No link between file row and suggestion card
Files with "New type suggested" badge have no way to navigate to the corresponding suggestion card below.

### Changes in `src/components/TaxonomySeedingTool.tsx`

**1. Show suggestions while in addingMore mode**

Change line 424 from:
```tsx
{processed && !addingMore && (
```
to:
```tsx
{processed && (
```

This keeps the summary, suggestion cards, and action buttons visible even when the upload zone is showing via `addingMore`.

**2. Add suggestion refs + scroll-to-highlight on "New type suggested" click**

- Add a `suggestionRefs` ref: `useRef<Record<string, HTMLDivElement | null>>({})` 
- Add a `highlightedSuggestion` state for briefly highlighting the target card
- On each suggestion card div (line 451), attach `ref` via `suggestionRefs.current[s.id]`
- On the "New type suggested" Badge (line 405-409), find the matching suggestion by comparing `extractedName` with `normalizeCertificateTitle`, then `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` and set highlight state with a 1.5s timeout
- Add a conditional ring/outline class on the suggestion card when highlighted

### Files modified
- `src/components/TaxonomySeedingTool.tsx`

