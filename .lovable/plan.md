

## Plan: Redesign grouped project detail header into 3-zone cohesive layout

### File: `src/components/ProjectDetail.tsx`

### Overview

For grouped projects (`siblings.length > 1`), replace the current header card + separate shift bar + 3 stat cards with a seamless 3-zone header. Non-grouped projects are completely unchanged — wrap the new layout in a conditional.

### Zone 1 — Group Header (lines 242-325)

Replace the current header card content for grouped projects:

- **Name**: Strip `— Shift N` suffix using regex: `project.name.replace(/\s*—\s*Shift\s*\d+$/i, '')`
- **Subtitle line**: `{location} · {groupStartDate} – {groupEndDate} · {onDays} on / {offDays} off` — compute group date span from `siblings[0].startDate` to `siblings[siblings.length-1].endDate`
- **Badges**: `Recurring` badge + group-level status badge (Active if any sibling is active, else parent status)
- **Remove** the start/end date row and duration row from this zone
- **Keep** same `bg-teal-500/10 border-teal-500/50` tint, same image layout
- **Border radius**: `rounded-lg rounded-b-none` to connect flush to Zone 2

### Zone 2 — Shift Selector (lines 327-353)

Restyle the existing shift selector bar:

- **Background**: `bg-[#1E1E3F]` (matches main nav)
- **No border-radius** (flat top and bottom to sit between Zone 1 and Zone 3): `rounded-none`
- **Left label**: `<span className="text-white/60 text-sm mr-3">Shift:</span>`
- **Pill buttons**: Same logic, but mark active shift with `— Now` suffix:
  ```tsx
  const isNow = isWithinInterval(today, { start: sStart, end: sEnd });
  // Label: "Shift 1 · Feb 18" or "Shift 2 · Mar 11 — Now"
  ```
- **Selected pill**: `bg-white text-[#1E1E3F]`. **Unselected**: `text-white/70 hover:bg-white/15`
- Full width: `w-full flex items-center gap-1 p-1.5`

### Zone 3 — Shift Stats (lines 355-410)

For grouped projects, replace the 3 stat cards with 4 stat cards in a single row, styled with `rounded-t-none` on the container to connect to Zone 2:

1. **Personnel this shift**: count + `{shiftStart} – {shiftEnd}` as subtitle
2. **Shift duration**: `{duration} days`
3. **Compliance**: count valid certs / total required (derive from `assignedPersonnel` certificates)
4. **Next shift starts**: calculate days until next sibling's start date, or show `—` if this is the last shift

Wrap the 4 cards in a container with matching border and `rounded-b-lg rounded-t-none border-t-0` to visually connect to Zone 2.

### Implementation structure

```tsx
{siblings.length > 1 ? (
  <div className="overflow-hidden rounded-lg border border-teal-500/50">
    {/* Zone 1 — Group Header */}
    <div className="bg-teal-500/10 p-6">
      {/* image + group name + subtitle + badges */}
    </div>
    
    {/* Zone 2 — Shift Selector */}
    <div className="bg-[#1E1E3F] px-4 py-2 flex items-center gap-1.5">
      <span className="text-white/60 text-sm mr-2">Shift:</span>
      {/* pill buttons */}
    </div>
    
    {/* Zone 3 — Shift Stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
      {/* 4 stat cells with white bg */}
    </div>
  </div>
) : (
  <>
    {/* Existing header card — completely unchanged */}
    <Card className={`border-border/50 ...`}>...</Card>
    {/* Existing 3 stat cards — completely unchanged */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">...</div>
  </>
)}
```

### Computed values to add

```tsx
const groupDisplayName = project.name.replace(/\s*—\s*Shift\s*\d+$/i, '');
const groupStart = siblings.length > 1 ? parseISO(siblings[0].startDate) : projectStart;
const groupEnd = siblings.length > 1 && siblings[siblings.length - 1].endDate 
  ? parseISO(siblings[siblings.length - 1].endDate!) : projectEnd;
const groupStatus = siblings.some(s => s.status === 'active') ? 'active' : project.status;
const today = new Date();
const nextSibling = siblings.find(s => {
  const idx = siblings.findIndex(x => x.id === selectedShiftId);
  return siblings.indexOf(s) === idx + 1;
});
const daysUntilNextShift = nextSibling 
  ? differenceInDays(parseISO(nextSibling.startDate), today) 
  : null;
```

### No changes to
- Non-grouped projects (entire existing header/stats preserved in else branch)
- Content below header (Timeline, Chat, Personnel, Documents) — already uses `selectedShiftProject`
- Schema/RLS/backend

### Risk
Q5 — purely UI display/layout change.

