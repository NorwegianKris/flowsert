
## Remove Duplicate Title from Profile Activation Section

**Risk: GREEN** -- Pure UI text changes.

### Problem

There are two titles displayed:
1. The collapsible trigger in `AdminDashboard.tsx` (line 685): "Profile Activation and Billing Overview"
2. The `CardHeader`/`CardTitle` inside `ActivationOverview.tsx` (lines 157-163): "Profile Activation and Tier Overview"

### Changes

**1. `src/pages/AdminDashboard.tsx` (line 685)**
- Rename the collapsible trigger text from "Profile Activation and Billing Overview" to "Profile Activation and Tier Overview"

**2. `src/components/ActivationOverview.tsx` (lines 157-163)**
- Remove the `<CardHeader>` block containing the duplicate `<CardTitle>` so the title only appears once on the collapsible trigger.

### Files Changed (2)
1. `src/pages/AdminDashboard.tsx` -- update collapsible trigger label
2. `src/components/ActivationOverview.tsx` -- remove `CardHeader` with duplicate title
