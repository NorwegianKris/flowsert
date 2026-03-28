

## Plan: Fix 5 visual issues in AvailabilityCalendar modal

### File: `src/components/AvailabilityCalendar.tsx`

**1. Green outline leaking to all cells**
Change `projectBlock` style from `outline` to `boxShadow: 'inset 0 0 0 2px #639922'` to prevent CSS bleed. Verify no global outline in `expandedCalendarClassNames`.

**2. Unstyled days = no background**
Confirm only modifier-matched days receive fills. No catch-all style should apply a background.

**3. Updated fill colors (lighter than previous proposal)**
Update `modifiersStyles`, `legendRow` indicators, and `statusDotColors`:
- Available: `#D4EBB0`
- Unavailable: `#FAC0C0`
- Partial: `#FAD898`
- Other: `#A8CAED`
- Certificate Expiry: `#C5C0F0`

**4. Availability buttons — uniform outline style**
Change from `variant={selectedStatus === status ? 'default' : 'outline'}` to always `variant="outline"`. Use a ring or border accent to indicate the selected status.

**5. Event cards — white background**
Change `bg-muted/40` to `bg-white dark:bg-card` on event cards.

### Risk
Purely UI (Q5) — anchor optional.

