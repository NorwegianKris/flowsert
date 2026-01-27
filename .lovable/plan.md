
## Make Availability Calendar Full Width

### Summary
Update the Availability Calendar component to fill the entire width of its container on all personnel profiles. Currently, the calendar uses fixed-width cells which prevent it from expanding to fill available space.

### What Will Change
The calendar on personnel profiles will stretch to use all available horizontal space in its container, matching the full-width appearance already implemented in the Personnel Preview Sheet.

### Technical Details

**File: `src/components/AvailabilityCalendar.tsx`**

Update the Calendar component (around line 405-413) to use custom classNames that make it responsive and full-width:

Current code:
```tsx
<Calendar
  mode="range"
  selected={selectedRange}
  onSelect={handleRangeSelect}
  modifiers={modifiers}
  modifiersStyles={modifiersStyles}
  className="rounded-md border border-border"
  numberOfMonths={1}
/>
```

Updated code:
```tsx
<Calendar
  mode="range"
  selected={selectedRange}
  onSelect={handleRangeSelect}
  modifiers={modifiers}
  modifiersStyles={modifiersStyles}
  className="rounded-md border border-border p-3 pointer-events-auto w-full"
  classNames={{
    months: "flex flex-col w-full",
    month: "space-y-4 w-full",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex w-full",
    head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
    row: "flex w-full mt-2",
    cell: "flex-1 h-9 text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
    day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-full inline-flex items-center justify-center",
    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
    day_today: "bg-accent text-accent-foreground",
    day_outside: "text-muted-foreground opacity-50",
    day_disabled: "text-muted-foreground opacity-50",
    day_hidden: "invisible",
  }}
  numberOfMonths={1}
/>
```

### Key Changes
- `months` and `month`: Set to `w-full` to take full container width
- `table`, `head_row`, `row`: Set to `w-full` for full-width layout
- `head_cell` and `cell`: Changed from fixed `w-9` to `flex-1` so they distribute space evenly
- `day`: Maintains `h-9 w-9` for the circular day indicators to keep perfect circles

This matches the exact implementation already working in the Personnel Preview Sheet calendar.
