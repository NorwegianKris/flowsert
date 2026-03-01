

## Plan: Auto-create default certificate categories + simplify onboarding modal

### Overview

Three changes: (1) a database trigger to auto-seed categories on business creation, (2) a one-time backfill migration for existing businesses, (3) rewrite the onboarding modal to be informational only.

**Risk classification: 🔴 — SQL migration + trigger required. Anchor before publish.**

---

### Change 1: Database migration

A single migration with two parts:

**Part A — Trigger function + trigger on `businesses` INSERT:**

Create a function `seed_default_certificate_categories()` that fires AFTER INSERT on `businesses`. It inserts the 19 default categories for the new `business_id`. Uses `SECURITY DEFINER` so it runs with elevated privileges (the insert into `certificate_categories` bypasses RLS).

The 19 categories:
1. Health & Safety
2. First Aid & Medical
3. Lifting & Rigging
4. Electrical
5. Welding
6. Mechanical
7. NDT / Inspection
8. Diving
9. Maritime / STCW
10. Crane & Heavy Equipment
11. Scaffolding
12. Rope Access & Working at Heights
13. Hazardous Materials & Chemicals
14. Fire Safety & Emergency Response
15. Management & Supervision
16. Trade Certifications
17. Regulatory / Compliance
18. Driver & Operator Licenses
19. Other

**Part B — Backfill for existing businesses:**

For each existing business, insert any of the 19 default categories that don't already exist (matched by name + business_id). Uses `INSERT ... ON CONFLICT DO NOTHING` or a `NOT EXISTS` subquery to avoid duplicates. This covers Techno Dive (which has 9 categories already) and FlowSert TestCo (which has 0).

Note: The `certificate_categories` table has no unique constraint on `(business_id, name)`. The backfill SQL will use `WHERE NOT EXISTS (SELECT 1 FROM certificate_categories WHERE business_id = b.id AND name = cat_name)` to prevent duplicates. The trigger will also use this pattern for safety.

### Change 2: Simplify `CertificateCategoryOnboarding.tsx`

Rewrite the component to be purely informational:

- **Remove**: `Checkbox` import, `Input` import, `Plus` icon import, all state for `selectedDefaults`, `customCategories`, `customInput`, `dontShowAgain`, `saving`
- **Remove**: `toggleDefault`, `handleAddCustom`, `removeCustom`, `handleSave`, `handleSkip` logic
- **Keep**: The `useEffect` that checks localStorage and shows the dialog (but remove the category count check — always show once for new admins regardless of category count, since categories now always exist)
- **Trigger condition**: Show if localStorage flag is not set. On dismiss, set the flag.
- **New content**:
  - Same icon (FolderOpen)
  - Heading: "Your certificate categories are ready"
  - Subtext: "We've set up 19 default categories to organize your team's certificates. You can add, rename, or remove these anytime in Settings."
  - Read-only list of the 19 categories (simple text list, two columns, no checkboxes)
  - Single "Got it, continue" button that sets the localStorage flag and closes
- **Update** the `DEFAULT_CATEGORIES` array to match the new 19 categories

### Files touched
- **Migration**: New SQL migration (trigger + backfill)
- **Edit**: `src/components/CertificateCategoryOnboarding.tsx` (simplify to informational modal)

### Technical details

- The trigger function uses `SECURITY DEFINER` with `SET search_path TO 'public'` to safely insert into `certificate_categories` which has RLS enabled
- The trigger fires `AFTER INSERT` (not `BEFORE`) so the business row exists and can be referenced
- The backfill uses a cross join between `businesses` and an `unnest(ARRAY[...])` of category names, filtered by `NOT EXISTS`
- No changes to RLS policies, no changes to `handle_new_user`, no changes to any other component

