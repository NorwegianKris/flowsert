

## Full Colour Consistency Audit

### Known Issue — Previous Projects Rows

Two components give "Previous Projects" rows a grey background (`bg-muted/30`) while "Active Projects" rows use `bg-card`. All project rows should match the active style.

| File | Line | Current | Fix |
|------|------|---------|-----|
| `PersonnelProjectsTabs.tsx` | 157 | `variant === 'previous' ? 'bg-muted/30 hover:bg-muted/50' : 'bg-card hover:bg-accent/50'` | Remove the ternary — always use `'bg-card hover:bg-accent/50'` |
| `AssignedProjects.tsx` | 187 | `"... bg-muted/30 cursor-pointer group hover:bg-muted/50 ..."` | Change to `"... bg-card cursor-pointer group hover:bg-accent/50 ..."` |

### Broader Audit Results

**No other inconsistencies found** across the element types listed:

- **List rows** — Personnel list rows (`PersonnelOverview.tsx`) use `hover:bg-muted/50` with no explicit bg (inherits card). Project list rows in `PostedProjects.tsx` use `hover:bg-muted/50`. These are consistent since they sit inside a Card container. The only outliers are the two Previous Projects rows above.

- **Card backgrounds** — `ProjectCard` in `ProjectsTab.tsx` uses the same Card component for both active and previous projects. Project cards in `PostedProjects`, `WorkerProjectDetail`, and `PersonnelProjectsTabs` all use Card or `bg-card`. Consistent.

- **Section/panel backgrounds** — Collapsible sections use no explicit bg (inherit from card). Info panels use `bg-muted/30` consistently for non-interactive metadata blocks (document preview headers, notification messages, certificate metadata). These are structural/info panels, not list rows — correct usage.

- **Tab content areas** — All tab content renders inside Card containers with the same `bg-card` background. Consistent.

- **Dialog/modal interiors** — All dialogs use the default Dialog component which applies `bg-background`. Consistent.

- **Icon-only buttons** — Verified no regression from previous standardisation pass.

### Summary

Only **2 lines** need changes — both are the Previous Projects row background fix. Everything else is already consistent.

### Risk
CSS class changes only. No logic touched. 🟢

