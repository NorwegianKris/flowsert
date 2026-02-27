

## Rename Certificate Categories

**Risk: 🟢 GREEN** — Data update only, no schema changes.

These are simple renames of existing certificate category records for business `38672512-...`. The migration tool will execute the UPDATE statements.

### Changes
| Current Name | New Name |
|---|---|
| Health and Medical | Medical & Health |
| Hydraulic & Subsea | Hydraulic |
| Technical & Specialist | Equipment & Operations |

### Implementation
Run a single migration with three UPDATE statements against `certificate_categories`. No code changes needed — the UI reads category names dynamically.

