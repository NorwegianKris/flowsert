

## Fix Inconsistent Font Sizes in Settings Menu Titles

### Problem
The collapsible section titles ("Standardize Locations", "Privacy & Data", "Freelancer Registration Link", "Profile Activation Overview") use `text-sm`, while the "Admin Users" card title uses `text-lg font-semibold`. This creates a visual mismatch.

### Fix
Update the three collapsible trigger `<span>` elements in `src/pages/AdminDashboard.tsx` to use `text-lg` instead of `text-sm`, matching the Admin Users card title style.

### Technical Details

**File: `src/pages/AdminDashboard.tsx`**

Three changes, all identical -- change `font-semibold text-sm` to `font-semibold text-lg` on lines 631, 654, and 676:

- Line 631: `<span className="font-semibold text-lg">Profile Activation Overview</span>`
- Line 654: `<span className="font-semibold text-lg">Standardize Locations</span>`
- Line 676: `<span className="font-semibold text-lg">Freelancer Registration Link</span>`

This aligns all settings section titles to the same `text-lg font-semibold` style used by the Admin Users card.
