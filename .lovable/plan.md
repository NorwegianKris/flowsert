

## Fix: Project Invitation Row Layout (Final)

Both files have identical structure. Two changes needed in each:

1. **Outer div** — remove `gap-2` from `className="flex flex-col gap-2 p-3 ..."`
2. **Date row** — replace `pl-11` with `mt-2`

### PersonnelInvitations.tsx (line 82)
Change `"flex flex-col gap-2 p-3 rounded-lg..."` → `"flex flex-col p-3 rounded-lg..."`

### PersonnelInvitations.tsx (line 115)
Change `"flex items-center gap-1 text-xs text-muted-foreground pl-11"` → `"mt-2 flex items-center gap-1 text-xs text-muted-foreground"`

### PersonnelProjectsTabs.tsx (line 232)
Change `"flex flex-col gap-2 p-3 rounded-lg..."` → `"flex flex-col p-3 rounded-lg..."`

### PersonnelProjectsTabs.tsx (line 254)
Change `"flex items-center gap-1 text-xs text-muted-foreground pl-11"` → `"mt-2 flex items-center gap-1 text-xs text-muted-foreground"`

### Risk
CSS class changes only. No logic touched. 🟢

