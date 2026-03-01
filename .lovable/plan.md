

## Plan: Auto-scroll to Unmapped Certificates after deep-link

### Approach
Add a `useEffect` in `AdminDashboard.tsx` that fires when `settingsDeepLink === 'review-queue'` and the settings panel is open. After a 300ms delay (to let the collapsible animation finish), it finds the "Unmapped Certificates" heading element inside `TypeMergingPane` and calls `scrollIntoView({ behavior: 'smooth', block: 'start' })`.

### Changes

**`src/components/TypeMergingPane.tsx`** — Add a `data-testid="unmapped-certificates-section"` (or `id`) attribute to the outer container of the unmapped certificates pane (the `<div>` at ~line 1326) so it can be targeted for scrolling.

**`src/pages/AdminDashboard.tsx`** — Add a `useEffect` that watches `settingsDeepLink` and `settingsOpen`. When both indicate a review-queue deep-link is active, set a 300ms `setTimeout`, then query `document.querySelector('[data-testid="unmapped-certificates-section"]')` and call `.scrollIntoView({ behavior: 'smooth', block: 'start' })`. Clean up the timeout on unmount/change.

### Files changed
- `src/components/TypeMergingPane.tsx` — add `data-testid` attribute (1 line)
- `src/pages/AdminDashboard.tsx` — add `useEffect` for auto-scroll (~8 lines)

### Not changed
- Visual design, grid layout, other components, schema

