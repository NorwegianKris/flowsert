

## Show Applicant Count for Posted Projects

Cosmetic only. 🟢

### Change — `src/components/ProjectsTab.tsx`, personnel row (lines 246-280)

Update the empty-personnel branch (line 275-279) to check if the project is posted. If posted, show `"X Applicants"` with Users icon instead of "No personnel assigned".

```tsx
) : isPosted ? (
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Users className="h-4 w-4" />
    {applicantCount} Applicant{applicantCount !== 1 ? 's' : ''}
  </span>
) : (
  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <Users className="h-4 w-4" />
    No personnel assigned
  </span>
)
```

### File
- `src/components/ProjectsTab.tsx`

