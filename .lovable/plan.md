

## Two Fixes: Alias Lookup + Geocoding Precision

**Risk: 🔴 anchor required** — changes data access pattern (alias lookup from Supabase in component).

### Fix 1: Replace fuzzy matching with alias lookup in CertificateTypeSelector

**File: `src/components/CertificateTypeSelector.tsx`**

1. **Add `businessId` prop** to `CertificateTypeSelectorProps` interface (line 28): `businessId?: string`
2. **Add import** for `supabase` client and `normalizeCertificateTitle` from certificateNormalization
3. **Remove** `stringSimilarity` import (line 21) — no longer needed
4. **Replace OCR useEffect** (lines 96-141): Convert to async alias lookup:
   - When `ocrHint` provided and `confidence >= 60` and `businessId` is set:
     - Normalize using `normalizeCertificateTitle(ocrHint.extractedName)`
     - Query `certificate_aliases` table: `.eq('business_id', businessId).eq('alias_normalized', normalized).maybeSingle()`
     - If alias found → find matching type in `types` array → auto-select via `onChange(matchedType.id, matchedType.name)`, set `ocrAutoSelected`
     - If no alias found → **fall back to existing fuzzy logic** (keep stringSimilarity as secondary fallback, don't remove import)
   - If `confidence < 60` → show low confidence hint (existing behavior)

**File: `src/components/AddCertificateDialog.tsx`**

5. **Pass `businessId` prop** to `CertificateTypeSelector` at line 746:
   ```tsx
   <CertificateTypeSelector
     businessId={businessId}
     ...existing props
   />
   ```

### Fix 2: Geocoding precision — city-level only

**File: `src/components/AddCertificateDialog.tsx`**

6. **Update Nominatim fetch** (lines 233-246):
   - Change URL params: `&addressdetails=1&featuretype=city&limit=3`
   - From results, find best city-level match by checking `address.city` or `address.town`
   - Format output as `"{city/town}, {country}"` instead of raw `display_name`
   - If no city-level match found, keep original plain text

### Files changed
- `src/components/CertificateTypeSelector.tsx` — alias lookup + businessId prop
- `src/components/AddCertificateDialog.tsx` — pass businessId + geocoding fix

