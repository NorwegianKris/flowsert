

## Plan: Remove border/outline from empty day cells in expanded calendar

### File: `src/components/AvailabilityCalendar.tsx`

### Root cause

The expanded `day` class (line 507) omits `buttonVariants({ variant: "ghost" })` that the collapsed view inherits from `calendar.tsx`. Without that variant wrapper, the raw `<button>` element may show a default user-agent border. Additionally, the CSS reset on line 736 uses `:not([class*="available"])` selectors that may not reliably match DayPicker's actual modifier class format, leaving some "empty" buttons unaffected by the reset.

### Fixes

**1. Add explicit border/outline/shadow reset to the expanded `day` class (line 507)**

Add `border-0 outline-none shadow-none ring-0` to the `day` class string in `expandedCalendarClassNames`:

```
day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-[6px] inline-flex items-center justify-center text-sm border-0 outline-none shadow-none ring-0"
```

This ensures every day button in the expanded view starts with zero border/outline/shadow, matching the collapsed view's ghost button behavior.

**2. Simplify the inline CSS reset (line 736)**

Replace the fragile `:not([class*="..."])` selector chain with a cleaner universal reset that targets all day buttons, then lets modifier styles layer on top:

```css
.expanded-availability-calendar .rdp button.rdp-cell button,
.expanded-availability-calendar .rdp td button {
  box-shadow: none;
  border: none;
  outline: none;
}
```

Keep the `.rdp-day--project-block` rule as-is — it will override the reset for project days.

**3. No other changes**
- All functionality (click, drag-range, availability saving, modifiers) stays identical.
- Only the `expandedCalendarClassNames.day` string and the CSS reset block change.

### Risk
Q5 — purely visual, no backend or permission changes.

