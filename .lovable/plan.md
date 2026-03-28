

## Plan: Redesign Personal Calendar modal — visual only

### Scope
Restyle the expanded modal in `src/components/AvailabilityCalendar.tsx` (lines 711-789). No data logic, state, or save behavior changes.

### Layout change (lines 718-787)

Current: Left = calendar + legend + upcoming events, Right = detail panel (shows "Select a day..." placeholder or selected date info).

New: Left = calendar grid + compact legend, Right = upcoming events timeline + set availability buttons (always visible).

The detail panel content (assigned projects, cert expiry info for selected date) moves into the right column above the events list when a date is selected.

### Specific changes

**1. Two-column layout restructure**
- Left column: header, tip banner, calendar grid, legend row
- Right column: selected date details (if any), upcoming events timeline, availability buttons at bottom
- Remove the "Select a day or period to set availability" placeholder text

**2. Day cell styling via `modifiersStyles`**
Replace current circle/underline styles with soft background fills:
- `available`: `backgroundColor: '#EAF3DE'`, `color: 'inherit'`, no border-radius circle
- `unavailable`: `backgroundColor: '#FCEBEB'`, `color: 'inherit'`
- `partial`: `backgroundColor: '#FAEEDA'`, `color: 'inherit'`
- `other`: `backgroundColor: '#E6F1FB'`, `color: 'inherit'`
- `certificateExpiry`: `backgroundColor: '#EEEDFE'`, `color: 'inherit'`
- `projectBlock`: `outline: '2px solid #639922'`, `outlineOffset: '-2px'` (green outline on top of any fill)
- Remove `projectEvent` and `certExpiryWarning` modifier styles (visual noise reduction)
- All day cells use `borderRadius: '6px'` instead of `50%`

**3. Legend row**
- Change from circles to small rounded squares (`rounded-sm` instead of `rounded-full`)
- Add `gap-x-5` for more spacing
- Move inside the left column, below the calendar grid

**4. Events panel (right column)**
- Each event card gets a `border-l-[3px]` with color matching type:
  - Assigned Project: `#639922` (green)
  - Unavailable: `#dc2626` (red)
  - Partial: `#d97706` (amber)
  - Certificate Expiry: `#7c3aed` (purple)
  - Available: `#16a34a` (green)
  - Other: `#2563eb` (blue)
- Card layout: name + date range + small badge, padding and background
- Month grouping kept, month label styled as small uppercase text

**5. Availability buttons**
- Move from detail panel into bottom of right column
- Always visible (not gated on date selection)
- 2x2 grid of small buttons with color dot matching status
- Notes textarea and Save/Remove below

**6. Month navigation**
- `caption_label` class changed from `text-sm font-medium` to `text-base font-bold`

### Files modified
- `src/components/AvailabilityCalendar.tsx` — single file, visual changes only

### Risk
Purely UI/layout — anchor optional (Q5).

