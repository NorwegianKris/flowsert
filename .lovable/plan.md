

## Restyle Informational Banner to Amber Lightbulb Pattern

### Overview
Change the verification note in `AddCertificateDialog.tsx` from the current muted grey `Info` icon style to the amber 💡 lightbulb banner pattern already used in `CategoriesSection.tsx` and `IssuerTypesManager.tsx`.

### File

| Action | File |
|--------|------|
| **Edit** | `src/components/AddCertificateDialog.tsx` — lines 563–569 |

### Change

Replace:
```tsx
<div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
  <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
  <p className="text-xs text-muted-foreground">
    Please review each certificate below...
  </p>
</div>
```

With:
```tsx
<div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
  <span className="text-sm">💡</span>
  <span className="text-xs text-muted-foreground">
    Please review each certificate below and ensure all fields are correct before saving. Click on a certificate to expand and edit its details.
  </span>
</div>
```

This matches the existing pattern in `CategoriesSection.tsx` (lines 54–56, 97–99) and `IssuerTypesManager.tsx` (line 313). No schema or backend changes.

