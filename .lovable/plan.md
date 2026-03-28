
Plan: Make empty day cells in the expanded AvailabilityCalendar match the collapsed view exactly

File:
- `src/components/AvailabilityCalendar.tsx`

What I found
- `expandedCalendarClassNames` only overrides `cell` and `day`; neither currently adds a border utility.
- There is no `day_button` class in this calendar setup.
- The only expanded-only outline style in this file is:
  ` .rdp-day--project-block { box-shadow: inset 0 0 0 2px #639922; border-radius: 6px; } `
- That means the visible outline on “empty” cells is almost certainly coming from the `projectBlock` modifier/class being applied too broadly in the expanded modal, not from the base day styling.

Implementation plan
1. Align expanded empty-cell styling with collapsed
- Make `expandedCalendarClassNames.day` and `expandedCalendarClassNames.cell` inherit the collapsed classes as closely as possible.
- Keep only the size/typography changes needed for the premium modal.
- Ensure no border, ring, shadow, or background utility is present on default empty days.

2. Tighten project outline application
- Verify `modifiersClassNames.projectBlock` is only added for actual `projectBlockDates`.
- Keep the green outline CSS scoped strictly to modified project days only.
- If needed, wrap the expanded calendar in a dedicated container class and scope the selector to that calendar instance only.

3. Re-check projectBlock matcher data
- Audit `projectBlockDates` generation so only true assigned-project on-period dates are included.
- Keep the existing guard that skips open-ended non-rotation projects.
- Deduplicate dates before passing them to the calendar so stray matches cannot create “outline everywhere” behavior.

4. Preserve empty-day appearance
- Empty cells in expanded view should render with:
  - no border
  - no box-shadow
  - no background fill
  - just the date number
- This will match the collapsed calendar behavior exactly.

5. No functionality changes
- Keep click-to-select, range selection, availability saving, project markers, certificate expiry markers, and event list unchanged.

Risk
- Q5 only: visual parity fix in one component, no backend/auth/data model changes.
