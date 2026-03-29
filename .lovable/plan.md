

## Plan: Three fixes to grouped project header

### File: `src/components/ProjectDetail.tsx`

### Fix 1: "— Now" indicator (line 316)

Replace the current `isWithinInterval` logic with simple date comparison and add debug console.log:

```tsx
{siblings.map((s, idx) => {
  const sStart = parseISO(s.startDate);
  const sEnd = s.endDate ? parseISO(s.endDate) : null;
  const isNow = sEnd ? (today >= sStart && today <= sEnd) : false;
  console.log('[ShiftSelector]', {
    shift: s.shiftNumber,
    today: today.toISOString(),
    sStart: s.startDate,
    sEnd: s.endDate,
    isNow,
  });
  // ... rest unchanged
```

This removes `isWithinInterval` entirely and uses plain `>=`/`<=` comparison. The console.log will reveal if the date ranges overlap or if the comparison is working correctly.

### Fix 2: Duration stat (line 349)

The `duration` variable on line 131 uses `selectedShiftProject.startDate/endDate`, which should be correct. But `selectedShiftProject` depends on `selectedShiftId` state — if the state isn't updating, duration won't change. Add a console.log right after line 131:

```tsx
console.log('[ShiftDuration]', {
  selectedId: selectedShiftProject.id,
  projectId: project.id,
  start: selectedShiftProject.startDate,
  end: selectedShiftProject.endDate,
  duration,
});
```

This will confirm whether `selectedShiftProject` is actually switching when a shift pill is clicked, or if it's stuck on the parent project.

### Fix 3: Stat cards visual match (lines 334-379)

Replace the borderless `div` stat cells inside the wrapper card with actual `Card` components matching the regular project stats. Change the Zone 3 section from:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 pb-6 pt-4 border-t border-teal-500/20">
  <div className="flex items-center gap-3">...</div>
  ...
</div>
```

To a separate grid of `Card` components **outside** the wrapper card (after its closing `</div>`), matching the regular project stat card pattern exactly:

```tsx
{/* Close the wrapper card div here */}
</div>

{/* Zone 3 — Shift Stats as separate cards, matching regular project */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-violet-500/10">
        <Users className="h-5 w-5 text-violet-500" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{assignedPersonnel.length}</p>
        <p className="text-xs text-muted-foreground">Personnel</p>
      </div>
    </CardContent>
  </Card>
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-sky-500/10">
        <Clock className="h-5 w-5 text-sky-500" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{duration || '—'}</p>
        <p className="text-xs text-muted-foreground">Shift days</p>
      </div>
    </CardContent>
  </Card>
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-emerald-500/10">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{complianceStats.valid}/{complianceStats.total}</p>
        <p className="text-xs text-muted-foreground">Certs valid</p>
      </div>
    </CardContent>
  </Card>
  <Card className="border-border/50">
    <CardContent className="p-4 flex items-center gap-3">
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
    </CardContent>
  </Card>
</div>
```

This gives each stat its own `Card` with `border-border/50` — identical to the regular project stat cards at lines 470-510.

### Summary
1. Line 316: Replace `isWithinInterval` with `today >= sStart && today <= sEnd`, add console.log
2. After line 131: Add console.log for duration debugging
3. Lines 334-379: Move stats outside wrapper card, use individual `Card` components matching regular project style

### No changes to
- Non-grouped projects
- Schema/RLS/backend
- Content below header

### Risk
Q5 — UI styling + debug logging only.

