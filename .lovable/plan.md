
## Make Previous Projects Section Collapsible

### Change

**`src/components/AssignedProjects.tsx`**

Wrap the "Previous Projects" section (lines 172-204) in a `Collapsible` component, matching the pattern already used in `ProjectsTab.tsx` for the admin dashboard.

1. Add imports:
   - `Collapsible, CollapsibleTrigger, CollapsibleContent` from `@/components/ui/collapsible`
   - `ChevronDown` icon from `lucide-react`

2. Replace the static `<h4>` heading with a `CollapsibleTrigger` containing the title, badge count, and a chevron icon that rotates when open.

3. Wrap the project list in `CollapsibleContent` so it collapses/expands on click.

4. The section starts collapsed by default so the profile stays compact.

### Result
The "Previous Projects" heading becomes clickable with a chevron indicator. Clicking it toggles visibility of the project list, keeping the profile tidy when there are many past projects.
