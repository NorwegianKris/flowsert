
Findings:
- I checked the code paths that style the expanded modal. The exact green outline rule is not coming from `expandedCalendarClassNames.day`.
- The only green-border rule in the expanded modal is this inline CSS in `src/components/AvailabilityCalendar.tsx` around lines 734–736:
  ```css
  .expanded-availability-calendar .rdp-day--project-block {
    box-shadow: inset 0 0 0 2px #639922 !important;
    border-radius: 6px;
  }
  ```
- So the green border is being added by:
  - class: `rdp-day--project-block`
  - property: `box-shadow`
  - value: `inset 0 0 0 2px #639922 !important`
  - file/line: `src/components/AvailabilityCalendar.tsx` inline `<style>` block, ~734–736
- `expandedCalendarClassNames.day` already has `border-0 outline-none shadow-none ring-0`.
- There is no `day_button` entry in `expandedCalendarClassNames` at all.
- Conclusion: the visible green border is not from the expanded `day` class; it is from the `.rdp-day--project-block` rule being applied to cells that should be empty.

Plan:
1. Remove the inline class-based project outline rule
- Delete the expanded-modal `<style>` rule for `.expanded-availability-calendar .rdp-day--project-block`.
- Delete the broad reset rule beside it too, since it is not solving the problem.

2. Move the project outline to DayPicker modifier styles directly
- Add `projectBlock` into `modifiersStyles`:
  ```ts
  projectBlock: { boxShadow: 'inset 0 0 0 2px #639922', borderRadius: '6px' }
  ```
- This makes the outline apply only through the DayPicker modifier system, instead of a global CSS selector.

3. Keep expanded empty days identical to collapsed empty days
- Keep `expandedCalendarClassNames.day` free of any border/ring/outline/shadow classes.
- Do not add a `day_button` override.
- If needed, simplify the expanded `day` class so it only differs from the collapsed one by size and corner radius.

4. Re-verify modifier wiring
- Keep `projectBlock` only in `modifiers`.
- Remove `modifiersClassNames.projectBlock` entirely if the outline is handled by `modifiersStyles`.
- This avoids any leftover `.rdp-day--project-block` class from driving styles in the expanded modal.

5. Expected result
- Empty expanded cells: no border, no outline, no box-shadow, transparent background, only the date number.
- Assigned-project days: green outline only on true project days.
- Collapsed and expanded empty cells will visually match.

Risk:
- Q5 only: visual-only change in one file, no data/auth/backend changes.
