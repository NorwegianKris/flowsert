

## Fix: AI Search Within Current Pool + Clear Search Button

**Risk: 🟢 GREEN** — UI logic only, no backend or data changes.

---

### Current Behavior (Broken)

When the AI filter is active, the filtering logic **skips all toggle checks** (lines 228-230 of AdminDashboard). This means AI results can include personnel outside the currently visible pool (e.g., freelancers when only employees are toggled on). Also, the only "Clear Search" button is hidden inside the collapsible AI panel.

### Desired Behavior

1. Admin sets toggles (Employees / Freelancers / etc.) to define the visible personnel pool.
2. AI search runs **within** that pool — the toggles stay active and are not bypassed.
3. AI results are **highlighted** (purple ring) but the pool itself stays toggle-filtered.
4. A visible **"Clear Search"** button appears below the filters (outside the AI panel) when a search is active.
5. Clicking "Clear Search" removes the highlights and AI filtering, reverting to the exact toggle-based view that was showing before.

---

### Changes

**File: `src/pages/AdminDashboard.tsx`**

1. **Fix filtering logic** — Remove the early-return AI bypass (lines 227-230). Instead, let the normal toggle/filter logic run first, and then further narrow to AI-matched IDs at the end:
   ```
   // After all normal filters pass...
   if (aiFilteredPersonnelIds !== null && !aiFilteredPersonnelIds.includes(p.id)) {
     return false;
   }
   return true;
   ```

2. **Add a "Clear AI Search" bar** — Render a banner between `PersonnelFilters` and the personnel grid whenever `aiFilteredPersonnelIds !== null`. It shows how many results matched and has a "Clear Search" button that:
   - Sets `aiFilteredPersonnelIds` to `null`
   - Sets `highlightedPersonnelIds` to `[]`
   
   No toggle state snapshot/restore is needed because the toggles are never changed by the AI search anymore.

**File: `src/components/AIPersonnelSuggestions.tsx`**

3. **No toggle state changes needed** — Since the AI filter now works alongside (not replacing) the toggles, the component just sets `aiFilteredPersonnelIds` and `highlightedPersonnelIds` as before. No `onBeforeSearch` callback required.

---

### Summary

| File | Action | What Changes |
|------|--------|-------------|
| `src/pages/AdminDashboard.tsx` | MODIFY | Move AI filter to end of filter chain (no bypass); add visible Clear Search bar below filters |
| `src/components/AIPersonnelSuggestions.tsx` | No change needed | Existing logic is correct once the bypass is removed |

