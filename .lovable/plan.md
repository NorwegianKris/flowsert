

## FlowSert — Full QA Checklist Results (Section 5: AI Suggest — AISuggestDialog.tsx)

### 5.1 Opens as dialog from triage queue
**Status: PASS**
- `AISuggestDialog` renders as a `<Dialog>` component (line 633), opened via `open` prop from parent `TypeMergingPane`

### 5.2 Split into two sections: "Matched to existing types" and "New types suggested"
**Status: PASS**
- `existingTypeRows` = suggestions where `suggested_type_id` is set (line 163)
- `newTypeRows` = suggestions where `suggested_new_type_name` is set but no `suggested_type_id` (line 167)
- Each rendered in its own `Collapsible` section with distinct styling (lines 720-822 and 826-1006)
- "Existing" section uses neutral muted background; "New types" uses amber warning styling with border

### 5.3 "Matched to existing types" section has "Approve All" button
**Status: PASS**
- "Approve All" button rendered at line 741-754 when `pendingExisting.length > 0`
- Shows count: `Approve All ({pendingExisting.length})`

### 5.4 "Approve All" assigns all matched certificates correctly (both certificate_type_id and category_id)
**Status: PASS**
- `handleApproveAll()` (line 527) groups by type, then batch-updates via `.update({ certificate_type_id: typeId, category_id: matchedType?.category_id || null, needs_review: false })`
- `matchedType` is resolved from `mergedTypes` (line 549) — category_id correctly inherited

### 5.5 "New types suggested" section shows individual review per suggestion
**Status: PASS**
- Each new type row renders its own approve/reject buttons and override controls (lines 914-998)
- Header text: "Creates new types — review individually" (line 835)

### 5.6 Each new type suggestion has: category dropdown, assign-to-existing-type option
**Status: PASS**
- Two-column grid (line 917): left = category `<Select>` dropdown, right = "Assign to existing type" `<Select>` dropdown
- Category dropdown pre-selects AI-suggested category if it matches an existing one (line 922)
- "Assign to existing type" dropdown shows all active types with category names (lines 965-972)
- `__clear` option allows reverting to "Use new type (default)"

### 5.7 Admin can approve individual new type suggestions
**Status: PASS**
- "Create & Approve" button per row (line 983-987) calls `handleApprove(row)`
- `handleApprove` for new types (line 440-474): creates type via `createTypeMutation`, then updates certificate with both `certificate_type_id` and `category_id`, then creates alias

### 5.8 Admin can reject individual suggestions
**Status: PASS**
- "Reject" button per row (line 988-996) calls `handleReject(row)`
- `handleReject` (line 513-519) sets `rejected: true` on the row — purely client-side, no DB write
- Rejected rows render with `opacity-40` styling

### 5.9 Admin can assign a suggested new type to an existing type instead
**Status: PASS**
- `newTypeExistingOverrides` state tracks overrides per certificate ID (line 156)
- When override is set, `handleApprove` uses `existingOverride` as `typeId` instead of creating a new type (line 477)
- Button label changes from "Create & Approve" to "Approve" when overridden (line 986)

### 5.10 Batch processing works correctly for large sets
**Status: PASS**
- Client-side batching: 25 certificates per edge function call (line 288)
- Server-side: edge function also batches at 25 with 50s time budget
- Progress bar updates per batch (lines 348-350)
- "Approve All" uses 100-item DB batches (line 547)
- Deduplicates aliases by normalized title to avoid redundant DB writes (lines 561-566)

### 5.11 No auto-assignment happens without explicit admin approval
**Status: PASS**
- All suggestions arrive with `approved: false, rejected: false` (lines 396-397, 405-406)
- No code path auto-sets `approved: true` — all approval flows require explicit button clicks
- Results phase only displays suggestions; DB writes happen only on approve actions

### 5.12 After processing, triage queue and dashboard counts update via query invalidation
**Status: PASS**
- `invalidateAll()` (lines 172-179) covers all six relevant query keys:
  - `unmapped-certificates`, `certificates`, `certificate-type-usage`, `certificate-types`, `certificates-needing-review`, `needs-review-count`
- Called on dialog close when phase is "results" (lines 203-204)
- Individual approvals write to DB immediately; full invalidation happens on close

### 5.13 Alias duplicate suppression: approving a type that creates a duplicate alias silently skips
**Status: PASS**
- Both `handleApprove` (lines 471-473) and `handleApproveAll` (lines 574-576) catch alias creation errors
- Error code `23505` (unique violation) is silently swallowed: `if (e.code !== "23505") console.error(...)`
- No error toast shown for duplicates

### 5.14 Dialog closes cleanly after processing
**Status: PASS**
- `handleClose` (line 200): sets `abortRef.current = true`, calls `invalidateAll()` if in results phase, resets all state after 300ms delay
- `resetState` (line 181) clears all 16 state variables back to defaults
- Dialog footer shows "Close" button in results phase (line 1085)

### 5.15 Dialog handles edge case: zero suggestions returned
**Status: PASS**
- If `filtered.length === 0` after query, shows `toast.info("No unmapped certificates to analyse")` and returns to confirming phase (lines 248-253)
- If AI returns suggestions but none match or create new types, all go to `noMatchRows` — the results phase still renders correctly with "No match" section only
- If aborted early with no results, returns to confirming phase (lines 354-358)

---

### Summary

| Check | Result |
|---|---|
| 5.1 Opens as dialog | PASS |
| 5.2 Split sections | PASS |
| 5.3 "Approve All" button | PASS |
| 5.4 Approve All sets type + category | PASS |
| 5.5 Individual review for new types | PASS |
| 5.6 Category dropdown + assign-to-existing | PASS |
| 5.7 Approve individual new type | PASS |
| 5.8 Reject individual | PASS |
| 5.9 Override new → existing type | PASS |
| 5.10 Batch processing | PASS |
| 5.11 No auto-assignment | PASS |
| 5.12 Query invalidation | PASS |
| 5.13 Alias duplicate suppression | PASS |
| 5.14 Clean dialog close | PASS |
| 5.15 Zero suggestions edge case | PASS |

**All 15 checks pass. No issues found in Section 5.**

