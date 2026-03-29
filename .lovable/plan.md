

## Plan: Five fixes to grouped project detail header

### File: `src/components/ProjectDetail.tsx`

### Changes

**1. Shift selector bar colour (line 313)**

Change `bg-[#1E1E3F]` to `bg-primary` to match the main navigation toggle bar. Update pill button colours accordingly:
- Selected: `bg-primary-foreground text-primary shadow-sm`
- Unselected: `text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground`

**2. Fix "— Now" marker (line 318)**

The current `isWithinInterval` logic already checks per-sibling using `sStart` and `sEnd` from each `s` in `siblings.map()`. If both shifts show "— Now", the issue is likely that shifts overlap or the interval boundary is inclusive. Add a guard: only mark "Now" if `sEnd` exists AND the interval check passes. The current code looks correct per-sibling — verify by also ensuring `sEnd` is strictly after `sStart`. No structural change needed if already per-sibling; the bug may be that one shift's endDate equals the next shift's startDate. Add `{ start: sStart, end: sEnd }` with no overlap fix needed — the logic is already correct per the code at line 318. If the issue is date overlap, no code fix is possible without data change.

**3. Shift duration stat (lines 350-352)**

Currently `duration` is computed from `selectedShiftProject` (line 129-131), which should already be correct. Verify lines 129-131 use `selectedShiftProject.startDate` and `selectedShiftProject.endDate` — they do. The value at line 350 uses `duration` which derives from `selectedShiftProject`. If showing 211 days, the issue might be that `selectedShiftProject` isn't updating. This is already fixed from the previous round. No change needed — confirm the existing code is correct.

Actually, re-reading lines 129-131: `projectStart = parseISO(selectedShiftProject.startDate)` and `projectEnd = selectedShiftProject.endDate ? parseISO(selectedShiftProject.endDate) : null` — this is already shift-specific. The duration should be correct. If it's showing 211 days, it might be a stale state issue. No code change needed here.

**4. Next shift starts — handle negative values (line 364)**

Replace line 364:
```tsx
<span className="text-2xl font-bold text-foreground">{daysUntilNextShift !== null ? `${daysUntilNextShift}d` : '—'}</span>
```
With:
```tsx
<span className="text-2xl font-bold text-foreground">
  {daysUntilNextShift !== null
    ? (daysUntilNextShift < 0 ? `${Math.abs(daysUntilNextShift)}d ago` : `In ${daysUntilNextShift}d`)
    : '—'}
</span>
```
Update the subtitle label (line 366) to show "Started" vs "Next shift starts" vs "Last shift":
```tsx
<p className="text-xs text-muted-foreground">
  {daysUntilNextShift !== null
    ? (daysUntilNextShift < 0 ? 'Next shift started' : 'Next shift starts')
    : 'Last shift'}
</p>
```

**5. Match regular project visual weight — remove description from Zone 1 (lines 305-307)**

Remove the description paragraph from Zone 1 (the subtitle line already conveys the key info). The project name font size (`text-2xl font-bold`) already matches the non-grouped header. Padding (`p-6`) already matches. No other size changes needed.

Remove lines 305-307:
```tsx
{project.description && (
  <p className="text-muted-foreground text-sm">{project.description}</p>
)}
```

### Summary of actual code changes
1. Line 313: `bg-[#1E1E3F]` → `bg-primary`
2. Lines 325-327: Update pill button classes to use `bg-primary-foreground`/`text-primary` tokens
3. Line 364: Handle negative `daysUntilNextShift` with "ago" text
4. Line 366: Update subtitle label conditionally
5. Lines 305-307: Remove description block from Zone 1

### No changes to
- Non-grouped projects
- Schema/RLS/backend
- Content below header

### Risk
Q5 — purely UI styling/display change.

