
# Plan: Fix Document Viewing in Inputted Types List

## Problem

When clicking "View" on a certificate document in the Inputted Types list (e.g., `1770122349798.jpeg` for "surface oriented diver"), users receive an error. This happens because:

1. The `certificate-documents` storage bucket is **private** (access requires authentication)
2. The current code uses a direct `<a href={cert.document_url}>` link
3. Direct links to private buckets fail without proper authentication headers
4. Other parts of the app (like CertificateTable) correctly use the Supabase SDK to download files securely

## Solution

Update the TypeMergingPane component to:
1. Replace the direct link with a button that triggers secure document viewing
2. Open a dialog that downloads the file using `supabase.storage.download()`
3. Display images and PDFs using blob URLs and the existing PdfViewer component
4. Match the pattern already used in CertificateTable.tsx

## Technical Changes

### File: `src/components/TypeMergingPane.tsx`

**Add imports:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PdfViewer } from "./PdfViewer";
```

**Add state for document viewing:**
```typescript
const [documentViewOpen, setDocumentViewOpen] = useState(false);
const [viewingDocument, setViewingDocument] = useState<{ url: string | null; fileName: string } | null>(null);
const [documentBlobUrl, setDocumentBlobUrl] = useState<string | null>(null);
const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
const [loadingDocument, setLoadingDocument] = useState(false);
```

**Add document viewing function:**
```typescript
const handleViewDocument = async (documentUrl: string, fileName: string) => {
  setViewingDocument({ url: documentUrl, fileName });
  setDocumentViewOpen(true);
  setLoadingDocument(true);
  setDocumentBlobUrl(null);
  setPdfData(null);

  // Extract file path from URL
  let path = documentUrl;
  if (documentUrl.includes('certificate-documents/')) {
    const match = documentUrl.match(/certificate-documents\/(.+)/);
    if (match) path = match[1];
  }

  // Download file via Supabase SDK (bypasses CORS/ad blocker issues)
  const { data, error } = await supabase.storage
    .from('certificate-documents')
    .download(path);

  if (error) {
    console.error('Error downloading document:', error);
    setLoadingDocument(false);
    return;
  }

  if (data) {
    setDocumentBlobUrl(URL.createObjectURL(data));
    
    // For PDFs, also prepare ArrayBuffer for PdfViewer
    if (/\.pdf$/i.test(documentUrl)) {
      const buffer = await data.arrayBuffer();
      setPdfData(buffer);
    }
  }
  setLoadingDocument(false);
};
```

**Replace the direct link with a button:**

Before (lines 557-568):
```tsx
{cert.document_url ? (
  <a
    href={cert.document_url}
    target="_blank"
    rel="noopener noreferrer"
    className="truncate max-w-[140px] text-primary hover:underline flex items-center gap-1"
    onClick={(e) => e.stopPropagation()}
  >
    {cert.file_name}
    <ExternalLink className="h-3 w-3 shrink-0" />
  </a>
) : ...
```

After:
```tsx
{cert.document_url ? (
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleViewDocument(cert.document_url!, cert.file_name || 'Document');
    }}
    className="truncate max-w-[140px] text-primary hover:underline flex items-center gap-1 text-left"
  >
    {cert.file_name}
    <ExternalLink className="h-3 w-3 shrink-0" />
  </button>
) : ...
```

**Add document viewer dialog (at end of component, before closing tag):**
```tsx
{/* Document Viewer Dialog */}
<Dialog 
  open={documentViewOpen} 
  onOpenChange={(open) => {
    if (!open) {
      if (documentBlobUrl) URL.revokeObjectURL(documentBlobUrl);
      setDocumentBlobUrl(null);
      setPdfData(null);
      setViewingDocument(null);
    }
    setDocumentViewOpen(open);
  }}
>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        {viewingDocument?.fileName || 'Document'}
      </DialogTitle>
    </DialogHeader>
    
    <div className="mt-4">
      {loadingDocument ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading document...</span>
        </div>
      ) : pdfData && viewingDocument?.url && /\.pdf$/i.test(viewingDocument.url) ? (
        <PdfViewer pdfData={pdfData} />
      ) : documentBlobUrl && viewingDocument?.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(viewingDocument.url) ? (
        <img
          src={documentBlobUrl}
          alt={viewingDocument.fileName}
          className="max-h-[70vh] w-auto mx-auto object-contain rounded"
        />
      ) : documentBlobUrl ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
          <Button asChild>
            <a href={documentBlobUrl} download={viewingDocument?.fileName}>
              Download File
            </a>
          </Button>
        </div>
      ) : (
        <div className="text-center py-8 text-destructive">
          Failed to load document. Please try again.
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/TypeMergingPane.tsx` | Add document viewer dialog, replace direct link with secure download |

## How It Works

```text
Before:
  Click "View" → Direct link to private URL → 403 Error

After:
  Click "View" → Open dialog → supabase.storage.download() → Blob URL → Display in dialog
```

## Benefits

1. **Secure**: Uses authenticated Supabase SDK for file access
2. **Consistent**: Matches the pattern used in CertificateTable
3. **Reliable**: Works with private storage buckets
4. **User-friendly**: Inline preview in a dialog (images and PDFs)
5. **Fallback**: Download option for unsupported file types
