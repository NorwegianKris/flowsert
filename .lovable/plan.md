

## Add "Clear All" Button

Add a "Clear all" button next to the existing "Upload More Samples" button on line 462. It calls the existing `reset()` function which already clears files, suggestions, and sets processed to false.

**Change in `src/components/TaxonomySeedingTool.tsx` (~line 462):**

```tsx
// Before
<Button variant="outline" size="sm" onClick={() => setProcessed(false)}>Upload More Samples</Button>

// After
<div className="flex gap-2">
  <Button variant="outline" size="sm" onClick={() => setProcessed(false)}>Upload More Samples</Button>
  <Button variant="ghost" size="sm" onClick={reset} className="text-destructive">Clear All</Button>
</div>
```

Single line change, uses the existing `reset()` function. Ghost + destructive text styling per project conventions for a secondary destructive action.

