

## Plan: Paginated fetching in usePersonnel

### Problem
`supabase.from('personnel').select('*')` fetches all rows in a single request. Supabase has a default 1000-row limit, and large datasets will be slow.

### Approach
Implement a paginated fetch loop inside `fetchPersonnel` that loads personnel in batches of 200, accumulating results until a batch returns fewer than 200 rows (indicating the last page). Certificates are already scoped by RLS and filtered client-side to matching personnel IDs, so they use the same pattern.

### Changes — single file: `src/hooks/usePersonnel.ts`

**1. Add a paginated fetch helper**

```typescript
const PAGE_SIZE = 200;

async function fetchAllPaginated<T>(
  query: () => any // returns a Supabase query builder
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await query().range(from, to);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    page++;
  }
  return all;
}
```

**2. Replace the two `Promise.all` queries**

Replace:
```typescript
supabase.from('personnel').select('*')
```
and
```typescript
supabase.from('certificates').select('*, certificate_categories(name), ...')
```

With parallel paginated fetches:
```typescript
const [personnelData, certificatesData] = await Promise.all([
  fetchAllPaginated<DbPersonnel>(() => supabase.from('personnel').select('*')),
  fetchAllPaginated<DbCertificate>(() => supabase.from('certificates').select('*, certificate_categories(name), certificate_types(name, certificate_categories(name))'))
]);
```

**3. No changes to return type, mapping, or consumers**

The rest of the function (mapping, filtering, state) stays identical. The hook still returns the full accumulated list, so all UI consumers work without modification.

### What stays unchanged
- `useWorkerPersonnel` — fetches a single record by `user_id`, no pagination needed
- All consuming components — they receive the same `personnel[]` array

### Risk
Green — no schema, RLS, auth, or edge function changes. Pure client-side fetch optimization.

