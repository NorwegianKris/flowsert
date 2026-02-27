

## Plan: Move profile completion from badge to footer text

Single file: `src/components/PersonnelCard.tsx`

### Change 1 — Remove completion badge (lines 143-156)
Delete the Tooltip+badge block showing the percentage in the top-right corner. Also update the remove button positioning from `right-14` to `right-2` since the badge is gone.

### Change 2 — Add completion text to footer (line 250)
After the certificates count span, add `· {percentage}% profile complete` in matching muted text style.

