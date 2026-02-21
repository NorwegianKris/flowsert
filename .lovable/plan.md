

## Align Availability Bar with Certificate Bars in Project Timeline

**Risk: GREEN** -- purely UI styling change.

### Problem

The availability bar in the personnel timeline section doesn't visually align with the compliance/certificate bars below it:
1. The availability bar uses Tailwind insets (`top-1 bottom-1` = 4px) for vertical positioning, while compliance bars use explicit pixel values (`top: 2px`, `height: 16px`), causing inconsistent vertical alignment.
2. Minor horizontal start differences due to how positions are calculated.

### Changes

**File: `src/components/project-timeline/AvailabilityLane.tsx`**

Update the availability bar rendering to use the same explicit pixel-based positioning as the compliance lane:
- Replace `top-1 bottom-1` with `top: 2px` and `height: 16px` (matching the compliance bar's first row positioning)
- Ensure bars that start at project start date begin at `left: 0` consistently

This single styling adjustment will make the availability bar height, vertical offset, and horizontal start match the certificate bars exactly.

### Technical Detail

```tsx
// Current (misaligned)
<div
  className={`absolute top-1 bottom-1 rounded-sm ${statusColor(span.status)} ...`}
  style={{ left: x1, width }}
/>

// Updated (aligned with compliance bars)
<div
  className={`absolute rounded-sm ${statusColor(span.status)} ...`}
  style={{ left: x1, width, top: 2, height: 16 }}
/>
```

One small edit in one file.

