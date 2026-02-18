

## Swap Colors: Project Invitations and Posted Projects

### What Changes

Currently on the worker dashboard:
- **Project Invitations** has a tinted card (`border-primary/30 bg-primary/5` -- indigo accent)
- **Posted Projects** has a plain card (no accent color)

On the admin dashboard, posted projects use the lavender accent (`bg-[#C4B5FD]/10 border-[#C4B5FD]/50`). To make the worker dashboard coherent with the admin view, the colors need to swap.

### Changes

**1. `src/components/PostedProjects.tsx`**
- Empty-state Card (line 82): add `border-[#C4B5FD]/50 bg-[#C4B5FD]/10`
- Main Card (line 101): add `border-[#C4B5FD]/50 bg-[#C4B5FD]/10`
- This matches how the admin sees posted projects in `ProjectsTab.tsx`

**2. `src/components/PersonnelInvitations.tsx`**
- Card (line 66): remove `border-primary/30 bg-primary/5`, revert to plain `border-border/50` only
- This removes the indigo accent from invitations, keeping it as a neutral card

### Result
- Posted Projects on the worker dashboard will have the same lavender tint as posted projects on the admin dashboard
- Project Invitations will appear as a clean neutral card, no longer competing visually with posted projects
