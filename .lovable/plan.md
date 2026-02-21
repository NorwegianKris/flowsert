

## Update Freelance Label to Freelancers on Project Detail Stats Card

**Risk: GREEN** -- purely UI text change.

### Change

**File: `src/components/ProjectDetail.tsx`** (line 259)

Replace the static label with a flex row showing "Assigned Personnel", employee count, and freelancer count -- with "Freelance" changed to "Freelancers".

```tsx
// Replace:
<p className="text-xs text-muted-foreground">Assigned Personnel</p>

// With:
<p className="text-xs text-muted-foreground flex items-center gap-1.5">
  <span>Assigned Personnel</span>
  <span>{assignedPersonnel.filter(p => p.category !== 'freelancer').length} Employees</span>
  <span>{assignedPersonnel.filter(p => p.category === 'freelancer').length} Freelancers</span>
</p>
```

Also update **`src/components/ProjectsTab.tsx`** (line 213) to match -- change "Freelance" to "Freelancers" on the project cards as well for consistency.

