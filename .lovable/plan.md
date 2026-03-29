

## Plan: Update dot indicator colour and restructure Set Availability section

### File: `src/components/AvailabilityCalendar.tsx`

### 1. Change dot indicator to white with green border

Update `DayContentWithDot` (lines 474–484) — replace the solid green fill with a white dot outlined in dark green:

```tsx
style={{
  position: 'absolute',
  top: '3px',
  right: '3px',
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #639922',
}}
```

Also update the legend dot (wherever the `Assigned Project` legend swatch is) to match: white background with green border instead of solid green fill.

### 2. Remove tip banner from expanded modal

Delete lines 752–756 (the amber tip banner in the expanded left column).

### 3. Restructure the Set Availability section (right panel, lines 818–869)

Reorder the section content as follows:

1. **Section header** — keep "Set Availability" heading
2. **Hint text** — add `<p className="text-xs text-muted-foreground">Click a day to select it, or click start → end to select a period.</p>`
3. **From/To date inputs** — two `<Input type="date">` fields:
   - `From` value bound to `expandedSelectedRange?.from` (formatted as `yyyy-MM-dd`)
   - `To` value bound to `expandedSelectedRange?.to` (formatted as `yyyy-MM-dd`)
   - On change, parse the input value and call `setExpandedSelectedRange({ from, to })` — bidirectional sync with the calendar
4. **4 availability buttons** — unchanged
5. **Notes textarea** — unchanged
6. **Save / Remove buttons** — unchanged

### No other changes
- All modifier data, availability saving, debug logging, interaction logic stays identical.

### Risk
Q5 — purely UI layout and styling, no backend or permission changes.

