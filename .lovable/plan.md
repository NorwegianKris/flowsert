
# Add Active Count & Tier to Profile Activation Overview Bar

## What This Does
Adds the active user count and current billing tier as smaller text on the right side of the "Profile Activation Overview" bar (to the left of the chevron arrow), keeping the bar the same height.

## Change

### `src/pages/AdminDashboard.tsx` (lines 629-633)

Replace the current inner content of the CollapsibleTrigger with:

```tsx
<div className="flex items-center gap-2">
  <ShieldCheck className="h-5 w-5 text-primary" />
  <span className="font-semibold text-lg">Profile Activation Overview</span>
</div>
<div className="flex items-center gap-3">
  <span className="text-xs text-muted-foreground">
    {personnel.filter(p => p.activated).length} active &mdash;
    {personnel.filter(p => p.activated).length >= 76
      ? ' Tier 3'
      : personnel.filter(p => p.activated).length >= 26
        ? ' Tier 2'
        : ' Tier 1'}
  </span>
  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
</div>
```

The title stays on the left, and the active count + tier appears as small muted text on the right, just before the expand arrow. No height change to the bar.
