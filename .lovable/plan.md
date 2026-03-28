

## Plan: Replace green outline with dot indicator for project days

### File: `src/components/AvailabilityCalendar.tsx`

### Changes

**1. Remove the green outline from `modifiersStyles.projectBlock`**
- Line 461: change `projectBlock: { boxShadow: 'inset 0 0 0 2px #639922', borderRadius: '6px' }` to `projectBlock: {}` (empty — no visual style from the modifier itself)

**2. Render a small green dot via DayPicker's `components.DayContent` override**
- Add a custom `DayContent` component that checks if the current day is in `projectBlockDates` (using `isSameDay`)
- If yes, render a 4px filled circle (`#639922`) positioned absolute in the top-right corner of the cell
- Pass this component via the `components` prop on both collapsed and expanded `<DayPicker>` instances

**3. Update the legend entry (line 536)**
- Replace the square-with-boxShadow swatch with a small filled green dot (matching the calendar indicator)
- Change from `<span style={{ boxShadow: 'inset 0 0 0 2px #639922' }} />` to `<span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#639922' }} />`

**4. No other changes**
- Keep all modifier data, availability fills, debug logging, and interaction logic intact

### Risk
Q5 — purely visual, no backend or permission changes.

