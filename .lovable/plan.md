

## Re-scan Existing Certificates Tool

**Risk Classification: 🔴 RED** — modifies existing certificate data, adds a schema column.

### 1. Database Migration

Add a nullable `rescan_previous_data` JSONB column to the `certificates` table:

```sql
ALTER TABLE public.certificates
ADD COLUMN rescan_previous_data jsonb DEFAULT NULL;
```

Classification: GREEN (additive, nullable column, no data change).

### 2. New Component: `RescanCertificatesTool.tsx`

Create `src/components/RescanCertificatesTool.tsx`, placed in the `CertificateTypesManager` near the "Group Types" / "Manage Types" tabs area.

**Flow:**
1. Admin clicks "Re-scan unmapped certificates"
2. Confirmation `AlertDialog`: "This will re-scan 412 certificates through AI. This may take several minutes. Continue?"
3. On confirm, query all certificates where `certificate_type_id IS NULL AND document_url IS NOT NULL`
4. For each certificate sequentially (500ms delay):
   - Download the document from `certificate-documents` bucket using `supabase.storage.from('certificate-documents').download(path)` (extract path from full URL)
   - Convert blob to File, then call `fileToBase64Image()` from `@/lib/pdfUtils`
   - Invoke `extract-certificate-data` edge function (reuse existing)
   - Run `suggestedTypeName` through alias lookup (`certificate_aliases` table, normalized match) then fuzzy matching (`findSimilarMatches` at 0.85 threshold) against existing certificate types — same logic as `TaxonomySeedingTool`
   - Before updating, save old values into `rescan_previous_data` JSONB: `{ title_raw, title_normalized, category_id, issuing_authority, date_of_issue, expiry_date, place_of_issue, rescanned_at }`
   - Update certificate with clean OCR data: `title_raw`, `title_normalized` (via `normalizeCertificateTitle`), `issuing_authority`, `date_of_issue`, `expiry_date`, `place_of_issue`
   - If type match found: also set `certificate_type_id`, `category_id` (from matched type), `needs_review = false`
   - If no match: leave `certificate_type_id` NULL, title is now clean

**UI during processing:**
- Progress bar (`Progress` component) showing "Processing X of Y certificates..."
- "Stop" button that sets a ref flag to abort the loop
- Disable the "Re-scan" button while processing

**Summary on completion:**
- "X auto-matched to types. Y updated with clean titles (need manual review). Z failed (no document or OCR error)."

### 3. Integration Point

In `CertificateTypesManager.tsx`, add the `RescanCertificatesTool` component above the tabs (near the unmapped certificates section). It renders as a collapsible section similar to `TaxonomySeedingTool`.

### 4. Key Reuse

- `fileToBase64Image` from `@/lib/pdfUtils` — handles PDF→image and image→base64
- `normalizeCertificateTitle` from `@/lib/certificateNormalization`
- `findSimilarMatches` from `@/lib/stringUtils`
- `useCertificateTypes` hook for existing types list
- `useCertificateCategories` hook for categories
- `extract-certificate-data` edge function (no changes)
- Storage path extraction pattern from `storageUtils.ts`

### 5. Files Changed

| File | Action |
|---|---|
| `certificates` table | ADD `rescan_previous_data jsonb` column (migration) |
| `src/components/RescanCertificatesTool.tsx` | CREATE — new component |
| `src/components/CertificateTypesManager.tsx` | MODIFY — import and render `RescanCertificatesTool` |

### 6. What Is NOT Changed

- Upload flow, `SmartCertificateUpload`
- `TaxonomySeedingTool`
- `CertificateReviewQueue`
- `extract-certificate-data` edge function
- No new certificate types created — match only

