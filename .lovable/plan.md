

## Plan: Redesign grouped header to match regular project visual system

### File: `src/components/ProjectDetail.tsx`

### Current state
The grouped header (lines 268-374) already has the 3-zone structure but uses a different visual treatment than regular projects: `gap-px bg-border` grid for stats instead of individual Card components, centered text alignment, and slightly different proportions.

### Changes

**1. Zone 1 — Header body (lines 273-307): Add shift count to subtitle**

Add `{siblings.length} shifts` to the subtitle filter array (line 294-302) after the rotation pattern.

**2. Zone 2 — Shift selector (lines 310-330): Already correct**

Already uses `bg-primary`, white pills, per-sibling `isWithinInterval`. The "— Now" bug: the current logic at line 315 already checks per-sibling with `sStart`/`sEnd` and guards `sEnd` existence. If both show "— Now", it's a data overlap issue (Shift 1 end equals Shift 2 start, and `isWithinInterval` is inclusive on both bounds). Fix by making the end exclusive — subtract 1 day or use `isBefore(today, sEnd)` as additional guard.

**Fix**: Change line 315 from inclusive interval to: only show "Now" if `today >= sStart && today < sEnd` (exclusive end), OR for the last sibling use inclusive end. This prevents overlap when Shift 1's endDate equals Shift 2's startDate.

```tsx
const isNow = sEnd ? (() => {
  try {
    const isLastSibling = siblings.indexOf(s) === siblings.length - 1;
    if (isLastSibling) {
      return isWithinInterval(today, { start: sStart, end: sEnd });
    }
    // Exclusive end for non-last siblings to prevent overlap
    return today >= sStart && today < sEnd;
  } catch { return false; }
})() : false;
```

**3. Zone 3 — Stat cards (lines 332-373): Match regular project stat card style**

Replace the `gap-px bg-border` grid with a `grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 pt-4` layout using the same left-aligned style as non-grouped stats (icon in colored circle + text right). Each stat cell styled identically to the regular `Card > CardContent p-4 flex items-center gap-3` pattern but without individual card borders (they're inside the wrapper card).

Replace lines 332-373 with:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 pb-6 pt-4 border-t border-teal-500/20">
  {/* Personnel */}
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-violet-500/10">
      <Users className="h-5 w-5 text-violet-500" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{assignedPersonnel.length}</p>
      <p className="text-xs text-muted-foreground">Personnel</p>
    </div>
  </div>
  {/* Duration */}
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-sky-500/10">
      <Clock className="h-5 w-5 text-sky-500" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{duration || '—'}</p>
      <p className="text-xs text-muted-foreground">Shift days</p>
    </div>
  </div>
  {/* Compliance */}
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-emerald-500/10">
      <CheckCircle className="h-5 w-5 text-emerald-500" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{complianceStats.valid}/{complianceStats.total}</p>
      <p className="text-xs text-muted-foreground">Certs valid</p>
    </div>
  </div>
  {/* Next shift */}
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-amber-500/10">
      <Calendar className="h-5 w-5 text-amber-500" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">
        {daysUntilNextShift !== null
          ? (daysUntilNextShift < 0 ? `${Math.abs(daysUntilNextShift)}d ago` : `In ${daysUntilNextShift}d`)
          : '—'}
      </p>
      <p className="text-xs text-muted-foreground">
        {daysUntilNextShift !== null
          ? (daysUntilNextShift < 0 ? 'Next shift started' : 'Next shift starts')
          : 'Last shift'}
      </p>
    </div>
  </div>
</div>
```

**4. Wrapper border (line 271): Use softer tint**

Change `border-teal-500/50` to `border-teal-500/30` to match the softer feel requested.

### Summary of changes
1. Line 271: border tint `border-teal-500/50` → `border-teal-500/30`
2. Lines 294-302: Add `${siblings.length} shifts` to subtitle
3. Line 315: Fix "— Now" overlap with exclusive end boundary for non-last siblings
4. Lines 332-373: Replace centered grid-gap stat layout with left-aligned icon+text matching regular project stats

### No changes to
- Non-grouped projects
- Content below header
- Schema/RLS/backend

### Risk
Q5 — purely UI styling/display change.

