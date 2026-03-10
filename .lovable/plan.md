

## Replace Drawer with Centered Modal Dialog

### Changes — `src/components/AvailabilityCalendar.tsx`

**1. Add Dialog import** — import `Dialog, DialogContent, DialogHeader, DialogTitle` from `@/components/ui/dialog`

**2. Restore full-width calendar layout** — remove the `flex flex-col md:flex-row` wrapper (lines 522-709). Calendar goes back to full-width inside `space-y-4`.

**3. Replace drawer with Dialog** — the drawer div (lines 557-708) becomes a `<Dialog>` controlled by `selectedRange?.from`:
- `open={!!selectedRange?.from}`, `onOpenChange` clears selection when closed
- `<DialogContent className="max-w-[420px]">` (shadcn dialog already centers + overlays + animates)
- Move all drawer content (date heading, assigned projects, availability section) into `DialogContent`

**4. Modal content layout** (same sections, reusing existing JSX):
1. **Date heading** — `DialogTitle` with formatted date, `DialogDescription` with `personnelName`
2. **Assigned Projects** — existing project cards, cert expiry warnings, project events (unchanged JSX)
3. **Set Availability** — 2x2 grid buttons, notes textarea, Save + Remove buttons (unchanged JSX)

**5. No bottom panel** — already removed in previous iteration, stays removed.

### What stays unchanged
- Legend, tip banner, calendar component, modifiers, styles, all data logic

### File
- `src/components/AvailabilityCalendar.tsx`

