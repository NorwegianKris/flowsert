

## Category Rename Migration

**Risk: 🟢 GREEN** — Data-only UPDATE on `name` column, no structural changes, no RLS changes.

### What changes
| Current Name | New Name |
|---|---|
| Hydraulic | Hydraulic & Subsea |
| Machine Operating | Technical & Specialist |
| Other | Regulatory & Identity |

### Implementation
Run 3 UPDATE statements against `certificate_categories` for business `38672512-...` using the database migration tool. Each updates only `name` and `updated_at`. No schema changes, no code changes needed — the app reads category names dynamically.

### Verification
After migration, run a SELECT on `certificate_categories` for Techno Dive to confirm all 9 categories with correct names.

### Prompt Risk Checklist
- Q1 (SQL/migration): Yes → but GREEN (data-only, no schema/RLS)
- Q2–Q4: No
- Q5: Effectively a label rename

