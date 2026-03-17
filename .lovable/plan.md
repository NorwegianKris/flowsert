

## Plan: Move Issuing Authorities and Locations into an Advanced collapsible section

### Change

In `src/pages/AdminDashboard.tsx` (lines 952-985), replace the two standalone Collapsible sections (Issuing Authorities and Locations) with a single outer Collapsible labeled "Advanced — data standardisation tools", collapsed by default. Inside it, nest both sections as inner collapsibles preserving their current content.

### Structure

```text
Certificate Compliance Configuration
├── Categories (existing, unchanged)
└── Advanced — data standardisation tools (NEW, collapsed by default)
    ├── Issuing Authorities (inner collapsible)
    └── Locations (inner collapsible)
```

### Implementation

Replace lines 952-985 with:

1. A single `<Collapsible>` with a trigger styled with `Settings2` icon + "Advanced — data standardisation tools" label in muted/smaller text to differentiate from primary sections
2. Inside `<CollapsibleContent>`, nest the existing Issuing Authorities and Locations collapsibles with their current content intact
3. Add a subtle description line: "Rarely used tools for issuer taxonomy and location standardisation."

No new imports needed — `Settings2` is already imported in `CategoriesSection.tsx` but needs adding to AdminDashboard. `Collapsible` components are already used throughout the file.

### Files

| File | Change |
|------|--------|
| `src/pages/AdminDashboard.tsx` | Replace two standalone collapsibles (lines 952-985) with one outer Advanced collapsible containing both as nested items. Add `Settings2` to lucide imports if not present. |

