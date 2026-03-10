

## Extend Availability Calendar with Project Blocks

### Overview

Enhance the existing `AvailabilityCalendar` component to show assigned project on-periods as visual blocks, rename it to "Personal Calendar", and add project-aware certificate expiry warnings.

### Changes

**1. `useAssignedProjects` hook (`AssignedProjects.tsx`)**
- Include rotation fields in the query response: `rotation_on_days`, `rotation_off_days`, `rotation_count`, `rotations_completed`, `shift_number`, `shift_group_id`, `is_shift_parent`, `next_close_date`, `next_open_date`
- Map these onto the returned `Project` type (extend the local interface or add rotation fields)

**2. `AvailabilityCalendar.tsx` — Core changes**

- Rename title from "Availability Calendar" to "Personal Calendar"
- Add "Assigned Project" legend item with indigo color (`hsl(240 60% 60%)`)
- New helper `getProjectOnPeriodDates()`:
  - For non-rotation projects: all dates between `startDate` and `endDate`
  - For rotation projects: compute on-period windows using `startDate`, `rotationOnDays`, `rotationOffDays`, `rotationCount`, clamped to project date range
  - Returns `{ date: Date, project: Project }[]` grouped for span rendering
- New modifier `projectBlock` added to calendar modifiers with indigo background styling — these are all dates within active on-periods
- Existing `projectEvent` modifier remains for calendar items (milestones/events)
- Both `projectBlock` and availability modifiers can apply to the same day — use a layered approach: availability fills the circle, project block adds an indigo bottom-border or dot indicator beneath
- Modifier style for `projectBlock`: `{ borderBottom: '3px solid hsl(240 60% 60%)' }` so it coexists with availability circle fills

**3. Project block popover on click**

- When a date is selected that has project blocks, show a project info section in the existing selection panel (below the date header, similar to current "Project Events" section):
  - Project name (linked to `/admin/projects/{id}` or worker project detail)
  - Location (from project description or a future field)
  - Shift number (if `shiftNumber` exists)
  - Start/end date of the current on-period
  - Uses existing `Briefcase` icon with indigo color

**4. Certificate expiry warning near project start**

- Extend `getCertificatesExpiringOnDate` → new helper `getCertificatesExpiringNearProjectStart(date)`:
  - For each assigned project, if `date` is the project start date (or on-period start), check certificates expiring within 30 days of that start
  - Show warning indicator on the project start date in the selection panel: "⚠ {cert name} expires {X} days before this project starts"
- Add a new modifier `certExpiryWarning` with amber/orange border on dates that are project starts with soon-expiring certificates

### Files Changed

| File | Change |
|------|--------|
| `src/components/AvailabilityCalendar.tsx` | Rename title, add project block modifiers/legend, project popover in selection panel, cert expiry warning logic |
| `src/components/AssignedProjects.tsx` | Include rotation fields in `useAssignedProjects` query and mapped type |

No database changes needed — all data is already available in the `projects` table.

