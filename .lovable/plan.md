
I inspected the current implementation: `expandedCalendarClassNames` is not adding any global border or shadow, so both bugs are coming from how `AvailabilityCalendar.tsx` is feeding/styling DayPicker modifiers.

Plan:
1. Fix modifier matching so fills actually render
- Replace the current `new Date(a.date)` / `new Date(cert.expiryDate)` modifier dates with consistent local-date parsing.
- This should fix why `available`, `unavailable`, `partial`, `other`, and `certificateExpiry` are not attaching to the intended day cells and the calendar stays white.

2. Scope the assigned-project outline to real project days only
- Remove the current leaking `projectBlock` inline shadow approach.
- Apply the green project outline through a project-only modifier class/scoped styling so it can only appear on dates inside the `projectBlock` matcher set.
- Recheck the project date matcher after normalization so only actual assigned days are marked.

3. Increase fill strength and correct text contrast
- Update day fills to:
  - Available `#86C952`
  - Unavailable `#F47878`
  - Partial `#F5B942`
  - Other `#5B9FE0`
  - Certificate Expiry `#9B8FE8`
- Use white text on Available/Unavailable/Partial/Other.
- Use dark text on Certificate Expiry.
- Keep unstyled days transparent.

4. Sync the same colors everywhere else
- Update `legendRow` swatches and `statusDotColors` to the same stronger palette.

5. Make all Set Availability buttons visually consistent
- Ensure all four buttons always use `variant="outline"`.
- Use only a ring/border selected state so Available no longer appears solid filled.

Files
- `src/components/AvailabilityCalendar.tsx`

Risk
- UI-only fix (Q5), no changes to state, saving, or calendar interaction logic.
