

## Section 9: Certificate Categories Manager — QA Results

### 9.1 Default categories seeded for new businesses

**Status: PASS**

The `seed_default_certificate_categories()` trigger (SECURITY DEFINER, fires on `businesses` INSERT) seeds exactly these 19 categories:

| # | Category | In trigger |
|---|---|---|
| 1 | Health & Safety | Yes |
| 2 | First Aid & Medical | Yes |
| 3 | Lifting & Rigging | Yes |
| 4 | Electrical | Yes |
| 5 | Welding | Yes |
| 6 | Mechanical | Yes |
| 7 | NDT / Inspection | Yes |
| 8 | Diving | Yes |
| 9 | Maritime / STCW | Yes |
| 10 | Crane & Heavy Equipment | Yes |
| 11 | Scaffolding | Yes |
| 12 | Rope Access & Working at Heights | Yes |
| 13 | Hazardous Materials & Chemicals | Yes |
| 14 | Fire Safety & Emergency Response | Yes |
| 15 | Management & Supervision | Yes |
| 16 | Trade Certifications | Yes |
| 17 | Regulatory / Compliance | Yes |
| 18 | Driver & Operator Licenses | Yes |
| 19 | Other | Yes |

The trigger uses idempotent `INSERT ... WHERE NOT EXISTS` to prevent duplicates on re-runs.

The `CertificateCategoryOnboarding` component displays the same 19 categories (hardcoded in `DEFAULT_CATEGORIES` array) and dismisses via `localStorage` key per business.

**All 19 default categories match between the DB trigger and the onboarding UI. No code changes required.**

### Anchor check
- Q1 (SQL/schema): No changes
- Q2 (edge functions/auth): No changes
- Q3 (access control): No changes
- Q5 (UI only): Audit only

