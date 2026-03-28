

## Plan: Debug projectBlockDates count and enlarge dot indicator

### File: `src/components/AvailabilityCalendar.tsx`

### Changes

**1. Add always-on console.log for projectBlockDates (not just when modal opens)**
- After `projectBlockDates` is computed (around where the debug `useEffect` is), add a `console.log` outside the `isExpanded` check that fires on every render:
```
console.log('[AvailabilityCalendar] projectBlockDates count:', projectBlockDates.length, 'first 5:', projectBlockDates.slice(0, 5).map(d => format(d, 'yyyy-MM-dd')));
```
- This ensures we see the data even in the collapsed view.

**2. Enlarge the dot indicator**
- Line 477–480: change `width: '5px'` → `'7px'`, `height: '5px'` → `'7px'`, `top: '2px'` → `'3px'`, `right: '2px'` → `'3px'`

### Risk
Q5 — purely visual + debug logging.

