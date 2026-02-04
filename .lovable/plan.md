

# Rename "Domains" to "Categories" (Terminology Adjustment)

## Summary

This is a terminology-only update to the Certificates sub-tab. The tab is already named "Categories" in the current code, so the only change needed is updating the helper text to be more descriptive.

---

## Change Required

### File: `src/components/CategoriesSection.tsx`

**Update helper text for the Categories sub-tab (lines 72-76):**

| Current | New |
|---------|-----|
| "Define certificate categories that personnel can upload." | "Define broad certificate categories such as Welding, Diving, Inspection, or Safety." |

---

## What Stays the Same

- Tab name remains "Categories" (already correct)
- Certificate Types remain specific canonical definitions
- Organize remains the primary workflow for grouping/confirming
- Advanced section unchanged (Aliases + Backfill)
- No backend or schema changes
- No other UI changes

---

## Technical Details

Single line change in `CategoriesSection.tsx`:

```tsx
// Line 73-75: Update from
<p className="text-sm text-muted-foreground">
  Define certificate categories that personnel can upload.
</p>

// To
<p className="text-sm text-muted-foreground">
  Define broad certificate categories such as Welding, Diving, Inspection, or Safety.
</p>
```

