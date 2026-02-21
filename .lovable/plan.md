

## Fix Project Timeline to Fit Within Frame (No Horizontal Scroll)

**Risk: GREEN** -- purely UI/layout changes, no database or backend involved.

### Problem

1. The timeline has a `MIN_TIMELINE_WIDTH = 600` which forces horizontal scrolling when the container is narrower
2. The "End" red line sits at the very edge (`totalWidth - 2`), causing it to be partially clipped or cause overflow
3. The "Today" and "End" labels can overflow the timeline bounds

### Changes

**File: `src/components/project-timeline/types.ts`**

- Remove `MIN_TIMELINE_WIDTH` or set it to `0` so the timeline always fits within the available container width

**File: `src/components/project-timeline/ProjectTimeline.tsx`**

- Change `totalWidth` calculation to simply use `containerWidth - LABEL_WIDTH` (no minimum), clamped to at least 100 to avoid zero-width edge cases
- Remove the `minWidth` inline style on the inner div (line 151) so nothing forces horizontal overflow
- Move the "End" vertical line 1 day inward by using `dateToX` with `subDays(end, 1)` instead of `totalWidth - 2`
- Remove the `ScrollBar orientation="horizontal"` component since horizontal scrolling is no longer needed

**File: `src/components/project-timeline/TimelineHeader.tsx`**

- Move the "End" line position 1 day to the left using `dateToX(subDays(end, 1), ...)` instead of `endX - 2`
- Add `overflow-hidden` to the header container to prevent label overflow
- Clip the "End" label with `right-1` positioning (already done) -- ensure it doesn't overflow

### Technical Details

Key width calculation change in `ProjectTimeline.tsx`:
```ts
// Before
const totalWidth = Math.max(MIN_TIMELINE_WIDTH, containerWidth - LABEL_WIDTH);

// After
const totalWidth = Math.max(100, containerWidth - LABEL_WIDTH);
```

Inner div change:
```tsx
// Before
<div style={{ minWidth: totalWidth + LABEL_WIDTH }}>

// After
<div>
```

End line position change (both files):
```ts
// Before (ProjectTimeline.tsx)
style={{ left: LABEL_WIDTH + totalWidth - 2 }}

// After -- use dateToX with end minus 1 day
const endLineX = dateToX(subDays(end, 1), start, end, totalWidth);
style={{ left: LABEL_WIDTH + endLineX }}
```

Same pattern in `TimelineHeader.tsx` for consistency.

