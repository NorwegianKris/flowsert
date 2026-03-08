

## Implementation Plan

### Prompt 1 — Projects Tab

**A. White card framing for sections in ProjectsTab.tsx**

The "All Projects" section (lines 121-146) and "Previous Projects" collapsible (lines 148-175) are bare `<div>`s with no Card wrapper. The `InvitationLog` component already has its own Card wrapper internally, so it does not need one.

**Fix:** Wrap the "All Projects" section and the "Previous Projects" `<Collapsible>` each in a `<Card className="border-border/50"><CardContent className="p-6">...</CardContent></Card>` to match the standard card framing used elsewhere.

**B. Width alignment**

All three sections are already inside the same `space-y-6` container and are full-width block elements. Once A is applied, they will automatically be the same width. No additional width fix needed.

**C. Project view top card — status badge consistency**

Comparing `ProjectDetail.tsx` line 240 with `ProjectsTab.tsx` ProjectCard: The detail view adds `className="text-sm"` to the status Badge, making it slightly larger than the card version. The card version has no size class.

**Fix:** Remove `className="text-sm"` from the status Badge in `ProjectDetail.tsx` (line 240) so it matches the default badge size used on project cards. The Posted badge (line 235) also has `text-sm` — remove it there too for consistency. Background colours already match between card and detail view.

### Prompt 2 — Settings

**A. Description banners — purple background with white text**

All settings section description `<p>` elements currently use `text-sm text-muted-foreground`. These appear in:

1. `AdminDashboard.tsx` line 914 — "Manage team members, roles, and admin access."
2. `AdminDashboard.tsx` line 930 — "Update your company details, logo, and contact information."
3. `AdminDashboard.tsx` line 962-963 — "Manage the official issuing authorities..."
4. `AdminDashboard.tsx` line 980 — "Normalize and manage certificate location data."
5. `AdminDashboard.tsx` line 1000 — "Configure data processing acknowledgements..."
6. `AdminDashboard.tsx` line 1024 — "Manage registration links..."
7. `AdminDashboard.tsx` line 1043 — "View feedback and improvement suggestions..."
8. `CategoriesSection.tsx` line 24 — top-level "Manage the categories..."
9. `CategoriesSection.tsx` lines 62, 71, 82, 105, 114, 147 — sub-tab descriptions

**Fix:** Change all of the above from `<p className="text-sm text-muted-foreground">` to `<p className="text-sm bg-primary text-primary-foreground rounded-md px-3 py-2">`. This uses the system's primary purple with white text, in a rounded banner style.

The `CategoriesSection.tsx` line 130 (Advanced tools "Rarely used tools...") uses `text-xs text-muted-foreground` — this is a minor annotation, not a section description banner, so it will be left unchanged.

**B. Category tab rename**

In `CategoriesSection.tsx` line 43, change "Global Documents" to "Documents".

### Files to edit

| File | Changes |
|------|---------|
| `src/components/ProjectsTab.tsx` | Wrap "All Projects" and "Previous Projects" sections in Card |
| `src/components/ProjectDetail.tsx` | Remove `text-sm` from status badges (lines 235, 240) |
| `src/pages/AdminDashboard.tsx` | Update 7 description `<p>` elements to purple banner style |
| `src/components/CategoriesSection.tsx` | Update 7 description `<p>` elements to purple banner style + rename tab |

### Risk

All changes are CSS class adjustments and a text rename. No logic, data fetching, or architecture changes.

