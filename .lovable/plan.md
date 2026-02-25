

# Make Categories and Admin Users Sections Collapsible

## What needs to change

Two sections in the Settings panel are currently rendered directly without a collapsible wrapper:
- **AdminOverview** (line 685 in AdminDashboard.tsx) — the "Admin Users" card
- **CategoriesSection** (line 722 in AdminDashboard.tsx) — the "Categories" card

All other settings sections (Activation Overview, Billing, Standardize Locations) already use the collapsible pattern with the standardized trigger styling.

## Changes

### File: `src/pages/AdminDashboard.tsx`

**1. Wrap `<AdminOverview />` (line 685) in a Collapsible**, using the same trigger pattern as the existing sections:
- Icon: `Shield` (already imported and used inside AdminOverview)
- Label: "Admin Users"
- ChevronDown with rotate-180 on open

**2. Wrap `<CategoriesSection />` (line 722) in a Collapsible**:
- Icon: `Award` (consistent with the categories concept)
- Label: "Categories"
- ChevronDown with rotate-180 on open

Both will use the exact same trigger class: `"flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group"`

### File: `src/components/AdminOverview.tsx`

Remove the outer `<Card>` wrapper (the `<Card>`, `<CardHeader>`, `<CardContent>` wrappers) since the collapsible trigger in AdminDashboard will now serve as the section header. The inner content (admin list, dialogs) stays as-is.

### File: `src/components/CategoriesSection.tsx`

Remove the outer `<Card>` wrapper (`<Card>`, `<CardHeader>`, `<CardContent>`) since the collapsible trigger in AdminDashboard will serve as the section header. The inner `<Tabs>` content stays as-is.

### Imports in AdminDashboard.tsx

Add `Award` to the existing lucide-react import (line 23). `Shield` is already available via `ShieldCheck`.

## Scope

- Purely UI layout (Q5: green, anchor optional)
- No database, RLS, auth, or edge function changes

