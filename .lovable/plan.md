

## Plan: Fix two remaining AvailabilityCalendar bugs

### File: `src/components/AvailabilityCalendar.tsx`

### Root cause analysis

**Bug 1 — Green outline on all cells:**
`getProjectOnPeriodDates` (line 78-79) uses `parseISO()` to parse project start/end dates. `parseISO('2026-03-15')` produces a **UTC midnight** Date. In any negative-UTC timezone, `isSameDay()` (which uses local getters) shifts this by a day. More critically, for non-rotation projects with no end date (line 106), it generates `startDate + 30 days` — covering the entire visible month. Combined with timezone drift, this creates a match on every rendered cell. The fix: replace `parseISO` with `toLocalDate` in `getProjectOnPeriodDates`.

**Bug 2 — Availability fills only on days 1–7:**
The `modifiers` object (lines 451-454) maps availability entries using `toLocalDate(a.date)` which produces correct local-midnight dates. However, `projectBlockDates` (from `parseISO`) produces UTC-midnight dates. When both modifiers match the same cell, DayPicker applies styles in object-key order. The `projectBlock` style (last key, line 457) gets applied **after** the availability style. While `boxShadow` shouldn't override `backgroundColor`, DayPicker v8 merges modifier styles and the **last matching modifier's full style object** replaces earlier ones rather than merging. Since `projectBlock`'s style object has no `backgroundColor`, it effectively resets it to `undefined` — wiping the fill for any cell where both modifiers match.

Days 1-7 may work because of timezone offset: `parseISO` dates shift by one day, so the projectBlock modifier doesn't overlap with early-month availability dates. Days 8+ fall within the shifted project range and get their fills wiped.

### Fixes

**1. Fix `getProjectOnPeriodDates` to use local dates**
Replace `parseISO(project.startDate)` and `parseISO(project.endDate)` with `toLocalDate(project.startDate)` and `toLocalDate(project.endDate)` (lines 78-79). This ensures project dates are local-midnight, matching how DayPicker renders cells.

**2. Prevent projectBlock from overwriting availability fills**
Move `projectBlock` into `modifiersStyles` with **only** `boxShadow` — but also ensure it cannot wipe other modifier styles. The fix: apply the project outline via a CSS class instead of inline `modifiersStyles`, using `modifiersClassNames` so DayPicker adds a class rather than merging style objects. Add a small CSS block (inline `<style>` or in the component) for `.rdp-day_projectBlock { box-shadow: inset 0 0 0 2px #639922; border-radius: 6px; }`.

**3. Enhanced debug logging**
Expand the existing `useEffect` (line 301-306) to also log:
- `availability.length` and a sample of availability entries for days 8+
- The modifier arrays' lengths for each status
- Whether any `projectBlockDates` fall outside the actual project date range

**4. Fix remaining `parseISO` calls for calendar events**
Line 214 (`parseISO(item.date)`) and line 226 (`parseISO(item.date)`) — replace with `toLocalDate(item.date)` for consistency.

### Summary of changes
- Replace all `parseISO` date-string parsing with `toLocalDate` throughout the component
- Switch projectBlock styling from `modifiersStyles` to `modifiersClassNames` + CSS class to avoid style-object merging conflicts
- Add diagnostic logging for availability data beyond day 7

### Risk
Q5 — purely visual/debugging, no backend or permission changes.

