

## Fix: Pre-fill Free-Text Input When No Certificate Type Match Found

### Problem
When OCR extracts a `suggestedTypeName` (e.g., "CSWIP 3.2U Diver Inspector") but no matching type exists in the system, the selector only pre-fills the dropdown search box. Since no types match, the user sees an empty dropdown with no actionable suggestion. The AI-extracted name is effectively lost.

### Root Cause
In `CertificateTypeSelector.tsx` (lines 140-164), when the alias lookup and fuzzy match both fail, the code calls `setSearchValue(ocrHint.extractedName)` — which populates the dropdown search. But if no types match that search, the user must manually click "Can't find your certificate type?", then re-type the name.

### Changes

**File: `src/components/CertificateTypeSelector.tsx`**

In the OCR auto-match effect (around line 140-165), after both alias lookup and fuzzy match fail to find a result:

1. Instead of only setting `setSearchValue`, also activate the free-text fallback (`setShowFreeTextInput(true)`) and pre-fill it via `onFreeTextChange(ocrHint.extractedName)`.
2. This way the user immediately sees the AI-suggested canonical name in the free-text field, ready to save — which will create a new certificate type and alias for future uploads.
3. Only do this when `showFallbackInput` is true (the upload flow path) and no fuzzy match scored above threshold.

### Risk Assessment
- Q1 (SQL/migration): No
- Q2 (edge functions): No
- Q5 (UI only): Yes — 🟢 anchor optional

Pure UI behavior change in the certificate type selector. No backend changes.

