

## Fix Overdue Count Mismatch Between Summary Box and Expiry Details List

**Risk: GREEN** -- purely UI logic change, no database or backend modifications.

### Root Cause

The Overdue summary box and the Expiry Details list use different filtering logic:

- **Overdue box** (`ExpiryTimeline.tsx`, line 95): counts every certificate where `daysUntilExpiry < 0` -- no lower bound, so it includes certificates expired 30, 60, 200+ days ago.
- **Expiry Details list** (`ExpiryDetailsList.tsx`, line 31): filters visible events to `daysUntilExpiry >= timelineStartDays` (default: -30 days). Certificates expired more than 30 days ago are excluded from the list.

This means 7 of your 10 overdue certificates expired more than 30 days ago and don't appear in the details list.

### Fix

**File: `src/components/timeline/ExpiryDetailsList.tsx`**

Change the filtering logic so that **overdue events are never clipped by the past-days slider**. Overdue certificates (negative `daysUntilExpiry`) should always be shown regardless of the `timelineStartDays` setting, since the summary box counts them all.

```
// Before
e.daysUntilExpiry >= timelineStartDays && e.daysUntilExpiry <= timelineEndDays

// After
(e.daysUntilExpiry < 0 || e.daysUntilExpiry >= timelineStartDays) && e.daysUntilExpiry <= timelineEndDays
```

This ensures every overdue certificate that appears in the summary box also appears in the details list, while future-range filtering continues to work normally.

### Single file change

`src/components/timeline/ExpiryDetailsList.tsx` -- one line edit in the `visibleEvents` filter.

