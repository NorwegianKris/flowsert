

## Plan: "Teach the System" — Taxonomy Seeding Tool

### New file: `src/components/TaxonomySeedingTool.tsx`

A self-contained component that renders inside the Certificates tab as a collapsible card above the Categories/Types/Issuers sub-tabs.

**Structure:**
- Collapsible wrapper (collapsed by default) with a Sparkles icon and "Teach the System" heading
- Drag-and-drop upload zone (same visual pattern as UploadZone: dashed border, sparkle icon, accepts PDF/JPEG/PNG/WebP/GIF, max 20 files)
- Processing list showing each file's status with spinners, green "Already known" badges, amber "New type suggested" badges, or red error badges
- Summary section after processing: stats line + approval UI for each suggestion (category dropdown, Approve/Dismiss buttons, Approve All)

**Processing flow per file:**
1. Convert via `fileToBase64Image()` from `pdfUtils.ts`
2. Call `supabase.functions.invoke('extract-certificate-data')` with base64 + existing categories/issuers (same as SmartCertificateUpload)
3. Take `suggestedTypeName` from result
4. Normalize via `normalizeCertificateTitle()` and query `certificate_aliases` for exact match
5. If no alias match, run `findSimilarMatches()` from `stringUtils.ts` with **threshold 0.85** against existing `certificate_types` names
6. Match found → "Already known"; no match → add to suggestions list
7. 500ms delay between API calls (same throttling pattern as SmartCertificateUpload)

**Approve action:**
- Insert new `certificate_types` row via `useCreateCertificateType` hook
- Create alias via `useCreateAlias` hook (createdBy: 'admin', confidence: 100)
- No `certificates` table writes

**Props:** `existingCategories: { id: string; name: string }[]` — passed from CategoriesSection

**Hooks consumed (not modified):**
- `useCreateCertificateType` from `useCertificateTypes.ts`
- `useCreateAlias` from `useCertificateAliases.ts`
- `useCertificateTypes` from `useCertificateTypes.ts` (for fuzzy matching against existing types)
- `useCertificateAliases` (for alias lookup)
- `useAuth` for businessId

### Edit: `src/components/CategoriesSection.tsx`

Inside the `certificates` TabsContent (line 88), insert the `TaxonomySeedingTool` component **above** the inner `<Tabs>` (line 89). Wrapped in its own Collapsible, collapsed by default.

- Import `TaxonomySeedingTool`
- Render before the inner Tabs: `<TaxonomySeedingTool existingCategories={categories} />` — categories fetched inline via the same pattern used in `CertificateCategoriesInner`
- The component fetches its own categories internally via `useCertificateCategories` hook, so no prop drilling needed — simplify to no props

### Files touched
- **New:** `src/components/TaxonomySeedingTool.tsx`
- **Edit:** `src/components/CategoriesSection.tsx` (add import + render, ~3 lines)

### What stays untouched
- `SmartCertificateUpload`, `AddCertificateDialog` — no changes
- `extract-certificate-data` edge function — reused as-is
- `certificates` table — no inserts, no schema changes
- All existing hooks — consumed only

