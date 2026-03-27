

## Plan: Add performance indexes on frequently searched columns

### Problem
Key columns used in search, filtering, and joins lack indexes, which will degrade query performance as data grows.

### Change

**Single database migration** adding 6 indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_certificates_name ON public.certificates (name);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry_date ON public.certificates (expiry_date);
CREATE INDEX IF NOT EXISTS idx_personnel_location ON public.personnel (location);
CREATE INDEX IF NOT EXISTS idx_personnel_role ON public.personnel (role);
CREATE INDEX IF NOT EXISTS idx_personnel_business_id ON public.personnel (business_id);
CREATE INDEX IF NOT EXISTS idx_personnel_activated ON public.personnel (activated);
```

All use `CREATE INDEX IF NOT EXISTS` for idempotency. No code changes needed.

### Risk
Schema change (Q1) -- **anchor required** before publish. However, adding indexes is non-destructive and does not affect RLS, data, or application logic.

