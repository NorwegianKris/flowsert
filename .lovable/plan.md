

## Plan: Remove the "Active" status badge from project cards

### Single file change — `src/components/ProjectsTab.tsx`

In the `ProjectCard` component, remove the non-posted status badge rendering. Currently line ~194 shows a `<Badge variant={config.variant}>` with the status icon and label when the project is not posted. Remove that `else` branch so only posted projects show a badge, and the recurring badge remains.

