

## Add Text Labels to Login and Update Timestamps

**Risk: GREEN** -- purely UI text/layout change.

### Problem

Currently the "last login" and "last updated" lines only show an icon (Clock / RefreshCw) and a date, with no text label explaining what the date means. This makes it ambiguous -- especially when one says "Never logged in" but the other shows a recent date.

### Fix

Add short text labels ("Last login:" and "Last update:") before the date values in both the mobile and desktop views within `PersonnelDetail.tsx`.

**File: `src/components/PersonnelDetail.tsx`**

Desktop view (lines 246-261) -- change from:
```
<Clock /> Feb 17, 2025 14:30
<RefreshCw /> Feb 17, 2025 14:30
```
to:
```
<Clock /> Last login: Feb 17, 2025 14:30
<RefreshCw /> Last update: Feb 17, 2025 14:30
```

Mobile view (lines 205-220) -- same pattern with shorter date format:
```
<Clock /> Last login: Feb 17, 2025
<RefreshCw /> Last update: Feb 17, 2025
```

Four text insertions in one file. No logic changes.

