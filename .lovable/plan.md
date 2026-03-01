

## Move AI Suggest to Dialog Overlay

**Problem**: The AI Suggest feature runs inline in the narrow center column of the triage pane, with no room for progress bars, result lists, or before/after visibility. The user wants a full dialog experience matching the Re-scan tool's UX.

**Risk**: 🟢 UI-only change — no data model, no backend, no access control affected.

### Approach

Extract the AI suggestion flow into a new `AISuggestDialog` component. The button stays in the center column but now opens a dialog.

### 1. New Component: `src/components/AISuggestDialog.tsx`

A `Dialog` containing the full AI Suggest workflow:

**States**: `idle` → `confirming` → `processing` → `results`

- **Confirming**: "This will analyze X unmapped certificates and suggest type assignments. This may take several minutes." + Start button.
- **Processing**: Progress bar ("Analyzing X of Y certificates..."), Stop button. Uses the same `suggest-certificate-types` edge function call (single batch, not per-certificate).
- **Results**: Summary with three expandable `Collapsible` sections:
  - "X suggestions ready" — each row: personnel name, certificate title → suggested type name, confidence badge, Approve/Reject buttons. "Approve All" batch button at the top.
  - "X no match found" — each row: personnel name, certificate title. Informational only.
  - "X failed" — error count.

**Props**: Receives `open`, `onOpenChange`, `businessId`, `unmappedCerts`, `mergedTypes`, `categories`, `leftSearch`, `leftCategoryFilter`. Emits callbacks for when suggestions are accepted (to invalidate queries).

**Key reuse**: Same `suggest-certificate-types` edge function call logic currently in `handleAISuggest`. Same `handleAcceptSuggestion` / alias creation logic. Same `handleBulkAccept` pattern.

### 2. Modify: `src/components/TypeMergingPane.tsx`

- Remove the inline AI suggestion state (`aiSuggestions`, `aiLoading`, `aiCertCount`, `skippedCerts`, `fadingCerts`, `aiPartialInfo`, review panel state, detail view state, etc.)
- Remove `handleAISuggest`, `handleAcceptSuggestion`, `handleCreateAndAssignSuggestion`, `handleBulkAccept`, `handleSkipSuggestion`, `handleClearSuggestions`, `renderSuggestionsList`, `renderDetailView`, `openDetail`, `backToList`
- Remove the center column's conditional rendering for suggestions vs. loading states
- Replace with: AI Suggest button opens `<AISuggestDialog />`
- The center column simplifies to always showing the manual assign controls (Assign Type, Create & Group)
- Keep all manual grouping, document viewer, dismiss logic unchanged

### 3. Dialog UX Details

- Personnel name comes from the existing unmapped certs query (already joins `personnel.name`)
- Certificate title from `title_raw`
- Suggested type from matching `suggested_type_id` against `mergedTypes` list
- "No match" = suggestions where `suggested_type_id` is null and `suggested_new_type_name` is null
- After approving, the row fades or gets a checkmark badge
- On dialog close, invalidate unmapped-certificates query to refresh the left column

### Files Changed

| File | Action |
|---|---|
| `src/components/AISuggestDialog.tsx` | CREATE |
| `src/components/TypeMergingPane.tsx` | MODIFY — remove ~600 lines of inline AI state/handlers/rendering, add dialog import + open state |

