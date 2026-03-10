

## Redesign Personal Calendar — Right-Side Drawer Pattern

### What changes
Restructure `src/components/AvailabilityCalendar.tsx` to use a side-by-side layout: calendar on the left, a slide-out drawer panel on the right when a day is clicked. Remove the bottom panels entirely.

### Layout structure

```text
┌─────────────────────────────────────────────────────────┐
│ Personal Calendar (CardHeader)                          │
├─────────────────────────────────────────────────────────┤
│ Legend: ● Avail ● Partial ● Unavail ● Other            │
│         ● Cert Expiry  ■ Assigned Project               │
│                                                         │
│ ┌──────────────────────┐  ┌──────────────────┐         │
│ │                      │  │ DRAWER (320px)    │         │
│ │   Calendar           │  │ Date heading      │         │
│ │   (unchanged)        │  │ Assigned Projects │         │
│ │                      │  │ Set Availability  │         │
│ │                      │  │ [Save]            │         │
│ └──────────────────────┘  └──────────────────┘         │
│                                                         │
│ 💡 Tip banner                                           │
└─────────────────────────────────────────────────────────┘
```

### Changes — `src/components/AvailabilityCalendar.tsx`

**1. Legend (lines 497-516)** — condense to 6 items in one compact row:
- Remove "Project Event" entry
- Keep: Available, Partial, Unavailable, Other, Certificate Expiry, Assigned Project

**2. Main layout** — wrap calendar + drawer in a `flex` row:
- Left: Calendar (existing, unchanged, `flex-1 min-w-0`)
- Right: Drawer panel (`w-[320px] shrink-0`), conditionally rendered with `transition-all duration-150 ease-in-out` slide-in. When closed, width collapses to 0 with `overflow-hidden`.

**3. Drawer panel** — replaces the current inline Card (lines 554-745):
- Fixed width 320px, `border-l` separator, `p-4` padding
- Close button (X) top-right corner
- Content sections in order:
  1. **Date heading** — `text-lg font-semibold`, e.g. "Thursday, March 12"
  2. **Assigned Projects** — existing project blocks + cert expiry warnings + project events, merged into one section. Each project as a mini-card. "No projects assigned" if empty.
  3. **Set Availability** — section heading, 2x2 grid of 4 large status buttons (`grid grid-cols-2 gap-2`), currently-set status highlighted. Notes textarea below. Full-width Save button + Remove/Cancel row.

**4. Remove bottom panel** (lines 748-774) — delete "Upcoming Availability" section entirely.

**5. Empty state** — when no day selected, drawer stays closed (no visible panel).

### Drawer animation
- Use CSS transition on the wrapper div: `max-width` from `0` to `320px` over 150ms ease
- Content inside uses `opacity` transition to fade in slightly after slide

### What stays unchanged
- Calendar component, modifiers, modifier styles — untouched
- All data fetching, save/remove logic — untouched
- Tip banner — stays, positioned below the flex row

### File
- `src/components/AvailabilityCalendar.tsx`

