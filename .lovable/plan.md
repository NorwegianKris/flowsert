

## Standardize Search/Label Bar Width Across All Tabs

Cosmetic only. No schema changes. 🟢

### Problem
- Projects search bar is full-width — too long
- Personnel search bar uses `flex-1 sm:max-w-80` (320px)
- Overview tab has no static label field yet

### Changes

**1. `src/components/ProjectsTab.tsx` (line 70)**
Constrain the Projects search bar wrapper from full-width to a fixed max-width. Change:
```tsx
<div className="relative">
```
to:
```tsx
<div className="relative max-w-80">
```
This caps it at 320px — right after the ellipsis in the placeholder text.

**2. `src/pages/AdminDashboard.tsx` (lines 725-738)**
Add the static "Compliance Overview" input on the left, same `max-w-80` width:
```tsx
<div className="flex items-center justify-between gap-4">
  <div className="relative max-w-80">
    <Input
      readOnly
      tabIndex={-1}
      value="Compliance Overview"
      className="border-border text-muted-foreground cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
    />
  </div>
  <FreelancerFilters ... />
</div>
```

**3. `src/pages/AdminDashboard.tsx` (line 617)**
Personnel search bar — change `flex-1 sm:max-w-80` to just `max-w-80` (drop `flex-1`) so all three bars share the identical fixed max-width without stretching.

All three bars: `max-w-80` (320px), same `Input` component = identical dimensions.

