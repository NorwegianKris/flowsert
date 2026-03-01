
## Plan: Retarget deep-link scroll to the actual unmapped content container

### What I’ll change

1. **`src/components/CertificateTypesManager.tsx`**
   - Add `data-scroll-target="unmapped-certificates"` to the top container in `CertificateTypesManager` (the wrapper that contains:
     - the **Group Types / Manage Types** toggle, and
     - the merge pane with the **“424 unmapped certificates • 55 canonical types”** line and layout).

2. **`src/pages/AdminDashboard.tsx`**
   - Update the deep-link scroll selector from:
     - `document.querySelector('[data-testid="unmapped-certificates-section"]')`
   - to:
     - `document.querySelector('[data-scroll-target="unmapped-certificates"]')`
   - Keep the existing `setTimeout(300)` and `scrollIntoView({ behavior: 'smooth', block: 'start' })` logic unchanged.

### Why this fixes it

- The current target is inside/around the Types content but not the exact wrapper you want.
- Targeting the `CertificateTypesManager` wrapper aligns the scroll anchor to the section that starts at the **toggle + stats line + unmapped layout**, so the viewport lands lower (past the Categories/Types tab strip) and at the intended content start.

### Scope control

- No visual/design changes.
- No query/count changes.
- No changes to tabs behavior beyond scroll target selection.
- No database/backend/schema changes.

### Files touched

- `src/components/CertificateTypesManager.tsx` (add one attribute)
- `src/pages/AdminDashboard.tsx` (change one selector string)
