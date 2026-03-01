

## Data Migration: Merge 7 Old Certificate Categories

This is a **data-only** operation — no application code changes. It reassigns certificate types from old categories to new ones, then deletes the old category rows.

### Risk Classification: 🔴 RED
- Touches `certificate_types.category_id` (UPDATE) and `certificate_categories` (DELETE)
- Scoped to Techno Dive's `business_id` only
- Reversible only if we note the old mappings beforehand

### SQL Operations (7 merges, executed via data insert tool)

For each of the 7 pairs, two statements scoped by `business_id` matching Techno Dive (`38672512-2331-4546-8bc4-de942605fce1`):

1. `UPDATE certificate_types SET category_id = (SELECT id FROM certificate_categories WHERE name = '{new}' AND business_id = '...') WHERE category_id = (SELECT id FROM certificate_categories WHERE name = '{old}' AND business_id = '...')`
2. `DELETE FROM certificate_categories WHERE name = '{old}' AND business_id = '...'`

**Pairs:**
| Old Category | New Category |
|---|---|
| Drivers License | Driver & Operator Licenses |
| Equipment & Operations | Crane & Heavy Equipment |
| Hydraulic | Mechanical |
| Lifting | Lifting & Rigging |
| Medical & Health | First Aid & Medical |
| Regulatory & Identity | Regulatory / Compliance |
| Safety & Emergency | Fire Safety & Emergency Response |

### Safety checks
- All queries are scoped to Techno Dive's `business_id`
- Each UPDATE uses subqueries to match by name, so if a category doesn't exist, zero rows are affected (no error)
- The DELETE only removes the old category after its types have been reassigned

### Files touched
None — data migration only.

