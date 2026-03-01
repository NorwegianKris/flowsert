

## Split AI Suggest Results into Existing vs New Type Sections

**Risk**: 🟢 UI-only — no backend, no data model, no access control changes.

### Current State

All suggestions (existing type matches and new type proposals) are mixed in one "suggestions ready" list. Both have similar-looking buttons, and "Approve All" can accidentally batch-approve new type creation.

### Changes — single file: `src/components/AISuggestDialog.tsx`

#### 1. Split suggestion rows into two lists

After building `matched` array (line ~289), partition into:
- `existingTypeRows` — where `isNewType === false` (has `suggested_type_id`)
- `newTypeRows` — where `isNewType === true` (has `suggested_new_type_name`)

Sort both by confidence: high → medium → low.

Add separate state arrays and collapsible sections for each.

#### 2. "Matched to existing types" section

Same UX as current: Approve / Reject per row, plus "Approve All" batch button. Only this section gets batch approval.

#### 3. "New types suggested" section

Visually distinct:
- Amber/warning background (`bg-amber-50 dark:bg-amber-950/20`)
- `AlertTriangle` icon in the section header
- No "Approve All" button

Each row gets:
- **Category dropdown** — pre-filled with AI's suggested category. Uses a `Select` component populated from the `categories` prop. Admin can change before creating.
- **"Assign to existing type" dropdown** — a `Select` letting the admin pick an existing canonical type instead of creating a new one. When selected, the row switches from "Create & Approve" to just "Approve" (assigns to the chosen existing type).
- **"Create & Approve"** and **"Reject"** buttons (individual only, no batch).

#### 4. State additions

- `newTypeRows` — separate `SuggestionRow[]` state
- `newTypeCategoryOverrides` — `Record<string, string>` mapping cert ID → overridden category ID
- `newTypeExistingOverrides` — `Record<string, string>` mapping cert ID → chosen existing type ID (when admin picks "Assign to existing type" instead)
- `newTypesOpen` — collapsible open state

#### 5. Approve handler updates

When approving a new-type row:
- Check if admin overrode with existing type (`newTypeExistingOverrides`). If so, assign to that type instead of creating.
- Otherwise, create new type using `newTypeCategoryOverrides[certId]` if set, else fall back to AI-suggested category matching.

#### 6. Summary stats grid

Update from 3 columns to show: "Existing matches (X)" | "New types (X)" | "No match (X)" | "Failed (X)" — or keep 3 columns but update labels to reflect the split.

### Files changed

| File | Action |
|---|---|
| `src/components/AISuggestDialog.tsx` | MODIFY |

