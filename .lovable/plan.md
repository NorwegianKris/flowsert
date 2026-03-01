

## Add Detail Lists to Re-scan Summary

**Change**: Single file edit — `src/components/RescanCertificatesTool.tsx`

### What to add

1. **New interface** `RescanDetailItem` to track per-certificate results: `{ certId, personnelName, oldTitle, newTitle, matchedTypeName? }`

2. **New state** arrays: `matchedDetails` and `cleanedDetails` (both `RescanDetailItem[]`), reset when processing starts.

3. **During processing loop**: After each successful update, push the detail item into the appropriate array. Need to also fetch personnel name — add `personnel:personnel!inner(name)` to the initial certificates query (join personnel table to get the name alongside each cert).

4. **In the summary section**: Replace the static `<span>` lines for matched/cleaned with `Collapsible` wrappers:
   - Clicking "4 auto-matched to types" expands a list showing each row as: `Personnel Name: "old title" → "new title" (matched to: Type Name)`
   - Clicking "8 cleaned (need manual review)" expands a list showing: `Personnel Name: "old title" → "new title"`
   - Each row uses `→` arrow and muted styling for the old title, regular for the new title.

### Technical details

- The certificates query already selects `personnel_id`. Change the query to join personnel: `.select('id, name, title_raw, ..., personnel_id, personnel!inner(name)')` — this gives us `cert.personnel.name`.
- Store detail items in `useRef` arrays (alongside the stats ref pattern) to avoid re-renders during processing, then copy to state when done.
- No database changes, no new files.

### Files changed

| File | Action |
|---|---|
| `src/components/RescanCertificatesTool.tsx` | MODIFY — add detail tracking + expandable lists |

Risk: 🟢 UI-only, no data model or access control changes.

