

## Insert 56 canonical certificate types

**Risk: 🔴 RED** — Schema-adjacent data insert touching `certificate_types` table used by compliance outputs.

### What happens
- A DO block inserts up to 56 new certificate type rows across 9 categories for business `38672512-...`
- `ON CONFLICT (business_id, name) DO NOTHING` safely skips any of the 8 existing types that match by name
- No schema changes, no code changes — purely data

### Verification plan
After insert, run:
1. `SELECT COUNT(*) FROM certificate_types WHERE business_id = '...' AND is_active = true` → expected ~64
2. Breakdown by category name

### Implementation
Single migration containing the user's exact SQL block.

