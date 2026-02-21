

## Hide Start Label Behind Month/Year Text on Overlap

**Risk: GREEN** -- purely CSS layering tweak.

### What's Happening

The "Start" label and date sit at `z-10`, but the month row text (e.g., "Feb 2026") is transparent, so the Start text bleeds through visually as seen in the screenshot.

### Fix

**File: `src/components/project-timeline/TimelineHeader.tsx`** -- two small class changes:

1. **Month row container** (the `<div className="relative h-6">` wrapping month markers): add `z-20` so the entire month row sits above the Start indicator at `z-10`.

2. **Month label `<span>`**: add `bg-background px-0.5` so each label has a solid opaque background that fully covers any Start text or line behind it.

### Technical Detail

```
Line 63 (month row div):
- className="relative h-6"
+ className="relative h-6 z-20"

Line 71 (month label span):
- className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap select-none"
+ className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap select-none bg-background px-0.5"
```

The month labels become opaque patches that naturally obscure the Start indicator whenever they overlap, exactly as shown in the reference image.

