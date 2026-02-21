

## Fix Inconsistent Certificate Document Icons

**Risk: GREEN** -- purely UI styling fix

### Problem

The `FileText` icon next to certificate names shrinks inconsistently because it lacks the `flex-shrink-0` CSS class. In a flex container, when a certificate name is long (e.g., "Advanced Fire Fighting"), the browser compresses the icon to make room for the text. Shorter names (e.g., "Diving") leave enough space so the icon renders at full size. This causes the visual inconsistency you're seeing.

### Fix

Add `flex-shrink-0` to the `FileText` icon in both certificate list components to prevent the icon from being compressed:

**File 1: `src/components/ProjectCertificateStatus.tsx` (line 239)**
```
// Before
<FileText className="h-4 w-4 text-muted-foreground" />

// After
<FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
```

**File 2: `src/components/CertificateTable.tsx` (line 207)**
```
// Before
<FileText className="h-4 w-4 text-muted-foreground" />

// After
<FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
```

Two one-word additions across two files.
