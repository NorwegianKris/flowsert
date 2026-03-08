

## UI Consistency Fixes — Implementation Plan

### Fix 1: List Row Hover Pattern (7 locations)

Replace `rounded-lg` with `hover:bg-[#C4B5FD]/10 relative hover:z-10 first:rounded-t-lg last:rounded-b-lg` on these rows:

| File | Line | Current class snippet |
|------|------|----------------------|
| `DepartmentsManager.tsx` | 163 | `...transition-all rounded-lg"` |
| `WorkerCategoriesManager.tsx` | 164 | `...transition-all rounded-lg"` |
| `WorkerGroupsManageList.tsx` | 146 | `...transition-all rounded-lg cursor-pointer"` |
| `WorkerGroupsManageList.tsx` | 193 | `...transition-all rounded-lg"` |
| `CertificateTypesManager.tsx` | 301 | `...transition-all rounded-lg"` |
| `IssuerTypesManager.tsx` | 373 | `...transition-all rounded-lg"` |
| `CertificateAliasesManager.tsx` | 148 | `...transition-all rounded-lg"` |

Each: replace `rounded-lg` at the end with `hover:bg-[#C4B5FD]/10 relative hover:z-10 first:rounded-t-lg last:rounded-b-lg`. Keep `cursor-pointer` where present. Don't touch ring/shadow/transition classes.

### Fix 2: Icon Button Sizing & Color (6 files)

**Pencil buttons — add `text-muted-foreground hover:text-foreground`:**

| File | Line | Current `className` |
|------|------|-------------------|
| `CertificateCategoriesManager.tsx` | 260 | `h-7 w-7 text-muted-foreground hover:text-primary` → `h-8 w-8 text-muted-foreground hover:text-foreground` |
| `CertificateTypesManager.tsx` | 323 | `h-8 w-8` → `h-8 w-8 text-muted-foreground hover:text-foreground` |
| `IssuerTypesManager.tsx` | 407 | `h-8 w-8` → `h-8 w-8 text-muted-foreground hover:text-foreground` |
| `WorkerGroupsManageList.tsx` | 160 | `h-8 w-8` → `h-8 w-8 text-muted-foreground hover:text-foreground` |
| `PersonnelOverview.tsx` | 179 | `h-8 w-8` → `h-8 w-8 text-muted-foreground hover:text-foreground` |
| `ActivationOverview.tsx` | 323 | `h-8 w-8` → `h-8 w-8 text-muted-foreground hover:text-foreground` |

**Trash button in CertificateCategoriesManager.tsx** (line 268): `h-7 w-7` → `h-8 w-8` (color classes already correct).

**Pencil icon in CertificateCategoriesManager.tsx** (line 262): `h-3.5 w-3.5` → `h-4 w-4` to match standard.
**Trash icon in CertificateCategoriesManager.tsx** (line 270): `h-3.5 w-3.5` → `h-4 w-4`.

### Risk

All changes are CSS class-only. No logic, architecture, or data changes.

