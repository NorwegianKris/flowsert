

## Fix Availability Bar Alignment with Compliance Bars

**Risk: GREEN** -- purely UI styling fix, no database changes.

### Problem

The availability bar doesn't start at exactly the same horizontal position as the compliance bars below it. The compliance lane hardcodes `barStart = 0` (left edge), while the availability lane computes its start position using `dateToX(span.startDate, ...)`. Even though both should resolve to 0 for the project start date, rounding in the `dateToX` calculation can introduce subtle pixel offsets.

### Fix

**File: `src/components/project-timeline/AvailabilityLane.tsx`**

Clamp the `x1` value so that any span starting at or before the project start date begins at exactly `left: 0`, matching the compliance bars. This is done by applying `Math.max(0, x1)` to prevent negative values and ensuring alignment:

```tsx
// Before
const x1 = dateToX(span.startDate, projectStart, projectEnd, totalWidth);

// After  
const x1Raw = dateToX(span.startDate, projectStart, projectEnd, totalWidth);
const x1 = Math.max(0, x1Raw);
```

This ensures the availability bar always starts at position 0 (the project start line) when the span begins at the project start date -- identical to how compliance bars are positioned.

### Single file change: `src/components/project-timeline/AvailabilityLane.tsx`

