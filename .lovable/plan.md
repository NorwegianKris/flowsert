
## Add Location to Project Cards

A small UI tweak to the project cards in the "Active & Upcoming Projects" section.

### What changes

In the bottom line of each project card (where "Start: ..." and "End: ..." are shown), add the project location to the right on the same line.

The location will use `project.projectLocationLabel` (the structured "City, Country" format) if available, falling back to `project.location` (free-text). If neither exists, nothing is shown.

A small `MapPin` icon from lucide-react will precede the location text for visual clarity.

### Technical details

**File:** `src/components/ProjectsTab.tsx`

- Import `MapPin` from `lucide-react`
- In the `ProjectCard` component, update the bottom `div` (lines 219-224) to add a location span after the date spans:

```tsx
<div className="mt-auto text-xs text-muted-foreground flex flex-wrap gap-x-3">
  <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
  {project.endDate && (
    <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
  )}
  {(project.projectLocationLabel || project.location) && (
    <span className="flex items-center gap-1">
      <MapPin className="h-3 w-3" />
      {project.projectLocationLabel || project.location}
    </span>
  )}
</div>
```

No other files need changes -- the `Project` interface already has `location` and `projectLocationLabel` fields.
