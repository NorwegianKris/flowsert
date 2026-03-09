

## Finding: `employment_type` column does not exist

The `personnel` table has no `employment_type` column. However, it does have two related fields:

- **`category`** (text, nullable, default `'employee'`) — stores values like `'employee'` or `'freelancer'`
- **`is_freelancer`** (boolean, default `false`)

These already represent employment type. The codebase uses `category` as the canonical field (the `PersonnelCategory` type in `src/types/index.ts` is `'employee' | 'freelancer'`).

### Recommended approach

Instead of creating a new `employment_type` column, use the existing `category` column:

**Single file change: `src/components/AddPersonnelDialog.tsx`**

1. Add `category: 'employee'` to `formData` initial state (line 33)
2. Add it to the validation check (line 65) — though it has a default so it will always be valid
3. Write `category: formData.category` in the insert (line 72–79), and set `is_freelancer: formData.category === 'freelancer'` to keep both fields in sync
4. Add the dropdown field between Job Role and the invitation checkbox (~after line 225), with:
   - Label: "Employment Type *"
   - Options: Employee (`employee`), Freelancer (`freelancer`)
   - Default: `employee`
   - Same `Select` component styling as Job Role
5. Add `category: 'employee'` to `resetForm`

### Risk: 🟢 UI-only change, writes to existing column with existing RLS policies.

