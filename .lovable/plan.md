

## Plan: Certificate Category Onboarding Dialog

### Overview
Create a `CertificateCategoryOnboarding` component that shows a one-time modal when an admin first visits the dashboard and their business has zero certificate categories. The modal lets them pick from preset categories, add custom ones, and save — or skip/dismiss permanently.

### New file: `src/components/CertificateCategoryOnboarding.tsx`

A dialog component that:

1. **Trigger logic** — On mount (admin dashboard), queries `certificate_categories` count for the business. If count === 0 AND `localStorage` key `flowsert_category_onboarding_dismissed_{businessId}` is not set, opens the dialog.

2. **UI contents** (matches existing Dialog pattern from WelcomeDialog/AddCertificateDialog):
   - Heading: "Set up your certificate categories"
   - Subline: "Select the categories relevant to your business. You can always add, edit, or remove these later in Settings."
   - Checkbox grid of 14 default categories: Health & Safety, Diving, Lifting & Rigging, Electrical, Welding, First Aid & Medical, Maritime, Mechanical, NDT / Inspection, Management & Supervision, Trade Certifications, Regulatory / Compliance, Driver & Operator Licenses, Other — all unchecked by default
   - Text input + "Add" button for custom categories (appends to a local list of custom entries, also shown as checked items)
   - Primary button: "Save & Continue" — batch-inserts all selected (default + custom) into `certificate_categories` for this `business_id`, then closes and sets localStorage flag
   - Secondary link: "Skip for now" — closes without inserting; modal reappears next visit
   - "Don't show again" checkbox next to Skip — sets localStorage flag so it never reappears even with zero categories

3. **Props**: `businessId: string`, `onComplete: () => void` (to let dashboard refresh if needed)

### Edit: `src/pages/AdminDashboard.tsx`

- Import `CertificateCategoryOnboarding`
- Render `<CertificateCategoryOnboarding businessId={businessId} onComplete={() => {}} />` inside the main return, after DashboardHeader — only when `isAdmin && businessId` are truthy
- The component self-manages its open/closed state internally (like WelcomeDialog), so no state plumbing needed in the dashboard

### What stays untouched
- `CertificateCategoriesManager` — no changes
- Database schema — no new columns or tables; uses existing `certificate_categories` table
- Only admins see this (component checks role internally or relies on being rendered only in AdminDashboard)

### Technical details

- localStorage key pattern: `flowsert_category_onboarding_dismissed_{businessId}` — business-scoped so switching businesses works correctly
- The count check runs on mount via `supabase.from('certificate_categories').select('id', { count: 'exact', head: true }).eq('business_id', businessId)` for efficiency
- Batch insert uses a single `.insert([...])` call with all selected category names
- Custom categories are deduplicated against the default list (case-insensitive) before insert

