

## Fix Personnel Search Field Background

Cosmetic only. No schema changes. 🟢

**Root cause**: The search Input on the admin Personnel tab (line 621 of `AdminDashboard.tsx`) has an explicit `bg-background` class that overrides the base `bg-white dark:bg-card` we set globally on the Input component.

### Change (1 file)

**`src/pages/AdminDashboard.tsx`** line 621 — remove `bg-background` from the className, keeping `pl-10 border-border`.

