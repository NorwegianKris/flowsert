

# Plan: Standardize Toggle Bar Colors to Universal Purple

## Summary

Update all toggle bars (TabsList components) across the system to use the same purple color scheme as the main dashboard toggle bar (Personnel - Calendar - Projects). This will be achieved by modifying the base UI component defaults, ensuring consistency throughout the application.

## Current State

| Component | Current Styling | Location |
|-----------|-----------------|----------|
| Main Dashboard Tabs | Purple (`bg-primary`) | `AdminDashboard.tsx:379` |
| Settings Categories | Gray (`bg-muted` default) | `CategoriesSection.tsx:24` |
| Certificate Sub-tabs | Gray (default) | `CategoriesSection.tsx:63` |
| Certificate Types Manager | Gray (default) | `CertificateTypesManager.tsx:72, 245` |
| Project Detail Tabs | Gray (default) | `ProjectDetail.tsx:275` |
| Company Card Tabs | Gray (default) | `CompanyCard.tsx:413` |
| Admin/Personnel Tabs | Gray (default) | `AdminDashboard.tsx:511` |
| Invite/Assign Toggle | Gray (`bg-muted/50`) | `AddProjectDialog.tsx:554` |

## Solution Approach

**Option A: Modify Base Component Defaults (Recommended)**

Update `src/components/ui/tabs.tsx` to use purple styling by default. This approach:
- Ensures all tabs use the same style automatically
- Reduces code duplication
- Makes future consistency easier to maintain

**Option B: Update Each Component Individually**

Apply the purple styling classes to each TabsList individually. This approach:
- More verbose and repetitive
- Easier to miss locations
- Harder to maintain long-term

I will use **Option A** - updating the base component defaults.

## Technical Changes

### File 1: `src/components/ui/tabs.tsx`

**TabsList Changes**

Current:
```tsx
"inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground"
```

Updated:
```tsx
"inline-flex h-10 items-center justify-center rounded-md bg-primary p-1 text-primary-foreground"
```

**TabsTrigger Changes**

Current:
```tsx
"... data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ..."
```

Updated:
```tsx
"... data-[state=active]:bg-primary-foreground data-[state=active]:text-primary data-[state=active]:shadow-sm ..."
```

### File 2: `src/components/ui/toggle.tsx`

Update the toggle variants to use purple for the active state:

Current:
```tsx
"... data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
```

Updated:
```tsx
"... data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
```

### File 3: `src/pages/AdminDashboard.tsx`

Remove the custom purple styling from the main dashboard tabs since it will now be the default:

Current (line 379):
```tsx
<TabsList className="grid w-full grid-cols-3 bg-primary p-1.5 h-12">
```

Updated:
```tsx
<TabsList className="grid w-full grid-cols-3 p-1.5 h-12">
```

Also update the triggers (lines 380, 384, 388) - remove custom color overrides.

Similar cleanup for Admin/Personnel tabs (lines 511-520).

### File 4: `src/components/AddProjectDialog.tsx`

Update the mode toggle group container:

Current (line 554):
```tsx
<div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
```

Updated:
```tsx
<div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
```

## Visual Result

All toggle bars throughout the system will have:
- **Background**: Purple (`bg-primary`)
- **Inactive Text**: White (`text-primary-foreground`)
- **Active Tab**: White background with purple text (`bg-primary-foreground text-primary`)

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/tabs.tsx` | Update TabsList and TabsTrigger default colors |
| `src/components/ui/toggle.tsx` | Update active state colors |
| `src/pages/AdminDashboard.tsx` | Remove custom overrides (now default) |
| `src/components/AddProjectDialog.tsx` | Update toggle container background |

## Verification After Implementation

1. Navigate to Admin Dashboard - confirm main tabs are still purple
2. Go to Settings - confirm all category tabs are purple
3. Open a Project Detail - confirm tabs are purple
4. Open Company Card - confirm tabs are purple
5. Open Add Project dialog - confirm Invite/Assign toggle is purple-themed

