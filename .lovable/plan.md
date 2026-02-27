

## Plan: Swap recurring/posted toggles and match personnel view styling

### Change 1 — `src/components/AddProjectDialog.tsx`

Swap the order so the **recurring project** block (lines 787–854) appears **before** the **post project** block (lines 751–784). Cut the recurring block and paste it directly after the Scope of Work textarea closing `</div>` (line 749), then place the post project block after it.

### Change 2 — `src/components/ProjectsTab.tsx`

Restyle the Project View filter bar (lines 57–89) to match the personnel view bar in `FreelancerFilters.tsx`:
- Use `bg-[#C4B5FD]/10 rounded-lg border border-[#C4B5FD]/50` instead of `bg-muted/50 border-border/50`
- Add a header row with icon + label: `<Users className="h-4 w-4 text-primary" />` + `"Project view:"` in `text-sm font-medium text-muted-foreground`
- Place both toggles in a second row `flex items-center gap-4 flex-wrap`, removing the inline `Project View` text
- Always show both toggles (remove the `postedProjectsCount > 0` / `recurringProjectsCount > 0` conditionals) — they just show 0 badge when empty

