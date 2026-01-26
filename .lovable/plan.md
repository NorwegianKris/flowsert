
# Make Calendar Fill Full Width in Personnel Preview

## Overview
Modify the Calendar component in the `PersonnelPreviewSheet` to expand and fill the entire width of the availability section, instead of using fixed-width cells.

## What Will Change
The calendar currently uses fixed 36px (`w-9`) cells which keeps it at a constant small width. We'll override the calendar's `classNames` prop to use flexible widths (`flex-1`) so the calendar grid expands to fill the container.

## Technical Details

### File to Modify
- `src/components/PersonnelPreviewSheet.tsx`

### Changes
Update the Calendar component (around line 419-427) to include custom `classNames` that override the fixed widths:

```tsx
<Calendar
  mode="single"
  month={currentMonth}
  onMonthChange={setCurrentMonth}
  modifiers={modifiers}
  modifiersStyles={modifiersStyles}
  className="p-3 pointer-events-auto w-full"
  classNames={{
    months: "flex flex-col w-full",
    month: "space-y-4 w-full",
    table: "w-full border-collapse space-y-1",
    head_row: "flex w-full",
    head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
    row: "flex w-full mt-2",
    cell: "flex-1 h-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
    day: "h-9 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
  }}
  numberOfMonths={1}
/>
```

### Key Styling Changes
| Element | Before | After |
|---------|--------|-------|
| `head_cell` | Fixed `w-9` | `flex-1` (flexible) |
| `cell` | Fixed `w-9` | `flex-1` (flexible) |
| `day` | Fixed `w-9` | `w-full` (fills cell) |
| `row` | `flex w-full` | Same, but cells now expand |
| Container | Default | `w-full` added |

This ensures each day cell takes equal space across the full width of the calendar container.
