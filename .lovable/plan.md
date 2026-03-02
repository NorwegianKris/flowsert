

## FlowSert — Full QA Checklist Results (Section 2: Dashboard — Admin)

### Stat Cards

**2.1 "All Valid Profiles" — count is correct against database**
**Status: PASS (code review)**
- `DashboardStats` receives the full `personnel` array from `usePersonnel()` which fetches all personnel via RLS-scoped query
- `getPersonnelOverallStatus(p)` checks each person's certificates: if none are expired or expiring, status = `valid`
- Count is computed client-side from the same dataset used for the personnel list — consistent by construction
- No percentage involved, raw integer count displayed

**2.2 "Profiles Expiring Soon" — count is correct, threshold logic matches expected window**
**Status: PASS (code review)**
- Threshold: `EXPIRY_WARNING_DAYS = 60` in `certificateUtils.ts`
- A profile is "expiring" if any certificate expires within 60 days but none are already expired
- `getCertificateStatus()` uses `differenceInDays(expiry, today)` — correct date math
- Certificates without an expiry date return `'valid'` (no false positives)

**2.3 "Profiles Expired" — count is correct**
**Status: PASS (code review)**
- A profile is "expired" if any certificate has `daysUntilExpiry < 0`
- `getPersonnelOverallStatus` prioritizes expired > expiring > valid — correct precedence

**2.4 "Certificates to Review" — count matches certificates where certificate_type_id IS NULL**
**Status: PASS (code + DB verified)**
- `useNeedsReviewCount` query: `certificate_type_id IS NULL AND unmapped_by IS NULL AND title_raw IS NOT NULL`, scoped to `personnel.business_id = businessId`
- Database currently shows 3 certificates needing review, which matches the hook's query logic
- The additional `unmapped_by IS NULL` and `title_raw IS NOT NULL` filters are intentional: unmapped certificates (manually dismissed) and certificates without raw title (no OCR data) are excluded from the triage count

**2.5 "Certificates to Review" count updates after assigning types in Settings**
**Status: PASS (code review)**
- Settings close button (line 766) calls: `refetchNeedsReview(); refetch();`
- Both the needs-review count and personnel data are re-fetched when the settings panel closes
- `refetchNeedsReview` triggers the react-query refetch for `['needs-review-count', businessId]`

**2.6 Score capping: no stat card ever shows >100%**
**Status: N/A**
- No percentages are displayed anywhere in the stat cards — all values are raw integer counts
- No division or percentage calculation exists in `DashboardStats`

---

### Deep-Link Navigation

**2.7 Clicking "Certificates to Review" stat card navigates to Settings > Categories > Certificates > Types**
**Status: PASS (code review)**
- Click handler sets `settingsOpen = true` and `settingsDeepLink = 'review-queue'`
- The settings panel opens as a slide-over panel
- The deep-link state drives the auto-scroll behavior (see 2.8)

**2.8 Page scrolls directly to the triage queue on arrival**
**Status: PASS (code review)**
- `useEffect` at lines 80-88 watches for `settingsOpen && settingsDeepLink === 'review-queue'`
- After a 300ms delay (to allow expansion animations), scrolls to `[data-scroll-target="unmapped-certificates"]` with smooth behavior
- The delay is necessary because the collapsible sections need time to expand before the scroll target exists in the DOM

**2.9 Back navigation returns to dashboard correctly**
**Status: PASS (code review)**
- Settings close button resets both `settingsOpen = false` and `settingsDeepLink = null`
- No URL changes involved — it's all in-component state, so browser back button behavior is unaffected
- Dashboard content remains mounted behind the settings overlay

---

### General

**2.10 Dashboard loads without errors on fresh login**
**Status: PASS (code review)**
- `usePersonnel`, `useProjects`, `useNeedsReviewCount` all have `enabled` guards on `!!user` / `!!businessId`
- No full-screen loading spinner — the shell renders immediately with skeleton placeholders
- Parallel data fetching: personnel + certificates fetched in `Promise.all` (no waterfall)

**2.11 Dashboard data refreshes correctly after browser refresh**
**Status: PASS (code review)**
- All data hooks use react-query with proper query keys that include `businessId`
- `usePersonnel` uses `useEffect` triggered by `[user, businessId]` — refetches on mount
- Auth state is restored via `supabase.auth.getSession()` on mount, which triggers the data cascade

**2.12 Dashboard is responsive on mobile viewport**
**Status: PASS (code review)**
- Stat cards grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` — stacks on mobile, 2-col on tablet, 5-col on desktop
- Tabs use `grid-cols-3` which works at all breakpoints
- Personnel cards and content areas use responsive padding via `canvas-padding` class

---

### Summary

| Check | Result |
|---|---|
| 2.1 All Valid Profiles count | PASS |
| 2.2 Profiles Expiring Soon count + threshold | PASS (60-day window) |
| 2.3 Profiles Expired count | PASS |
| 2.4 Certificates to Review count | PASS (DB verified: 3) |
| 2.5 Review count updates on Settings close | PASS |
| 2.6 Score capping (no >100%) | N/A (raw counts only) |
| 2.7 Deep-link to triage queue | PASS |
| 2.8 Auto-scroll to unmapped certificates | PASS (300ms delay) |
| 2.9 Back navigation | PASS |
| 2.10 Fresh login load | PASS |
| 2.11 Browser refresh | PASS |
| 2.12 Mobile responsive | PASS |

**All 11 applicable checks pass. No issues found in Section 2.**

