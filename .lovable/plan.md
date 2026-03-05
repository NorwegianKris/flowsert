

## Add Purple Hover Effect to All ToggleGroupItems on Purple Backgrounds

Cosmetic change. 🟢

### Problem

ToggleGroupItems sitting on purple (`bg-primary`) containers don't show the subtle lighter-purple hover. The base toggle style (`hover:bg-primary/80`) doesn't work well here because the items are transparent on top of a purple parent. They need the same white-overlay approach used for TabsTrigger: `hover:bg-primary-foreground/20`.

### Changes

Add `hover:bg-primary-foreground/20` to the inline className of every ToggleGroupItem that sits on a purple background. This overrides the base toggle hover with the correct subtle lightening effect. Text is already `text-white` / `text-primary-foreground` so it stays white.

**Files and locations:**

1. **`src/components/FreelancerFilters.tsx`** — 4 items (All, Employees, Freelancers, Custom): add `hover:bg-primary-foreground/20`

2. **`src/components/ProjectsTab.tsx`** — 4 items (All, Active, Recurring, Posted): add `hover:bg-primary-foreground/20`

3. **`src/components/PersonnelFilters.tsx`** — 3 sub-toggle items (Categories, Types, Issuers): add `hover:bg-primary-foreground/20`

4. **`src/components/AddProjectDialog.tsx`** — 3 filter sub-toggles (Types, Categories, Issuers) + 2 invite/assign toggles: add `hover:bg-primary-foreground/20`

5. **`src/components/CompliancePlanGenerator.tsx`** — already has custom hover classes; update to use `hover:bg-primary-foreground/20` for consistency (replacing current `hover:shadow-md hover:-translate-y-0.5`)

6. **`src/components/BillingSection.tsx`** — 2 items (Monthly, Annual): add `hover:bg-primary-foreground/20` if on a purple background

