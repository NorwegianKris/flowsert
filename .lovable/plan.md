

## Plan: Fix right panel layout overlap in expanded modal

### File: `src/components/AvailabilityCalendar.tsx`

### Problem
The right panel (line 840) uses `flex flex-col gap-5` but the Upcoming Events section has `flex-1 min-h-0` (line 845) which causes it to compete for space. When `renderSelectedDateDetails()` adds content above it, the fixed `h-[240px]` ScrollArea and flex-1 cause overlap.

### Changes

**1. Remove `flex-1 min-h-0` from Upcoming Events wrapper (line 845)**

Change:
```tsx
<div className="space-y-3 flex-1 min-h-0">
```
To:
```tsx
<div className="space-y-3">
```

**2. Reduce ScrollArea height when day detail is shown (line 847)**

Make the events ScrollArea height dynamic — shorter when detail is visible so everything fits:
```tsx
<ScrollArea className={expandedSelectedRange?.from ? "h-[140px]" : "h-[240px]"}>
```

**3. Ensure the right column itself scrolls properly (line 840)**

The container already has `overflow-y-auto` which is correct. No change needed there — the fix is removing `flex-1` so sections stack naturally.

### Result
All three sections (day detail, upcoming events, set availability) stack cleanly in a scrollable column without overlap.

### Risk
Q5 — purely layout fix.

