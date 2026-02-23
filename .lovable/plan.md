

# Upgrade Document Viewer in Expiry Timeline to Match Project Certificate Status Viewer

**Risk: GREEN** -- purely UI component changes, no database/schema/RLS modifications.

## Problem
The document viewer in both `ExpiryDetailsList` and `TimelineChart` (the expiry timeline) uses a minimal dialog that only shows the certificate name and the document. The `ProjectCertificateStatus` component has a much richer viewer that shows:
- Certificate holder name, role, and avatar at the top
- Blob-based downloads (ad-blocker resistant)
- Image rotation and zoom controls
- Download button
- Full certificate details grid (dates, issuer, place, category, status)
- A placeholder when no document is uploaded

## Solution

### 1. Extend the `TimelineEvent` type to carry more personnel info

Add optional `personnelAvatarUrl` and `personnelRole` fields to the `TimelineEvent` interface in `src/components/timeline/types.ts`, and populate them where events are created.

### 2. Populate new fields where timeline events are built

In `src/components/ExpiryTimeline.tsx` (or wherever `TimelineEvent` objects are constructed from personnel data), pass `personnelAvatarUrl` and `personnelRole` into each event.

### 3. Replace the basic dialog in both components with the rich viewer

Update the document preview dialogs in both `ExpiryDetailsList.tsx` and `TimelineChart.tsx` to match the `ProjectCertificateStatus` pattern:

**State changes:**
- Replace `docPreview` state with a richer `selectedEvent` state holding the full `TimelineEvent`
- Add `blobUrl`, `pdfData`, `loadingUrl`, `imgRotation`, `imgZoom` states
- Use `supabase.storage.from().download()` (blob approach) instead of signed URL + fetch

**Dialog content:**
- Certificate holder section at the top (avatar, name, role with "Certificate Holder" label)
- Document preview with image rotation/zoom controls (matching `ProjectCertificateStatus`)
- Download button
- Certificate details grid (date of issue, expiry date, place of issue, category, issuing authority, status)
- Certificate placeholder when no document is attached
- Certificate ID at the bottom

### 4. Update click handlers

Both `handleRowClick` (ExpiryDetailsList) and `handleEventClick` (TimelineChart) will simply set the `selectedEvent` state. The blob download happens via a `useEffect` watching the selected event, matching the `ProjectCertificateStatus` pattern.

## Files Modified

| File | Change |
|------|--------|
| `src/components/timeline/types.ts` | Add `personnelAvatarUrl?` and `personnelRole?` to `TimelineEvent` |
| `src/components/ExpiryTimeline.tsx` | Pass `avatarUrl` and `role` when constructing `TimelineEvent` objects |
| `src/components/timeline/ExpiryDetailsList.tsx` | Replace basic dialog with rich certificate viewer matching `ProjectCertificateStatus` pattern |
| `src/components/timeline/TimelineChart.tsx` | Replace basic dialog with rich certificate viewer matching `ProjectCertificateStatus` pattern |
