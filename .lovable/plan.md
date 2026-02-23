

## Apply Yellow Info Frame to All Lightbulb Tips

**Risk: GREEN** -- purely UI styling, no DB/auth/RLS changes.

### Reference Style (from AddProjectDialog)

The yellow frame pattern already exists:
```
bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5
```

### Files and Changes

**1. `src/components/CategoriesSection.tsx`** -- 2 instances

- **Lines 52-55** (Workers tab hint): Wrap the existing `<span>` in a styled `<div>` with the amber frame classes.
- **Lines 95-98** (Certificates tab hint): Same treatment.

Both currently use plain `<span className="flex items-center gap-1.5 text-sm text-muted-foreground">`. They will become:
```tsx
<div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
  <span className="text-sm">💡</span>
  <span className="text-xs text-muted-foreground">
    Roles define job categories; Worker Groups organize personnel into custom teams.
  </span>
</div>
```

**2. `src/components/AvailabilityCalendar.tsx`** -- 1 instance

- **Lines 449-451**: Replace the plain `<p>` with the amber-framed `<div>` wrapper.

**3. `src/components/certificate-upload/UploadZone.tsx`** -- 1 instance

- **Lines 119-121**: Replace the plain `<p>` with the amber-framed `<div>` wrapper, separating the lightbulb emoji into its own `<span>`.

### Summary

4 lightbulb tips across 3 files will be updated to match the yellow info frame style from AddProjectDialog. The AddProjectDialog instance already has the correct styling and needs no changes.

