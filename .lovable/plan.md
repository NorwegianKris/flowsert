

## Plan: Surface "Needs Review" Stat Card on Admin Dashboard

### Overview
Add a 5th stat card to the dashboard showing the count of certificates needing review, with a click handler that deep-links into the correct Settings panel section.

### Deep-linking feasibility
Deep-linking is **feasible** with modest changes. The current structure:
- `AdminDashboard` → `settingsOpen` state (boolean) → renders Settings panel
- Settings panel → `Collapsible` for "Categories" (currently uncontrolled, defaults closed)
- Inside → `CategoriesSection` → `Tabs defaultValue="workers"` (uncontrolled)
- Inside "certificates" tab → another nested `Tabs` containing Types/Aliases/Issuers

To deep-link, we need to:
1. Add a controlled `defaultOpen` prop to the Categories `Collapsible` in AdminDashboard
2. Add a controlled `defaultTab` prop to `CategoriesSection` so it can open on "certificates" instead of "workers"
3. Both are simple prop additions — no restructuring needed

### Changes

**1. `src/hooks/useNeedsReviewCount.ts` — New hook**
- Query `certificates` table counting rows where `needs_review = true`, joined through `personnel` to scope by business
- Returns `{ count: number, loading: boolean }`
- Refetches when personnel data changes

**2. `src/components/DashboardStats.tsx` — Add 5th card**
- New props: `needsReviewCount: number`, `onNeedsReviewClick?: () => void`
- Add a clickable card after the existing 4 with `FileSearch` icon, amber color scheme (`bg-amber-500/10`, `text-amber-500`)
- When count is 0: swap to green `CheckCircle` icon
- Grid: change `lg:grid-cols-4` to `lg:grid-cols-5`, keep `sm:grid-cols-2` so the 5th card wraps naturally on tablets (3+2 or 2+2+1 depending on breakpoint)

**3. `src/components/CategoriesSection.tsx` — Accept optional `defaultTab` prop**
- Add prop `defaultTab?: string` (defaults to `"workers"`)
- Pass it to the outer `Tabs` component's `defaultValue`
- No other changes to this component

**4. `src/pages/AdminDashboard.tsx` — Wire it up**
- Import and call `useNeedsReviewCount`
- Add state: `settingsDeepLink` (e.g., `'review-queue' | null`)
- Click handler on the stat card: sets `settingsOpen(true)` AND `settingsDeepLink('review-queue')`
- When rendering the Categories `Collapsible`: pass `defaultOpen={settingsDeepLink === 'review-queue'}` 
- When rendering `CategoriesSection`: pass `defaultTab={settingsDeepLink === 'review-queue' ? 'certificates' : undefined}`
- Clear `settingsDeepLink` when settings panel closes

### Grid responsiveness detail
Current grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. Updated to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`. On medium screens (sm), the 5th card stacks to a third row (2+2+1), which is clean. On large screens, all 5 sit in one row. No cramping risk.

### What is NOT changed
- `CertificateReviewQueue` component — untouched
- Settings panel layout/navigation — untouched (just prop additions)
- Existing 4 stat cards — untouched
- Database schema — no migrations

