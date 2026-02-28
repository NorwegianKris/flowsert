

## AI Suggestions Review Panel: List + Detail

**Risk: GREEN** — Pure UI refactor. No schema changes, no edge function changes, no access control changes.

### Current State

The middle column currently shows action buttons (AI Suggest, arrow, Assign Type, Create & Group). After AI suggestions load, inline suggestion strips appear below each certificate row in the left pane. This plan replaces those inline strips with a two-level review experience in the middle column.

### Architecture

The 3-column grid layout stays identical (`grid-cols-[1fr,auto,1fr]`). The middle column becomes wider when suggestions are loaded to accommodate the review panel. The left pane rows lose their inline suggestion strips entirely — they remain as the selection/browsing list.

### Data Requirements

The detail view needs `personnel_role` (e.g. "Dive Supervisor") which is not currently in `UnmappedCertificate`. Two options:
1. Add `personnel_role` to the `useUnmappedCertificates` hook query and interface
2. Fetch it on-demand when opening detail view

Option 1 is cleaner since the AI suggestion query already fetches role. Minor hook change.

### Implementation Steps

**1. Extend `UnmappedCertificate` interface and hook** (`src/hooks/useUnmappedCertificates.ts`)
- Add `personnel_role: string | null` to interface
- Add `personnel.role` to the select query (alongside `personnel.name, personnel.business_id`)
- Map it in the transform

**2. Refactor middle column in `TypeMergingPane.tsx`**

Add new state:
- `reviewView: "list" | "detail"` — which level is shown
- `detailCertId: string | null` — which suggestion is expanded in detail
- `overrideOpen: boolean` — whether override dropdown is expanded in detail view

When `hasSuggestions` is true, the middle column switches from action buttons to the review panel:

**Level 1 — Suggestions List:**
- Scrollable list of all non-skipped suggestions
- Each row: personnel name (bold) + confidence pill, title_raw, arrow + suggested type name, category badge + expiry
- Click row → set `reviewView = "detail"`, `detailCertId = cert.id`
- Arrow icon on right edge of each row as click affordance
- LOW confidence rows get `text-muted-foreground` treatment
- Bulk action bar above the list (existing bar, moved into this column)

**Level 2 — Detail View:**
- Back button + "N of M" counter at top
- Document preview: PDF iframe or image thumbnail, with "Open full" button
- Personnel name + role
- Certificate title + category + expiry
- AI suggestion card: suggested type name, category, confidence bar, reasoning in italic
- Override dropdown: searchable list of canonical types grouped by category (reuses existing `filteredMerged` data)
- Accept + Skip buttons at bottom
- Accept → calls existing `handleAcceptSuggestion` or `handleCreateAndAssignSuggestion`, returns to list
- Skip → calls existing `handleSkipSuggestion`, returns to list
- For LOW confidence: hide Accept button, show Skip only
- For NEW type suggestions: show "Create & Assign" instead of "Accept"

**3. Remove inline suggestion strips from left pane rows**

Lines 990-1054 (the suggestion strip rendering inside each cert row) get removed entirely. The left pane becomes a clean selection list regardless of whether suggestions exist.

**4. Transitions**

- List→detail: CSS transition `translate-x` from right, 200ms ease-out
- Detail→list: reverse direction
- Accepted rows: existing fade-out logic stays
- `@media (prefers-reduced-motion: reduce)` disables transitions

**5. Review complete state**

When all suggestions are actioned (accepted or skipped), show:
- "Review complete" heading
- "X accepted, X skipped" summary (track counts in state)
- "Run AI Suggest again" button that calls `handleAISuggest`

**6. Middle column width**

When suggestions are active, change grid from `grid-cols-[1fr,auto,1fr]` to `grid-cols-[1fr,minmax(320px,380px),1fr]` so the review panel has enough room. When no suggestions, revert to `auto`.

**7. Document preview in detail view**

Reuse the existing `handleViewDocument` blob download pattern but render inline instead of in a dialog:
- PDF: show first page via `<iframe src={blobUrl}#page=1>` with `pointer-events-none`, fixed height ~200px
- Image: `<img>` with `object-fit: contain`, max-height 200px
- Loading: pulse skeleton
- Error: grey placeholder text
- "Open full" button opens the existing document dialog

### Files Changed

- `src/hooks/useUnmappedCertificates.ts` — add `personnel_role` field
- `src/components/TypeMergingPane.tsx` — refactor middle column, remove inline strips, add list/detail views

### Existing Functionality Preserved

- Manual selection + Assign Type + Create & Group flow (available when no suggestions are active, or via clearing suggestions)
- All AI accept/skip/create-and-assign handlers unchanged
- Bulk accept logic unchanged
- Document viewer dialog unchanged
- Left pane search/filter/sort unchanged
- Right pane canonical types unchanged

