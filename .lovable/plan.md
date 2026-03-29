

## Plan: Refine project bar indicator and add day detail in expanded modal only

### File: `src/components/AvailabilityCalendar.tsx`

### 1. Simplify bar indicator

Update `DayContentWithDot` — remove color-switching logic, use consistent `#3B3AC2` everywhere, reduce dimensions:

```tsx
{isProjectDay && (
  <span style={{
    position: 'absolute',
    bottom: '3px',
    left: '8px',
    right: '8px',
    height: '2px',
    borderRadius: '2px',
    backgroundColor: '#3B3AC2',
  }} />
)}
```

Remove `hasColoredFill` variable and `availability` from the dependency array.

### 2. Update legend bar swatch

Change height from `3px` to `2px` to match the new bar.

### 3. Enhance day detail in expanded modal only

The existing `renderSelectedDateDetails()` function already shows project/cert info when `expandedSelectedRange?.from` is set. Enhance it:

- Add **availability status** display: look up the day's availability entry and show a coloured dot + label (e.g. "● Available"). If none, show "No availability set".
- Add fallback message when no projects, no certs, no availability: "No events — click to set availability below"
- Keep existing project cards, cert expiry, and project event displays unchanged.

The collapsed view stays compact — no detail section added there.

### No other changes

All functionality, saves, events panel, date inputs stay identical.

### Risk
Q5 — purely UI styling and layout, no backend or permission changes.

