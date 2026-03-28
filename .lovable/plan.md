
Fixes in `src/components/AvailabilityCalendar.tsx` only.

1. Add targeted debug logging when the modal opens
- Add a `useEffect` tied to `isExpanded` that logs:
  - `projectBlockDates` as normalized `yyyy-MM-dd` strings
  - assigned project names/ids with start, end, and rotation fields
- This will confirm whether the project matcher is incorrectly being populated with all dates.

2. Rebuild `projectBlockDates` from normalized local date keys
- Add one shared date-only parser/helper and use it consistently.
- Build `projectBlockDates` from a de-duplicated `Set` of actual project on-period days only, then convert back to `Date[]`.
- Keep current project-period behavior, but make the matcher data deterministic and timezone-safe.

3. Stop the green project outline from leaking to all cells
- Remove the outline from shared inline `modifiersStyles.projectBlock`.
- Apply the outline through a `projectBlock`-only modifier class so only matched days receive it.
- This isolates the styling even if other modifier styles are present.

4. Fix availability fills past the first week
- Replace mixed `new Date(...)` / `parseISO(...)` usage with the same local-date parser everywhere this component compares date-only values:
  - availability modifiers
  - selected-day lookup
  - save/remove matching
  - upcoming events / certificate date comparisons
- This should eliminate the date matching drift causing days 8+ to render white.

5. Preserve all current behavior
- No changes to selection, drag-to-range, availability saving, project markers, certificate markers, or the redesigned layout.

Risk
- Q5 only: visual/debugging fix, no backend or permission changes.
