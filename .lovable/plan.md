

# Fix: Certificate Row Click Opens Document Viewer

**Risk: GREEN** -- purely UI click-handler change, no database/schema/RLS modifications.

## Problem
Clicking a certificate row in the Expiry Details list navigates to the personnel page (`handleRowClick`). The document viewer only opens via the tiny `FileText` icon button. Users expect clicking the row itself to open the document.

## Solution
Modify `handleRowClick` in `src/components/timeline/ExpiryDetailsList.tsx` so that:
- If the event has a `documentUrl`, open the document viewer (reusing the existing `handleDocPreview` logic)
- If no `documentUrl`, fall back to navigating to the personnel page as before

### Changes in `src/components/timeline/ExpiryDetailsList.tsx`

Update `handleRowClick` (lines 96-104) to check for `documentUrl` first:

```typescript
const handleRowClick = async (event: TimelineEvent) => {
  if (event.documentUrl) {
    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(event.documentUrl);
    setDocPreview({ name: event.certificateName, loading: true, data: null, error: null, isImage, imageUrl: null });

    try {
      const signedUrl = await getSignedUrl('certificate-documents', event.documentUrl);
      if (!signedUrl) throw new Error('Failed to get URL');

      if (isImage) {
        setDocPreview(prev => prev ? { ...prev, loading: false, imageUrl: signedUrl } : null);
      } else {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error('Failed to fetch');
        const arrayBuffer = await response.arrayBuffer();
        setDocPreview(prev => prev ? { ...prev, loading: false, data: arrayBuffer.slice(0) } : null);
      }
    } catch {
      setDocPreview(prev => prev ? { ...prev, loading: false, error: 'Failed to load document' } : null);
    }
  } else {
    const params = new URLSearchParams();
    params.set('tab', 'personnel');
    params.set('personnelId', event.personnelId);
    if (personnelFilter !== 'all') {
      params.set('category', personnelFilter);
    }
    navigate(`/admin?${params.toString()}`);
  }
};
```

This reuses the same loading/preview logic already in `handleDocPreview`, so behavior is identical to clicking the icon button -- just triggered by clicking anywhere on the row.

## Files Modified

| File | Change |
|------|--------|
| `src/components/timeline/ExpiryDetailsList.tsx` | Update `handleRowClick` to open document viewer when `documentUrl` exists, navigate otherwise |

