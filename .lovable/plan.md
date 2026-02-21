

## Prompt Risk Assessment: 🟢 Anchor Optional
Both changes are purely UI-level -- badge labeling and tip text. No database, auth, or access control changes.

---

## Bug 1: Posted projects shown as "Active" in Request for Project dialog

**Root Cause:** In `RequestProjectDialog.tsx`, the `statusConfig` map (lines 21-25) only has entries for `active`, `completed`, and `pending`. Projects with `isPosted: true` still have a DB status of `active` or `pending`, so they display with the "Active" badge. The dialog does not check `isPosted` at all.

**Fix:** `src/components/RequestProjectDialog.tsx`

- Import `Megaphone` from `lucide-react`
- When rendering each project's badge (line 105-136), check `project.isPosted`. If true, override the badge to show "Posted" with the purple Megaphone styling used in `ProjectsTab.tsx` (`bg-[#C4B5FD] text-[#4338CA]`)
- The `Project` type from `useProjects` already includes the `isPosted` field

```tsx
// In the map callback, before rendering the badge:
const isPosted = project.isPosted;

// Badge rendering:
{isPosted ? (
  <Badge className="bg-[#C4B5FD] text-[#4338CA] border-[#C4B5FD] shrink-0 text-xs">
    <Megaphone className="h-3 w-3 mr-1" />
    Posted
  </Badge>
) : (
  <Badge variant={config.variant} className="shrink-0 text-xs">
    <StatusIcon className="h-3 w-3 mr-1" />
    {config.label}
  </Badge>
)}
```

---

## Feature 2: Add tip text to certificate upload zone

**Fix:** `src/components/certificate-upload/UploadZone.tsx`

Add a tip line below the upload zone (in the full upload view, after the dashed box) with a lightbulb emoji:

```tsx
<p className="text-xs text-muted-foreground mt-2">
  💡 Upload one certificate at a time. Make sure it is a clear photo, scan, or document for best results.
</p>
```

This will be placed after the existing helper text inside the dashed upload zone area, below the "Select up to X files" line.

---

## Summary

| File | Change |
|------|--------|
| `src/components/RequestProjectDialog.tsx` | Check `isPosted` and show purple "Posted" badge with Megaphone icon instead of "Active" |
| `src/components/certificate-upload/UploadZone.tsx` | Add lightbulb tip text about uploading one clear certificate at a time |
