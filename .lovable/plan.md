

## Plan: Remove mock personnel records

**Single database migration** to delete the 5 hardcoded mock personnel records by UUID. `DELETE WHERE id IN (...)` is inherently safe if rows don't exist — no `IF EXISTS` wrapper needed since `DELETE` is a no-op on missing rows.

### Migration SQL

```sql
DELETE FROM public.personnel
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
```

Cascading deletes on `certificates`, `availability`, and other tables referencing `personnel_id` will be handled automatically by any existing `ON DELETE CASCADE` foreign keys. If no FK cascades exist, related orphan rows should also be cleaned — will check FK definitions before executing.

### Risk
Schema change (Q1) — **anchor required**. Low functional risk — removes only known test data.

