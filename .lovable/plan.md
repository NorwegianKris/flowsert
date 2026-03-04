

## Pulsating Button Always Visible + White Lists/Inputs in Settings

Cosmetic only. No schema changes. 🟢

### Part 1: Show "Teach the System" button even when open

**File:** `src/components/TaxonomySeedingTool.tsx` (line 251)

Remove the `{!open && ...}` conditional — always render the trigger. When open, stop the pulse animation so it stays visible but calm.

```tsx
<CollapsibleTrigger
  onClick={(e) => e.stopPropagation()}
  className={cn(
    "flex items-center gap-2 text-sm font-bold cursor-pointer py-2 px-4 rounded-full bg-primary text-primary-foreground shadow-lg transition-colors",
    !open && "animate-pulse hover:animate-none"
  )}
>
  <Sparkles className="h-4 w-4" />
  <span>Teach the System</span>
</CollapsibleTrigger>
```

X close button inside content stays as-is.

---

### Part 2: White bg + lavender hover on list items and search inputs in Settings

Apply the PersonnelCard hover pattern (`bg-white hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20`) to list rows, and white background to search inputs.

**Files to update (list item rows):**

| File | Current class on rows | Change |
|---|---|---|
| `CertificateTypesManager.tsx` (line 301) | `hover:bg-muted/50` | `bg-white dark:bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all rounded-lg` |
| `CertificateTypesManager.tsx` (line 244) | Search Input `className="pl-9 w-[200px]"` | Add `bg-white dark:bg-card` |
| `IssuerTypesManager.tsx` (line 373) | `hover:bg-muted/50` | Same white + lavender hover |
| `DepartmentsManager.tsx` (line 162) | `hover:bg-muted/50` | Same pattern |
| `WorkerGroupsManageList.tsx` (line 145) | `hover:bg-muted/50` | Same pattern |
| `WorkerGroupsManageList.tsx` (line 192) | Sub-items `hover:bg-muted/50` | Same pattern |
| `CertificateCategoriesManager.tsx` | Category items + inputs | White bg + lavender hover |
| `LocationStandardizationTool.tsx` | List items if present | Same pattern |

**Search/filter inputs** across these components: add `bg-white dark:bg-card` class.

The hover effect mirrors the PersonnelCard: subtle shadow lift with lavender ring, replacing the flat `hover:bg-muted/50`.

