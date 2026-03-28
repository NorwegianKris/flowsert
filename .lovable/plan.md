

## Plan: Fix green border on all cells and make dot indicator visible

### File: `src/components/AvailabilityCalendar.tsx`

### Root cause analysis

**Green border on all empty cells**: The `projectBlock` modifier is still being passed to DayPicker (line 452). Even though `modifiersStyles.projectBlock` is `{}` and `modifiersClassNames` is empty, react-day-picker internally applies a CSS class `rdp-day_projectBlock` to every matching day. The library's default button styles or the browser's UA styles may render a visible border on these elements. Additionally, **the `projectBlock` modifier may contain dates for every day of the month** if a project has no end date and no rotation (the fix on line 107 returns `[]` for that case, but other project configurations may still generate too many dates).

**Dot not visible**: The `DayContentWithDot` component (line 470) renders a `div` with `relative w-full h-full`, but the DayPicker `DayContent` slot is rendered inside the day `<button>`, which has fixed `h-9 w-9` / `h-10 w-10` dimensions. The inner `div` may not fill the button, so `absolute top-0 right-0` places the 4px dot outside the visible area or behind overflow clipping.

### Solution: Remove projectBlock modifier entirely, use DayContent-only approach

**1. Remove `projectBlock` from all DayPicker modifier plumbing**
- Line 452: remove `...(projectBlockDates.length > 0 ? { projectBlock: projectBlockDates } : {})`
- Line 462: remove `projectBlock: {}`
- This eliminates any DayPicker-generated class on project days — zero chance of leaking borders/outlines

**2. Fix the DayContentWithDot positioning**
- The current `div` wrapper uses `w-full h-full` but inside a fixed-size button it may not expand
- Change to use the button's own coordinate space: remove the flex wrapper, render the default `<span>{date}</span>` and an absolutely-positioned dot
- Use `style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}` on the wrapper to ensure it fills the button
- Position dot with `top: 1px; right: 1px` so it sits inside the cell visually

Updated `DayContentWithDot`:
```tsx
const DayContentWithDot = useCallback((props: DayContentProps) => {
  const isProjectDay = projectBlockDates.some(d => isSameDay(d, props.date));
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
      {props.date.getDate()}
      {isProjectDay && (
        <span
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: '#639922',
          }}
        />
      )}
    </span>
  );
}, [projectBlockDates]);
```

**3. Clean up modifiersStyles and modifiersClassNames**
- Remove `projectBlock`, `projectEvent`, and `certExpiryWarning` from `modifiersStyles` if they're empty `{}`  — empty entries may still trigger DayPicker internal class generation
- Keep `modifiers` object with only `available`, `unavailable`, `partial`, `other`, `certificateExpiry` — and `certExpiryWarning` / `projectEvent` only if they have associated styles

**4. No other changes**
- Keep all interaction logic, availability saving, debug logging, legend (already updated to dot)

### Risk
Q5 — purely visual, no backend or permission changes.

