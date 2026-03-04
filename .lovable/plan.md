

## Fix Personnel Row Colors in Project View

Cosmetic only. No schema changes. 🟢

### Problem
Employee rows in the project view personnel list use `bg-muted/50` (grey). Should match the PersonnelCard styling: white background with subtle border for employees, lavender with lavender border for freelancers.

### Reference (PersonnelCard.tsx)
- **Freelancer**: `border-[#C4B5FD] bg-[#C4B5FD]/10`
- **Employee**: `border-border/50` (default white card background)

### Changes

**`src/components/ProjectDetail.tsx`** (line 397)
Change the row className from:
```
bg-[#C4B5FD]/10 hover:bg-[#C4B5FD]/20  (freelancer)
bg-muted/50 hover:bg-muted              (employee)
```
To:
```
bg-[#C4B5FD]/10 border border-[#C4B5FD]  (freelancer)
bg-card border border-border/50           (employee)
```

**`src/components/WorkerProjectDetail.tsx`** (same pattern, line ~268)
Apply identical change to the personnel row styling.

