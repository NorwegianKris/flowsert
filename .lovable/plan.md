

# Multi-File Certificate Upload with AI Extraction

## Summary

Enable users to select and upload multiple certificate files at once. Each file will be processed through the AI extraction system sequentially, creating a queue-based workflow that shows progress and allows review of all extracted certificates before submission.

---

## Current State

- **SmartCertificateUpload**: Handles single file only (`files?.[0]`)
- **AddCertificateDialog**: Creates one certificate entry per extraction
- **Edge Function**: Processes one image per API call (this remains unchanged)

---

## Proposed Solution

### User Experience

```text
┌─────────────────────────────────────────────────────────────┐
│ Smart Upload                                                │
│                                                             │
│ [Drag & drop zone - accepts multiple files]                 │
│                                                             │
│ Upload your certificates and we'll extract details          │
│ automatically. Select up to 10 files at once.               │
│                                                             │
│ Supports PDF, JPEG, PNG, WebP • Drag & drop or click        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Processing Queue (3 of 5 complete)                          │
├─────────────────────────────────────────────────────────────┤
│ ✓ BOSIET_cert.pdf                    [Green - 92%]          │
│ ✓ first_aid.jpg                      [Amber - 67%]          │
│ ● crane_license.pdf                  [Analyzing...]         │
│ ○ safety_induction.pdf               [Pending]              │
│ ○ medical_cert.png                   [Pending]              │
└─────────────────────────────────────────────────────────────┘
```

### Processing Flow

1. User selects/drops multiple files (up to 10)
2. Files are queued and processed sequentially (one at a time to avoid rate limits)
3. Each completed extraction creates a new certificate entry in the form
4. User reviews all extracted certificates, makes edits, then submits

---

## Technical Implementation

### Part A: Update SmartCertificateUpload Component

**New State Structure:**

```typescript
interface QueuedFile {
  id: string;           // Unique ID for tracking
  file: File;
  status: 'pending' | 'processing' | 'complete' | 'error';
  result?: ExtractionResult;
  error?: string;
}

// State changes
const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
const [isProcessingQueue, setIsProcessingQueue] = useState(false);
```

**Key Changes:**

| Current | New |
|---------|-----|
| `<input type="file">` | `<input type="file" multiple>` |
| `files?.[0]` | Loop through all `files` |
| Single `selectedFile` state | Array `fileQueue` state |
| Single `extractionResult` | Result per queued file |

**Props Update:**

```typescript
interface SmartCertificateUploadProps {
  existingCategories: { id: string; name: string }[];
  onExtractionComplete: (result: ExtractionResult, file: File) => void;
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
  maxFiles?: number;  // NEW - default 10
}
```

**Processing Logic:**

```typescript
// Process queue sequentially to avoid rate limits
const processQueue = async () => {
  setIsProcessingQueue(true);
  
  for (const queueItem of fileQueue) {
    if (queueItem.status !== 'pending') continue;
    
    // Update status to processing
    setFileQueue(prev => prev.map(f => 
      f.id === queueItem.id ? { ...f, status: 'processing' } : f
    ));
    
    try {
      // Existing extraction logic...
      const result = await extractCertificateData(queueItem.file);
      
      setFileQueue(prev => prev.map(f =>
        f.id === queueItem.id 
          ? { ...f, status: 'complete', result } 
          : f
      ));
      
      onExtractionComplete(result, queueItem.file);
    } catch (error) {
      setFileQueue(prev => prev.map(f =>
        f.id === queueItem.id 
          ? { ...f, status: 'error', error: 'Failed to process' } 
          : f
      ));
    }
  }
  
  setIsProcessingQueue(false);
};
```

### Part B: Queue Display UI

**New Queue Component within SmartCertificateUpload:**

```text
┌──────────────────────────────────────────────────────┐
│ File Name                    Status         Actions  │
├──────────────────────────────────────────────────────┤
│ 📄 bosiet_certificate.pdf    ✓ Complete     [🔄][✕]  │
│    └─ BOSIET - 92% confidence                        │
│ 📄 first_aid.jpg             ⚠ Partial      [🔄][✕]  │
│    └─ First Aid - 67% confidence                     │
│ 📄 crane_license.pdf         ⏳ Analyzing...         │
│ 📄 safety.pdf                ○ Pending               │
└──────────────────────────────────────────────────────┘
│ [+ Add more files]           [Clear all]             │
└──────────────────────────────────────────────────────┘
```

**Features:**

- Show file name, status indicator, extraction summary
- Allow retry on individual files
- Allow removal of files from queue
- "Add more" button to select additional files (respects max limit)
- "Clear all" to reset

### Part C: Limits & Rate Protection

| Limit | Value | Reason |
|-------|-------|--------|
| Max files per batch | 10 | Reasonable batch size, prevents UI clutter |
| File size max | 20MB each | Existing Lovable limit |
| Processing | Sequential | Prevents rate limit issues with AI API |
| Delay between calls | 500ms | Buffer to avoid rate limits |

**Validation on file selection:**

```typescript
const handleFilesSelect = (files: FileList) => {
  const currentCount = fileQueue.length;
  const maxAllowed = maxFiles - currentCount;
  
  if (files.length > maxAllowed) {
    toast.warning(`You can add up to ${maxAllowed} more file(s). Max is ${maxFiles}.`);
  }
  
  const filesToAdd = Array.from(files).slice(0, maxAllowed);
  // ... add to queue
};
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/SmartCertificateUpload.tsx` | Major rewrite for queue-based multi-file support |
| `src/components/AddCertificateDialog.tsx` | Minor - already handles multiple extractions via callbacks |

---

## Updated UX Copy

| Location | Text |
|----------|------|
| Upload zone header | "Smart Upload" |
| Upload zone description | "Upload your certificates and we'll extract the details automatically" |
| Upload zone hint | "Select up to 10 files • PDF, JPEG, PNG, WebP • Drag & drop or click" |
| Queue header | "Processing Queue (X of Y complete)" |
| Toast on limit | "You can add up to X more file(s). Maximum is 10." |

---

## What Stays the Same

- Edge Function (processes one file at a time - unchanged)
- AddCertificateDialog form structure
- Certificate submission logic
- Role-based workflow (workers vs admins)
- Alias creation logic

---

## Diagram: Multi-File Processing Flow

```text
User selects files
       │
       ▼
┌──────────────────┐
│ Validate & Queue │──▶ Show warning if > 10 files
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Process file #1  │──▶ Update queue UI: "Processing..."
│ (API call)       │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ onExtractionComplete │──▶ Creates certificate entry
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Process file #2  │──▶ ... (repeat)
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ All complete     │──▶ User reviews & submits
└──────────────────┘
```

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User selects > 10 files | Only first 10 added, toast warning shown |
| Rate limit hit (429) | Mark file as error, show retry option |
| Mixed file types | Unsupported files get "red" status immediately |
| User closes dialog mid-processing | Queue is reset, no partial data saved |
| User adds more files during processing | New files added to end of queue |

