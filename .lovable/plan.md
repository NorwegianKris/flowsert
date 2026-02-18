

## Mobile-Responsive Industry Tags (2x2 Grid)

On mobile, the four industry tags overflow the screen because they're in a single horizontal row. The fix converts them into a 2x2 grid on small screens while keeping the current horizontal layout on larger screens.

### Layout

**Mobile (below `sm` breakpoint):**
```text
  Offshore  |  Subsea
  --------------------
  Industrial |  Construction
  Services   |
```

**Desktop (unchanged):**
```text
  Offshore | Subsea | Industrial Services | Construction
```

### Technical Details

- **File:** `src/pages/Auth.tsx` (lines 546-554)
- Replace the single flex row with a responsive layout:
  - On mobile: `grid grid-cols-2` with gap, each cell centered
  - On `sm`+: keep current `flex` row with vertical separators
- The vertical `<Separator>` dividers will be hidden on mobile (`hidden sm:block`) since the grid handles visual separation
- A single horizontal separator between the two rows on mobile can optionally be added, or just rely on spacing

### Implementation Approach

Use two nested containers:
1. A mobile-only `grid grid-cols-2` layout (visible below `sm`)
2. The existing `flex` row (visible at `sm` and above, using `hidden sm:flex`)

This avoids complex conditional rendering and keeps both layouts clean.

