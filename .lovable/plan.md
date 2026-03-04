

## Fix: Consistent Certificate Category Assignment

### Root Cause
The `extract-certificate-data` edge function omits the `temperature` parameter in its AI gateway call (line 226). This means the model uses a non-deterministic default, causing the same document to be categorized differently across uploads. The `suggest-certificate-types` function already sets `temperature: 0` — the extraction function does not.

### Changes

**File: `supabase/functions/extract-certificate-data/index.ts`**

1. **Add `temperature: 0`** to the AI gateway request body (around line 226–313) to ensure deterministic outputs.

2. **Improve the category matching prompt** (lines 206–209) to give the AI explicit priority rules for cross-domain certificates. Current prompt just says "if it matches one of these categories, include it" — no guidance for certificates spanning multiple categories. Add:
   - A rule: "When a certificate spans multiple categories (e.g., CSWIP 3.2U is both NDT/Inspection and Diving), choose the category that best describes the certificate's primary function — the skill being certified, not the work environment."
   - Examples of known cross-domain certificates and their correct primary categories.

### Risk Assessment
- Q1 (SQL/migration): No
- Q2 (edge functions): Yes → 🔴 anchor required — this edits the OCR extraction edge function
- Q5 (UI only): No

No database or schema changes required. Single edge function edit.

