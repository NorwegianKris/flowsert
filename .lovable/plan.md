

## Plan: Clean up remaining completion references in PersonnelCard

Single file: `src/components/PersonnelCard.tsx`

### Current state
- Changes 1 and 2 are already applied (no badge block exists; delete button is at `right-2`)
- Line 85: `const { percentage, color } = calculateCompletion(personnel, documentCount);` still exists
- Line 235: `{percentage}% profile complete` still references the variable

### Actions

1. **Remove line 85** — delete `const { percentage, color } = calculateCompletion(personnel, documentCount);`
2. **Update line 235** — change from `{personnel.certificates.length} Certificates · {percentage}% profile complete` to just `{personnel.certificates.length} Certificates` (since percentage is no longer available)
3. **Clean unused imports** — remove `cn` import (line 26) if unused after this change

### Risk
- Green (UI-only change)

