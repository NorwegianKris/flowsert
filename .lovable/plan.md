

## Add Start Line and Restyle Today Line in Project Timeline

**Risk: GREEN** -- purely UI color/layout changes.

### What Changes

1. **Add a "Start" red line** at the project start date, styled identically to the "End" line (red color, with "Start" label and date)
2. **Change "Today" line color** from red (`destructive`) to deep indigo/purple (`#4338CA` / the primary brand color) in both the header and the full-height vertical line

### Files to Modify

**`src/components/project-timeline/TimelineHeader.tsx`**

- Add a "Start" line indicator at `x = 0` (the project start position), matching the "End" line style -- red color, label says "Start" with the formatted start date, label positioned to the right of the line (`left-1`)
- Change the "Today" line from `bg-destructive` to `bg-primary` and text classes from `text-destructive` to `text-primary`

**`src/components/project-timeline/ProjectTimeline.tsx`**

- Add a "Start" vertical line across all lanes at `x = 0` (using `dateToX(start, start, end, totalWidth)` which equals 0), styled with `bg-destructive/40` to match the End line
- Change the "Today" vertical line from `bg-destructive/40` to `bg-primary/40`

### Technical Details

Start line in `TimelineHeader.tsx`:
```tsx
{/* Start line indicator in header */}
<div
  className="absolute top-0 h-full w-px bg-destructive z-10"
  style={{ left: 0 }}
>
  <div className="absolute -top-0 left-1 flex flex-col whitespace-nowrap">
    <span className="text-[9px] text-destructive font-medium">Start</span>
    <span className="text-[8px] text-destructive/70">{format(start, 'MMM d')}</span>
  </div>
</div>
```

Today line color change (both files):
```tsx
// Header line: bg-destructive -> bg-primary
// Header text: text-destructive -> text-primary
// Full-height line: bg-destructive/40 -> bg-primary/40
```

Start full-height line in `ProjectTimeline.tsx`:
```tsx
{/* Start line */}
<div
  className="absolute top-0 bottom-0 w-px bg-destructive/40 z-20 pointer-events-none"
  style={{ left: LABEL_WIDTH }}
/>
```

