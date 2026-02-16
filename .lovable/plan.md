

## Add Icons to Job Role and Location Filter Buttons

### What Changes
Add a briefcase icon (matching the personnel card) to the **Job Role** filter and a globe icon to the **Location** filter, in both places where these filters appear:

1. **`src/components/PersonnelFilters.tsx`** (admin dashboard filters)
2. **`src/components/AddProjectDialog.tsx`** (new project dialog filters)

### Details

**PersonnelFilters.tsx:**
- Import `Briefcase` and `Globe` from `lucide-react` (line 7)
- Job Role button (line 166): add `<Briefcase className="mr-2 h-4 w-4" />` before the label text
- Location button (line 213): add `<Globe className="mr-2 h-4 w-4" />` before the label text

**AddProjectDialog.tsx:**
- Import `Briefcase` and `Globe` from `lucide-react` (line 16)
- Job Role collapsible header (line 890): add `<Briefcase className="h-3 w-3" />` before "Job Role" text
- Location collapsible header (line 920): add `<Globe className="h-3 w-3" />` before "Location" text

This matches how the Certificates filter already has an `Award` icon, and keeps icons consistent with the personnel card where `Briefcase` is used for role.
