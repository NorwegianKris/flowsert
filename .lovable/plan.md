

## Match Stat Card Hover to Personnel Card Hover

Update hover classes on the 3 status stat cards and the Needs Review card in `DashboardStats.tsx` to match the personnel card hover effect:

**Current:** `hover:shadow-md hover:border-primary/30 transition-all`

**New:** `hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all duration-200`

Apply to:
- Line 83: the 3 status stat cards (Valid, Expiring, Expired)
- Line 100-103: the Needs Review card (when clickable)

One file changed: `src/components/DashboardStats.tsx`

