

## Plan: Add lavender tint to warning/expired/review stat cards

The three cards ("Profiles Expiring Soon", "Profiles Expired", "Certificates to Review") should use the same lavender background as the personnel filter bar: `bg-[#C4B5FD]/10 border-[#C4B5FD]/50`.

### Change in `src/components/DashboardStats.tsx`

**Lines 80-87 (stats cards loop):** Add conditional className to the `Card` for the "expiring" and "expired" stat cards — apply `bg-[#C4B5FD]/10 border-[#C4B5FD]/50` to both.

**Lines 93-107 (Needs Review card):** Add the same `bg-[#C4B5FD]/10 border-[#C4B5FD]/50` classes.

The "All Valid Profiles" card and the "Employees/Freelancers" card remain unchanged.

### Implementation detail

In the `stats` array, add a `tinted: true` flag to "Profiles Expiring Soon" and "Profiles Expired" entries. In the map render, conditionally apply the lavender classes when `stat.tinted` is true. For the review card, apply the classes directly.

### Files touched
- **Edit:** `src/components/DashboardStats.tsx`

