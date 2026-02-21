

## Prompt Risk Assessment: 🟢 Anchor Optional
All three fixes are purely UI-level changes -- event handling, image display, and icon sizing. No database, auth, or access control changes.

---

## Bug 1: Certificate deletion checkbox not clickable

**Root Cause:** In `RemoveCertificateDialog.tsx` (line 171-178), the parent `<div>` has an `onClick={() => handleToggle(cert.id)}` handler. The `<Checkbox>` inside also has `onCheckedChange={() => handleToggle(cert.id)}`. When clicking the checkbox, the event bubbles up to the parent div, causing `handleToggle` to fire twice (toggling on then off), making it appear like the checkbox does nothing.

**Fix:** `src/components/RemoveCertificateDialog.tsx` (line 181-183)

Add `onClick={(e) => e.stopPropagation()}` to the Checkbox to prevent the click from bubbling to the parent div:

```tsx
<Checkbox
  checked={isSelected}
  onCheckedChange={() => handleToggle(cert.id)}
  onClick={(e) => e.stopPropagation()}
/>
```

---

## Bug 2: Document shows at strange angle with no controls

**Root Cause:** In `PersonnelDocuments.tsx` (lines 655-660), image documents are rendered as a plain `<img>` tag with no rotation or zoom controls. If an image was photographed or scanned at an angle, there is no way for the user to correct it. The PdfViewer component has rotation/zoom controls, but images do not.

**Fix:** `src/components/PersonnelDocuments.tsx` (lines 655-660)

Add rotation and zoom controls for image previews, similar to the PdfViewer toolbar:
- Add local state for image rotation and zoom
- Add a small toolbar above the image with rotate left/right and zoom in/out buttons
- Apply CSS `transform: rotate(Xdeg) scale(Y)` to the image

```tsx
// New state (at component level or via a wrapper)
const [imgRotation, setImgRotation] = useState(0);
const [imgZoom, setImgZoom] = useState(1);

// Reset when selectedDocument changes
// (add to the existing useEffect that resets pdfData/blobUrl)

// Toolbar + image rendering
<div className="w-full">
  <div className="flex items-center justify-center gap-1 mb-2">
    <Button variant="ghost" size="icon" onClick={() => setImgRotation(r => (r - 90 + 360) % 360)}>
      <RotateCcw className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" onClick={() => setImgRotation(r => (r + 90) % 360)}>
      <RotateCw className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" onClick={() => setImgZoom(z => Math.max(0.5, z - 0.2))}>
      <ZoomOut className="h-4 w-4" />
    </Button>
    <span className="text-sm text-muted-foreground px-2">{Math.round(imgZoom * 100)}%</span>
    <Button variant="ghost" size="icon" onClick={() => setImgZoom(z => Math.min(3, z + 0.2))}>
      <ZoomIn className="h-4 w-4" />
    </Button>
  </div>
  <div className="overflow-auto max-h-[400px] flex justify-center">
    <img
      src={blobUrl || signedUrl || ''}
      alt={selectedDocument.name}
      className="object-contain rounded"
      style={{ transform: `rotate(${imgRotation}deg) scale(${imgZoom})`, transition: 'transform 0.2s' }}
    />
  </div>
</div>
```

Also add the missing icon imports: `RotateCcw`, `RotateCw`, `ZoomIn`, `ZoomOut`.

---

## Bug 3: Documents tab icon too small in project view

**Root Cause:** In `ProjectDetail.tsx` (line 345), the `FolderOpen` icon is used at `h-4 w-4`, same as the other tab icons. However, `FolderOpen` has more internal whitespace in its SVG design, making it appear visually smaller than `Users` and `Calendar`.

**Fix:** `src/components/ProjectDetail.tsx` (line 344-346)

Replace `FolderOpen` with `FileText` which has a more consistent visual weight matching the other tab icons. `FileText` is already imported in the file (line 25).

```tsx
<TabsTrigger value="documents" className="gap-1.5 text-xs sm:text-sm">
  <FileText className="h-4 w-4 text-amber-500" />
  <span className="hidden sm:inline">Documents</span>
</TabsTrigger>
```

And remove the unused `FolderOpen` import from line 33.

---

## Summary of files to change

| File | Change |
|------|--------|
| `src/components/RemoveCertificateDialog.tsx` | Add `onClick={e.stopPropagation()}` to Checkbox |
| `src/components/PersonnelDocuments.tsx` | Add rotation/zoom controls for image previews |
| `src/components/ProjectDetail.tsx` | Replace `FolderOpen` icon with `FileText` |

