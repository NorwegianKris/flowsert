
## Prompt Risk Assessment: 🟢 Anchor Optional
This is a UI data-fetching fix. No schema, RLS, or auth changes needed.

---

## Root Cause

The `DataPrivacySection` component on the personnel profile calls `useDataAcknowledgement(personnelId, businessId)` **without** passing the business's required acknowledgement version. The hook defaults to version `'1.0'` (hardcoded fallback), but Kristian Utseth acknowledged version `'1.1'` (which is the current business requirement). So the query filters for version `'1.0'`, finds nothing, and displays "No".

**Database confirms:**
- Business requires version `1.1`
- Kristian acknowledged version `1.1`
- No version `1.0` acknowledgement exists for this user

---

## Fix

**File:** `src/components/PersonnelDetail.tsx` (lines 636-673)

Update the `DataPrivacySection` to fetch the **latest** acknowledgement for the personnel regardless of version. This is the correct behavior for an admin view -- it should show whether and when the user last acknowledged, plus which version.

Instead of using `useDataAcknowledgement` (which is designed for version-gated blocking dialogs), query directly for the most recent acknowledgement record for the given personnel + business combination without version filtering.

Specifically:
- Replace the `useDataAcknowledgement` call with a simple `useEffect` + `useState` that queries `data_processing_acknowledgements` filtered by `personnel_id` and `business_id`, ordered by `acknowledged_at DESC`, limit 1 -- without any version filter
- This ensures the section always shows the latest acknowledgement regardless of version

This keeps the `useDataAcknowledgement` hook unchanged (it's correctly used in `WorkerDashboard.tsx` where version-gating matters), and only fixes the admin-facing display.

---

## Technical Details

- The `DataPrivacySection` component is a local function inside `PersonnelDetail.tsx` (line 636)
- Replace `useDataAcknowledgement` with inline state + effect that fetches without version filter
- No other files need changes
- The settings Privacy & Data list uses `useBusinessAcknowledgements` which also fetches without version filtering, which is why it correctly shows the acknowledgement
