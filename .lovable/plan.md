

## Plan: Fix green outline leaking to all day cells in expanded calendar

### File: `src/components/AvailabilityCalendar.tsx`

### Root cause

Line 106: `getProjectOnPeriodDates` — when a project has no end date and no rotation, it defaults to `startDate + 30 days`, which covers the entire visible month. Every day cell gets the `projectBlock` modifier and the green outline CSS class.

The CSS selector `.rdp-day--project-block` is correctly scoped — the problem is the **data**, not the styling.

### Fixes

**1. Clamp `projectBlockDates` to actual project date ranges**
- In `getProjectOnPeriodDates` (line 106): instead of defaulting to `startDate + 30 days` when there's no end date, use a reasonable upper bound — clamp to `endOfMonth(addMonths(today, 2))` to match the calendar's visible range, but only include days where the project is genuinely active (i.e., status is `active` or `in_progress`).
- Better fix: only include a project in `projectBlockDates` if it has **both** a start and end date. Projects without an end date should not generate block dates — they have no defined period to display.

**2. Add a guard: skip projects with no end date from block highlighting**
- Change line 106 from `const finalEnd = endDate || addDays(startDate, 30)` to:
  ```
  if (!endDate) return results;
  ```
- This means open-ended projects won't show a green outline on every single day. They'll still appear in the events timeline and project details panel.

**3. Verify no other CSS adds borders to all cells**
- `expandedCalendarClassNames.day` (line 507): `rounded-[6px]` — no border. ✓
- `expandedCalendarClassNames.cell` (line 506): no border. ✓
- Calendar `className` (line 742): `border border-border` — this is on the Calendar **container**, not individual cells. ✓
- The `<style>` tag (line 734): correctly scoped to `.rdp-day--project-block`. ✓

### Summary
Single change in `getProjectOnPeriodDates`: skip open-ended projects from generating block dates. The green outline CSS is correctly scoped — only the modifier data is too broad.

### Risk
Q5 — purely visual logic fix, no backend changes.

