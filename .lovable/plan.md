
# Add Purple Hover Effect to Expiry Timeline Boxes

**Risk: GREEN** -- purely UI styling, no database or backend changes.

## What Changes

Add the same purple hover border and lift effect to the expiry detail lane boxes and individual certificate rows in the Expiry Details list.

## Technical Details

### File: `src/components/timeline/ExpiryDetailsList.tsx`

**1. Lane group boxes** (the colored containers like "Overdue", "Next 30 days", etc.)

Update the `<div>` at ~line 121 that wraps each lane group:

Current:
```
className={cn(
  'rounded-md border transition-all duration-300',
  lane.borderColor,
  lane.bgColor,
  highlightedLaneId === lane.id && 'ring-2 ring-primary shadow-md'
)}
```

New — add hover lift + purple ring:
```
className={cn(
  'rounded-md border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20',
  lane.borderColor,
  lane.bgColor,
  highlightedLaneId === lane.id && 'ring-2 ring-primary shadow-md'
)}
```

**2. Individual certificate rows** (each row inside a lane)

Update the `<button>` at ~line 137:

Current:
```
className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-background/50 transition-colors"
```

New — add subtle purple ring on hover:
```
className="w-full flex flex-col gap-1 px-3 py-2.5 text-left hover:bg-background/50 transition-all duration-200 hover:ring-1 hover:ring-[#C4B5FD]/50"
```

The rows use a thinner ring (`ring-1` at 50% opacity) so they don't compete visually with the parent lane box effect.
