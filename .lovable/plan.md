

## Individual Certificate Re-scan with Inline Feedback

**File:** `src/components/CertificateTable.tsx`

### Overview

Add a per-row re-scan button (RefreshCw icon) in the Document column that triggers OCR extraction on the certificate's document, then compares the new title against the existing type assignment using Levenshtein similarity to determine one of three outcomes (verified, updated, or re-classify).

### Changes

**1. New imports**
- Add `RefreshCw`, `CheckCircle`, `AlertTriangle`, `AlertCircle` from lucide-react
- Add `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from UI
- Add `toast` from sonner
- Add `useQueryClient` from react-query
- Add `fileToBase64Image` from `@/lib/pdfUtils`
- Add `extractStoragePath` from `@/lib/storageUtils`
- Add `stringSimilarity` from `@/lib/stringUtils`
- Add `useAuth` from `@/contexts/AuthContext`

**2. Row-level state**
- Add `useState<Record<string, 'scanning' | 'success' | 'error' | 'reclassify'>>` for per-row scan status (keyed by cert.id)
- Timeout refs for clearing success/error icons after 2 seconds

**3. `handleRescan(cert)` async function**
- Guard: if no `documentUrl`, show error toast, return
- Set row state to `'scanning'`
- Download document from storage using `supabase.storage.from('certificate-documents').download(path)`
- Convert blob to File, call `fileToBase64Image`
- Call `supabase.functions.invoke('extract-certificate-data', { body: { imageBase64, mimeType, businessId } })`
- Extract `certificateName` from response
- Save rollback data: merge `rescan_individual_${timestamp}` key into existing `rescan_previous_data` JSONB
- Compare new `certificateName` against `cert.name` (the type name / titleRaw) using `stringSimilarity`:
  - **≥ 0.85**: Outcome A — no DB changes to type/category, set row state `'success'`, toast "Document verified — title confirmed"
  - **0.5–0.84**: Outcome B — update `title_raw` only, toast "Title updated to [new]"
  - **< 0.5**: Outcome C — update `title_raw`, set `certificate_type_id = null`, `category_id = null`, set row state `'reclassify'`, toast warning
- Invalidate query keys `["certificates"]`, `["unmapped-certificates"]`, `["needs-review-count"]`
- On error: set row state `'error'`, toast error, no data modification

**4. Document column UI (lines 261-274)**
- When `cert.documentUrl` exists, add RefreshCw icon before the file icon:
  - Default: `opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-pointer`
  - Scanning: `animate-spin opacity-100`
  - Success: swap to `CheckCircle` green for 2s
  - Error: swap to `AlertCircle` red for 2s
  - Uses `e.stopPropagation()` and tooltip "Re-scan with AI"

**5. Certificate Type column (lines 207-216)**
- When row state is `'reclassify'`: replace normal badge with amber "Re-classify" badge (`bg-amber-100 text-amber-800 border border-amber-300` + AlertTriangle icon)

**6. Row styling (line 202-204)**
- When scanning: add `bg-primary/5` to the row className

**7. `extractStoragePath` usage**
- Use the same pattern as RescanCertificatesTool: extract relative path from documentUrl, download, convert to File, then `fileToBase64Image`

### No schema changes, no new files, no edge function changes.

Risk assessment: Q5 (purely UI + client-side logic calling existing edge function) — **anchor optional**.

