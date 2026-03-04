

## Auto-assign Category from OCR Extraction

### Problem
Line 207 in `AddCertificateDialog.tsx` hardcodes `categoryId: null` when creating a certificate entry from OCR results, even though the extraction returns `matchedCategoryId`. The category dropdown exists but is never pre-filled.

### Fix

**File**: `src/components/AddCertificateDialog.tsx`

**Single change** — line 207:
```tsx
// Before
categoryId: null, // Personnel choose themselves

// After
categoryId: extractedData.matchedCategoryId || null,
```

This pre-selects the category dropdown with the AI-matched category. The user can accept it or change it via the existing dropdown. No schema, RLS, or backend changes.

