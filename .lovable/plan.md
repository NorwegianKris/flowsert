

## Temporary Tier Adjustment for Techno Dive

**Risk: GREEN** -- Data-only update to one row. No schema, RLS, function, or code changes.

---

### What we know

- Business: **Techno Dive** (`38672512-2331-4546-8bc4-de942605fce1`)
- Current entitlement: `starter`, `profile_cap = 25`
- Active profiles: **157**
- Warning banner is correctly showing

### Change

Run a single UPDATE via migration (the only write path available):

```sql
UPDATE entitlements
SET tier = 'professional',
    profile_cap = 200,
    is_unlimited = false,
    updated_at = now()
WHERE business_id = '38672512-2331-4546-8bc4-de942605fce1';
```

### After refresh

- Warning banner disappears (157 < 200)
- Activations allowed up to 200
- Cap enforcement remains intact for activations 201+
- No code changes needed

